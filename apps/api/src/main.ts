/**
 * @portal/api - Gateway API
 *
 * Ana API giriş noktası. Tüm modülleri birleştirir.
 *
 * NOT: Şu anda backend/ klasörü ana API olarak kullanılıyor.
 * Bu dosya, gelecekte tam modüler geçiş için hazırlanmıştır.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Gateway API running on port ${port}`);
}

bootstrap();
