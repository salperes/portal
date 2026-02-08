import { IsEnum, IsOptional, IsUUID, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TargetType } from '../../common/entities';

export class CreateFolderPermissionDto {
  @ApiProperty({ enum: ['user', 'group'], description: 'Hedef tipi' })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiPropertyOptional({ description: 'Hedef ID (kullanıcı veya grup ID)' })
  @IsUUID()
  @IsOptional()
  targetId?: string;

  @ApiProperty({ description: 'İzinler listesi', example: ['read', 'write'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
