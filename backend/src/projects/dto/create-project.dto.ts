import { IsString, IsEnum, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '../../common/entities';

export class CreateProjectDto {
  @ApiProperty({ description: 'Proje kodu', example: 'PRJ-001' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Proje adı', example: 'Yeni Fabrika Projesi' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Proje açıklaması' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.DRAFT })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Başlangıç tarihi', example: '2026-03-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Bitiş tarihi', example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
