import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFolderDto {
  @ApiPropertyOptional({ description: 'Klasör adı', example: 'Güncel Dokümanlar' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Üst klasör ID (taşıma)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
