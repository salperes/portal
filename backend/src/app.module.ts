import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { FileServerModule } from './file-server/file-server.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { ProjectsModule } from './projects/projects.module';
import { AccessModule } from './access/access.module';
import { DocumentsModule } from './documents/documents.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import {
  User, Announcement, Application,
  Group, UserGroup,
  Project, ProjectAssignment,
  AccessRule,
  Folder, Document, DocumentVersion,
} from './common/entities';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [User, Announcement, Application, Group, UserGroup, Project, ProjectAssignment, AccessRule, Folder, Document, DocumentVersion],
        synchronize: process.env.NODE_ENV === 'development', // Development'ta true, production'da false
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),

    // Common Module (Redis, etc.)
    CommonModule,

    // Feature Modules
    AuthModule,
    AnnouncementsModule,
    IntegrationsModule,
    FileServerModule,
    UsersModule,
    GroupsModule,
    ProjectsModule,
    AccessModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
