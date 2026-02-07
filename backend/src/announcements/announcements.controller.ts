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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../auth/guards/admin.guard';
import { User } from '../common/entities';

@ApiTags('Announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'Aktif duyuruları listele' })
  @ApiQuery({ name: 'all', required: false, description: 'Admin: tüm duyuruları göster' })
  findAll(@Query('all') all: string, @CurrentUser() user: User) {
    const includeInactive = all === 'true' && user.isAdmin;
    return this.announcementsService.findAll(includeInactive);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Son duyuruları getir' })
  @ApiQuery({ name: 'limit', required: false, description: 'Kaç adet (varsayılan: 5)' })
  getLatest(@Query('limit') limit: string) {
    const count = limit ? parseInt(limit, 10) : 5;
    return this.announcementsService.getLatest(count);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Duyuru detayı' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Yeni duyuru oluştur (Admin)' })
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser('id') userId: string) {
    return this.announcementsService.create(dto, userId);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Duyuru güncelle (Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Duyuru sil (Admin)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementsService.remove(id);
  }
}
