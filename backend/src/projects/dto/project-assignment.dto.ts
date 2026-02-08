import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectRole } from '../../common/entities';

export class AssignProjectMemberDto {
  @ApiProperty({ description: 'Kullanıcı ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Grup ID (opsiyonel)' })
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional({ enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsEnum(ProjectRole)
  @IsOptional()
  projectRole?: ProjectRole;
}

export class UpdateProjectAssignmentDto {
  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  projectRole: ProjectRole;

  @ApiPropertyOptional({ description: 'Grup ID (opsiyonel)' })
  @IsUUID()
  @IsOptional()
  groupId?: string;
}
