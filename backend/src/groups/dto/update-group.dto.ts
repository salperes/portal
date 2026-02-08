import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGroupDto } from './create-group.dto';

export class UpdateGroupDto extends PartialType(CreateGroupDto) {
  @ApiPropertyOptional({ description: 'Aktif mi?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
