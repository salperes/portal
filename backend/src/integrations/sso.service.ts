import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface SSOTokenPayload {
  username: string;
  email?: string;
}

@Injectable()
export class SSOService {
  private readonly logger = new Logger(SSOService.name);

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  generateRMSToken(username: string, email?: string): string {
    const secretKey = this.configService.get<string>('rms.ssoSecretKey');

    if (!secretKey) {
      throw new Error('RMS SSO secret key is not configured');
    }

    const payload: SSOTokenPayload = { username };
    if (email) {
      payload.email = email;
    }

    // RMS için ayrı bir JWT oluştur (5 dakika geçerli)
    const token = this.jwtService.sign(payload, {
      secret: secretKey,
      expiresIn: '5m',
    });

    this.logger.log(`SSO token generated for user: ${username}`);
    return token;
  }

  getRMSLaunchUrl(username: string, email?: string): string {
    const rmsUrl = this.configService.get<string>('rms.url');

    if (!rmsUrl) {
      throw new Error('RMS URL is not configured');
    }

    const token = this.generateRMSToken(username, email);
    return `${rmsUrl}?sso_token=${token}`;
  }
}
