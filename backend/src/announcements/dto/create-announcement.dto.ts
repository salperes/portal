import { IsString, IsEnum, IsOptional, IsDateString, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementCategory, AnnouncementPriority } from '../../common/entities/announcement.entity';

export class CreateAnnouncementDto {
  @ApiProperty({ description: 'Duyuru başlığı', example: 'Yeni Ofis Açılışı' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Duyuru içeriği (HTML destekler)', example: '<p>Detaylı bilgi...</p>' })
  @IsString()
  content: string;

  @ApiProperty({ enum: AnnouncementCategory, description: 'Duyuru kategorisi' })
  @IsEnum(AnnouncementCategory)
  category: AnnouncementCategory;

  @ApiPropertyOptional({ enum: AnnouncementPriority, default: AnnouncementPriority.INFO })
  @IsEnum(AnnouncementPriority)
  @IsOptional()
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ description: 'Yayın tarihi', example: '2026-01-31T10:00:00Z' })
  @IsDateString()
  @IsOptional()
  publishDate?: string;

  @ApiPropertyOptional({ description: 'Bitiş tarihi', example: '2026-02-28T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  expireDate?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
