import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class OpenDocumentDto {
  @ApiProperty({ description: 'Share adı', example: 'Public' })
  @IsString()
  @IsNotEmpty()
  share: string;

  @ApiProperty({ description: 'Dosya yolu', example: 'documents/report.docx' })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty({ description: 'Düzenleme modu', example: 'view', required: false })
  @IsOptional()
  @IsIn(['view', 'edit'])
  mode?: 'view' | 'edit';
}

export class DocumentConfigDto {
  @ApiProperty({ description: 'ONLYOFFICE document config' })
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
    };
  };

  @ApiProperty({ description: 'ONLYOFFICE editor config' })
  editorConfig: {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: {
      id: string;
      name: string;
    };
  };

  @ApiProperty({ description: 'JWT token for ONLYOFFICE' })
  token: string;
}

export class DocumentCallbackDto {
  @ApiProperty({ description: 'Document key' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Callback status (1=editing, 2=ready to save, 3=error, 4=closed no changes, 6=forcesave, 7=forcesave error)' })
  status: number;

  @ApiProperty({ description: 'Download URL for edited document', required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Users editing the document', required: false })
  @IsOptional()
  users?: string[];

  // Additional fields sent by ONLYOFFICE
  @ApiProperty({ description: 'User actions', required: false })
  @IsOptional()
  actions?: Array<{ type: number; userid: string }>;

  @ApiProperty({ description: 'JWT token from ONLYOFFICE', required: false })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({ description: 'Changes file URL', required: false })
  @IsOptional()
  @IsString()
  changesurl?: string;

  @ApiProperty({ description: 'Document history', required: false })
  @IsOptional()
  history?: Record<string, unknown>;

  @ApiProperty({ description: 'Last save timestamp', required: false })
  @IsOptional()
  @IsString()
  lastsave?: string;

  @ApiProperty({ description: 'Force save type (0=command, 1=timer, 2=user disconnect)', required: false })
  @IsOptional()
  forcesavetype?: number;

  @ApiProperty({ description: 'File type', required: false })
  @IsOptional()
  @IsString()
  filetype?: string;
}
