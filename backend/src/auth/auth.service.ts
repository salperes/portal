import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LdapService, LdapUserInfo } from './ldap.service';
import { User, UserRole } from '../common/entities';
import { RedisService } from '../common/services';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

// Varsayılan admin kullanıcıları (AD'den bağımsız)
const DEFAULT_ADMINS = ['admin', 'alper.es'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private ldapService: LdapService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Kullanıcı adını normalize eder
   * Desteklenen formatlar:
   * - domain\username (örn: mss\alper.es)
   * - username@domain (örn: alper.es@msspektral.com)
   * - username (örn: alper.es)
   */
  private normalizeUsername(input: string): string {
    let normalized = input.trim();

    // domain\username formatı (örn: mss\alper.es)
    if (normalized.includes('\\')) {
      normalized = normalized.split('\\').pop() || normalized;
    }

    // username@domain formatı (örn: alper.es@msspektral.com)
    if (normalized.includes('@')) {
      normalized = normalized.split('@')[0];
    }

    return normalized.toLowerCase();
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { username: rawUsername, password } = loginDto;

    // Kullanıcı adını normalize et
    const username = this.normalizeUsername(rawUsername);
    this.logger.log(`Login attempt: "${rawUsername}" → normalized: "${username}"`);

    // Local admin kullanıcısı için LDAP bypass
    if (username === 'admin') {
      return this.handleLocalAdminLogin(password);
    }

    // LDAP ile doğrula
    let ldapUser: LdapUserInfo;
    try {
      ldapUser = await this.ldapService.authenticate(username, password);
    } catch (error) {
      this.logger.warn(`Login failed for user: ${username}`);
      throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
    }

    // Veritabanında kullanıcıyı bul veya oluştur
    let user = await this.userRepository.findOne({
      where: { adUsername: username.toLowerCase() },
    });

    // Varsayılan rol belirleme
    const defaultRole = this.determineDefaultRole(username, ldapUser.memberOf);

    if (!user) {
      // Yeni kullanıcı oluştur
      user = this.userRepository.create({
        adUsername: username.toLowerCase(),
        email: ldapUser.email,
        displayName: ldapUser.displayName,
        department: ldapUser.department,
        title: ldapUser.title,
        phone: ldapUser.phone,
        role: defaultRole,
        isActive: true,
        lastLogin: new Date(),
      });
      user = await this.userRepository.save(user);
      this.logger.log(`New user created: ${username} with role: ${defaultRole}`);
    } else {
      // Mevcut kullanıcıyı güncelle
      user.email = ldapUser.email || user.email;
      user.displayName = ldapUser.displayName || user.displayName;
      user.department = ldapUser.department || user.department;
      user.title = ldapUser.title || user.title;
      user.phone = ldapUser.phone || user.phone;
      // Rol: Eğer kullanıcının mevcut rolü user ise ve AD'den daha yüksek yetki geliyorsa güncelle
      // Manuel atanmış roller (supervisor, admin) korunur
      if (user.role === UserRole.USER && defaultRole !== UserRole.USER) {
        user.role = defaultRole;
      }
      user.lastLogin = new Date();
      user = await this.userRepository.save(user);
    }

    // Kullanıcı şifresini Redis'e kaydet (dosya sunucusu erişimi için)
    // TTL: 7 gün (refresh token süresi ile aynı)
    try {
      await this.redisService.storeUserCredentials(user.id, password, 7 * 24 * 60 * 60);
      this.logger.debug(`Stored SMB credentials for user: ${username}`);
    } catch (error) {
      this.logger.warn(`Failed to store SMB credentials for user ${username}: ${error.message}`);
      // Redis hatası login'i engellemesin
    }

    // Token'ları oluştur
    const payload = {
      sub: user.id,
      username: user.adUsername,
      role: user.role,
      isAdmin: user.isAdmin, // backward compatibility
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.adUsername,
        displayName: user.displayName || '',
        email: user.email || '',
        department: user.department || '',
        role: user.role,
        isAdmin: user.isAdmin, // backward compatibility
      },
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(token);

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Kullanıcı bulunamadı');
      }

      const newPayload = {
        sub: user.id,
        username: user.adUsername,
        role: user.role,
        isAdmin: user.isAdmin,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: '15m',
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Geçersiz refresh token');
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı');
    }

    return user;
  }

  /**
   * Kullanıcı çıkışı - Redis'ten kimlik bilgilerini sil
   */
  async logout(userId: string): Promise<void> {
    try {
      await this.redisService.deleteUserCredentials(userId);
      this.logger.debug(`Deleted SMB credentials for user: ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to delete SMB credentials for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Kullanıcının varsayılan rolünü belirle
   * 1. DEFAULT_ADMINS listesindeyse -> admin
   * 2. AD'de Portal_Admins veya Domain Admins grubundaysa -> admin
   * 3. Aksi halde -> user (varsayılan)
   */
  private determineDefaultRole(username: string, memberOf: string[]): UserRole {
    // Varsayılan admin listesinde mi?
    if (DEFAULT_ADMINS.includes(username.toLowerCase())) {
      return UserRole.ADMIN;
    }

    // AD grup kontrolü
    const isInAdminGroup = memberOf.some(
      (group) =>
        group.toLowerCase().includes('portal_admins') ||
        group.toLowerCase().includes('domain admins'),
    );

    if (isInAdminGroup) {
      return UserRole.ADMIN;
    }

    // Varsayılan: user
    return UserRole.USER;
  }

  /**
   * Local admin kullanıcısı için LDAP bypass ile giriş
   * Bu kullanıcı Active Directory'de aranmaz
   */
  private async handleLocalAdminLogin(password: string): Promise<LoginResponseDto> {
    const LOCAL_ADMIN_PASSWORD = 'Ankara12!mss';

    if (password !== LOCAL_ADMIN_PASSWORD) {
      this.logger.warn('Local admin login failed: incorrect password');
      throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
    }

    this.logger.log('Local admin login successful');

    // Veritabanında admin kullanıcısını bul veya oluştur
    let user = await this.userRepository.findOne({
      where: { adUsername: 'admin' },
    });

    if (!user) {
      user = this.userRepository.create({
        adUsername: 'admin',
        email: 'admin@mss.local',
        displayName: 'Portal Admin',
        department: 'IT',
        title: 'Administrator',
        role: UserRole.ADMIN,
        isActive: true,
      });
      user = await this.userRepository.save(user);
      this.logger.log('Local admin user created in database');
    } else {
      // Admin rolünü garantile
      user.role = UserRole.ADMIN;
      user.lastLogin = new Date();
      user = await this.userRepository.save(user);
    }

    // Token'ları oluştur
    const payload = {
      sub: user.id,
      username: user.adUsername,
      role: user.role,
      isAdmin: user.isAdmin,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.adUsername,
        displayName: user.displayName || 'Portal Admin',
        email: user.email || 'admin@mss.local',
        department: user.department || 'IT',
        role: user.role,
        isAdmin: user.isAdmin,
      },
    };
  }
}
