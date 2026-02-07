import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IntegrationsController } from './integrations.controller';
import { SSOService } from './sso.service';

@Module({
  imports: [
    JwtModule.register({}), // Secret key will be provided per-sign
  ],
  controllers: [IntegrationsController],
  providers: [SSOService],
  exports: [SSOService],
})
export class IntegrationsModule {}
