import { IsEnum, IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from '../../common/entities';

export class CheckPermissionDto {
  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @ApiProperty({ description: 'Kaynak ID' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ description: 'Kontrol edilecek izin', example: 'read' })
  @IsString()
  permission: string;
}
