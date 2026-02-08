import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupRole } from '../../common/entities';

export class AddGroupMemberDto {
  @ApiProperty({ description: 'Kullanıcı ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: GroupRole, default: GroupRole.MEMBER })
  @IsEnum(GroupRole)
  @IsOptional()
  role?: GroupRole;
}

export class UpdateGroupMemberDto {
  @ApiProperty({ enum: GroupRole })
  @IsEnum(GroupRole)
  role: GroupRole;
}
