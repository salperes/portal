import { Global, Module } from '@nestjs/common';
import { RedisService, MinioService } from './services';

@Global()
@Module({
  providers: [RedisService, MinioService],
  exports: [RedisService, MinioService],
})
export class CommonModule {}
