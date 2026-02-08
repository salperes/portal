import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ description: 'Hedef klasör ID' })
  @IsUUID()
  folderId: string;

  @ApiPropertyOptional({ description: 'Doküman açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;
}
