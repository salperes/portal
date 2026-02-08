import { IsEnum, IsOptional, IsUUID, IsString, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType, RuleType, TargetType } from '../../common/entities';

export class CreateAccessRuleDto {
  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Kaynak ID (folder, document veya project ID)' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ enum: RuleType })
  @IsEnum(RuleType)
  ruleType: RuleType;

  @ApiProperty({ enum: TargetType })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiPropertyOptional({ description: 'Hedef ID (kullanıcı veya grup ID)' })
  @IsUUID()
  @IsOptional()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Hedef rol (role veya project_role için)' })
  @IsString()
  @IsOptional()
  targetRole?: string;

  @ApiPropertyOptional({ description: 'Proje ID (proje bazlı kurallar için)' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ description: 'İzinler listesi', example: ['read', 'write'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  inherit?: boolean;
}
