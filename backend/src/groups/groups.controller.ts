import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AddGroupMemberDto, UpdateGroupMemberDto } from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm grupları listele' })
  @ApiQuery({ name: 'projectId', required: false, type: String, description: 'Proje ID ile filtrele' })
  findAll(@Query('projectId') projectId?: string) {
    return this.groupsService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Grup detayı + üyeler' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Yeni grup oluştur (Admin)' })
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Grup güncelle (Admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Grup sil (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.groupsService.remove(id);
  }

  @Post(':id/members')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Gruba üye ekle (Admin)' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    return this.groupsService.addMember(id, dto.userId, dto.role);
  }

  @Patch(':id/members/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Üye rolünü değiştir (Admin)' })
  updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateGroupMemberDto,
  ) {
    return this.groupsService.updateMemberRole(id, userId, dto.role);
  }

  @Delete(':id/members/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Üyeyi gruptan çıkar (Admin)' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.groupsService.removeMember(id, userId);
  }
}
