/**
 * Gateway App Module
 *
 * Bu dosya apps/api aktif olduğunda kullanılacak.
 * Şu anda backend/src/app.module.ts aktif API olarak çalışıyor.
 *
 * Aktivasyon için:
 * 1. Backend'deki modülleri packages/modules/'a taşı
 * 2. Aşağıdaki import'ları aç
 * 3. Docker config'i güncelle
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

// ============================================
// REFERANS: backend/src/app.module.ts yapısı
// ============================================
//
// Şu anda backend/ aktif. Aşağıdaki yapı referans amaçlıdır.
//
// import { AuthModule } from '@portal/core/auth';
// import { AnnouncementsModule } from '@portal/modules-announcements';
// import { UsersModule } from '@portal/modules-users';
// import { FileServerModule } from '@portal/modules-file-server';
// import { IntegrationsModule } from '@portal/modules-integrations';
// import { JwtAuthGuard } from '@portal/core/guards';

@Module({
  imports: [
    // Config - global environment variables
    // ConfigModule.forRoot({ isGlobal: true }),

    // Database - PostgreSQL with TypeORM
    // TypeOrmModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (config: ConfigService) => ({
    //     type: 'postgres',
    //     host: config.get('DB_HOST'),
    //     port: config.get('DB_PORT'),
    //     username: config.get('DB_USERNAME'),
    //     password: config.get('DB_PASSWORD'),
    //     database: config.get('DB_DATABASE'),
    //     autoLoadEntities: true,
    //     synchronize: process.env.NODE_ENV === 'development',
    //   }),
    //   inject: [ConfigService],
    // }),

    // Feature Modules
    // AuthModule,
    // AnnouncementsModule,
    // UsersModule,
    // FileServerModule,
    // IntegrationsModule,
  ],
  controllers: [],
  providers: [
    // Global JWT Guard
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
  ],
})
export class AppModule {}

/**
 * Mevcut Aktif Yapı:
 * - API: backend/src/app.module.ts
 * - Çalıştırma: cd testenv && docker-compose up -d portal-test-api
 *
 * Modül Listesi (backend/'de):
 * - AuthModule: backend/src/auth/
 * - AnnouncementsModule: backend/src/announcements/
 * - UsersModule: backend/src/users/
 * - FileServerModule: backend/src/file-server/
 * - IntegrationsModule: backend/src/integrations/
 */
