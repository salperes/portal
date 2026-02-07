import { Module } from '@nestjs/common';
import { FileServerController } from './file-server.controller';
import { FileServerService } from './file-server.service';
import { SmbService } from './smb.service';
import { DocumentService } from './document.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [FileServerController],
  providers: [FileServerService, SmbService, DocumentService],
  exports: [FileServerService, DocumentService],
})
export class FileServerModule {}
