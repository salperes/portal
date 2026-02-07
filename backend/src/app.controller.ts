import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from './auth/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('debug/config')
  @ApiOperation({ summary: 'Debug config (dev only)' })
  getDebugConfig() {
    return {
      ldap: {
        url: this.configService.get('ldap.url'),
        baseDN: this.configService.get('ldap.baseDN'),
        bindDN: this.configService.get('ldap.bindDN'),
        hasPassword: !!this.configService.get('ldap.bindPassword'),
      },
    };
  }
}
