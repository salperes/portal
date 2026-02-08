import { IsString, IsEnum, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNewDocumentDto {
  @ApiProperty({ description: 'Dosya adı (uzantısız)', example: 'Yeni Doküman' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Dosya türü', enum: ['docx', 'xlsx', 'pptx', 'txt'] })
  @IsEnum(['docx', 'xlsx', 'pptx', 'txt'])
  type: 'docx' | 'xlsx' | 'pptx' | 'txt';

  @ApiProperty({ description: 'Hedef klasör UUID' })
  @IsUUID()
  folderId: string;
}
