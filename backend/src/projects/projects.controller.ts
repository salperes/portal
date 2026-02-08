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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AssignProjectMemberDto, UpdateProjectAssignmentDto } from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectStatus } from '../common/entities';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Projeleri listele' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ProjectStatus,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Proje detayı + atamalar' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Yeni proje oluştur (Admin)' })
  create(@Body() dto: CreateProjectDto, @CurrentUser('id') userId: string) {
    return this.projectsService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Proje güncelle (Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Proje sil (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Proje üyelerini listele' })
  getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/assignments')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Projeye üye ata (Admin)' })
  assignMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignProjectMemberDto,
  ) {
    return this.projectsService.assignMember(id, dto.userId, dto.projectRole, dto.groupId);
  }

  @Patch(':id/assignments/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Atamayı güncelle (Admin)' })
  updateAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateProjectAssignmentDto,
  ) {
    return this.projectsService.updateAssignment(id, userId, dto.projectRole, dto.groupId);
  }

  @Delete(':id/assignments/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Atamayı kaldır (Admin)' })
  removeAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.projectsService.removeAssignment(id, userId);
  }
}
