import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User, UserRole } from '../common/entities';
import { UpdateUserDto, UserResponseDto, UserStatsDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Tüm kullanıcıları listele
   */
  async findAll(options?: {
    page?: number;
    limit?: number;
    role?: UserRole;
    department?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{ users: UserResponseDto[]; total: number }> {
    const { page = 1, limit = 20, role, department, isActive, search } = options || {};

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Filtreler
    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    if (department) {
      queryBuilder.andWhere('user.department = :department', { department });
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere(
        '(user.adUsername ILIKE :search OR user.displayName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Sayfalama
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Sıralama: displayName
    queryBuilder.orderBy('user.displayName', 'ASC');

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users: users.map(this.toResponseDto),
      total,
    };
  }

  /**
   * Kullanıcı detayı
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    return this.toResponseDto(user);
  }

  /**
   * Kullanıcı güncelle (sadece admin)
   */
  async update(id: string, updateDto: UpdateUserDto, currentUser: User): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Kendini güncelleyemez (rol değişikliği için)
    if (id === currentUser.id && updateDto.role && updateDto.role !== user.role) {
      throw new ForbiddenException('Kendi rolünüzü değiştiremezsiniz');
    }

    // Admin yetkisi olmayan biri başkasının rolünü değiştiremez
    if (!currentUser.isAdmin && updateDto.role) {
      throw new ForbiddenException('Rol değiştirme yetkiniz yok');
    }

    // Güncelle
    if (updateDto.displayName !== undefined) user.displayName = updateDto.displayName;
    if (updateDto.department !== undefined) user.department = updateDto.department;
    if (updateDto.title !== undefined) user.title = updateDto.title;
    if (updateDto.role !== undefined) user.role = updateDto.role;
    if (updateDto.isActive !== undefined) user.isActive = updateDto.isActive;

    await this.userRepository.save(user);
    this.logger.log(`User ${user.adUsername} updated by ${currentUser.adUsername}`);

    return this.toResponseDto(user);
  }

  /**
   * Kullanıcı rolünü değiştir
   */
  async updateRole(id: string, role: UserRole, currentUser: User): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Kendinin rolünü değiştiremez
    if (id === currentUser.id) {
      throw new ForbiddenException('Kendi rolünüzü değiştiremezsiniz');
    }

    user.role = role;
    await this.userRepository.save(user);

    this.logger.log(`User ${user.adUsername} role changed to ${role} by ${currentUser.adUsername}`);

    return this.toResponseDto(user);
  }

  /**
   * Kullanıcıyı aktif/pasif yap
   */
  async setActive(id: string, isActive: boolean, currentUser: User): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Kendini pasif yapamaz
    if (id === currentUser.id && !isActive) {
      throw new ForbiddenException('Kendinizi pasif yapamazsınız');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    this.logger.log(`User ${user.adUsername} ${isActive ? 'activated' : 'deactivated'} by ${currentUser.adUsername}`);

    return this.toResponseDto(user);
  }

  /**
   * Kullanıcı sil (soft delete - isActive = false)
   */
  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    // Kendini silemez
    if (id === currentUser.id) {
      throw new ForbiddenException('Kendinizi silemezsiniz');
    }

    // Admin'i sadece başka admin silebilir
    if (user.role === UserRole.ADMIN && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin kullanıcısını silme yetkiniz yok');
    }

    // Soft delete
    user.isActive = false;
    await this.userRepository.save(user);

    this.logger.log(`User ${user.adUsername} deleted by ${currentUser.adUsername}`);
  }

  /**
   * İstatistikler
   */
  async getStats(): Promise<UserStatsDto> {
    const users = await this.userRepository.find();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stats: UserStatsDto = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      admins: users.filter(u => u.role === UserRole.ADMIN).length,
      weeklyLogins: users.filter(u => u.lastLogin && u.lastLogin > oneWeekAgo).length,
      byRole: {},
      byDepartment: {},
    };

    // Rol bazlı sayım
    for (const role of Object.values(UserRole)) {
      stats.byRole[role] = users.filter(u => u.role === role).length;
    }

    // Departman bazlı sayım
    for (const user of users) {
      const dept = user.department || 'Belirtilmemiş';
      stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
    }

    return stats;
  }

  /**
   * Benzersiz departmanları listele
   */
  async getDepartments(): Promise<string[]> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('DISTINCT user.department', 'department')
      .where('user.department IS NOT NULL')
      .andWhere("user.department != ''")
      .orderBy('user.department', 'ASC')
      .getRawMany();

    return result.map(r => r.department);
  }

  /**
   * User entity'sini response DTO'ya dönüştür
   */
  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      adUsername: user.adUsername,
      email: user.email || '',
      displayName: user.displayName || '',
      department: user.department || '',
      title: user.title || '',
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
    };
  }
}
