import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SSOService } from './sso.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../common/entities';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly ssoService: SSOService) {}

  @Get('rms/launch-url')
  @ApiOperation({ summary: 'RMS SSO launch URL al' })
  getRMSLaunchUrl(@CurrentUser() user: User) {
    const url = this.ssoService.getRMSLaunchUrl(user.adUsername, user.email || undefined);
    return { url };
  }

  @Get('rms/launch')
  @ApiOperation({ summary: 'RMS\'e SSO ile yönlendir' })
  launchRMS(@CurrentUser() user: User, @Res() res: any) {
    const url = this.ssoService.getRMSLaunchUrl(user.adUsername, user.email || undefined);
    return res.redirect(url);
  }
}
