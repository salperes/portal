import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder, Document, DocumentVersion, AccessRule, User, Group } from '../common/entities';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Folder, Document, DocumentVersion, AccessRule, User, Group]),
    AccessModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
