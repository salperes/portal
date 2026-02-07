import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateUserRoleDto, UserResponseDto, UsersListResponseDto, UserStatsDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../common/entities';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Tüm kullanıcıları listele (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'department', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: UserRole,
    @Query('department') department?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ): Promise<UsersListResponseDto> {
    const result = await this.usersService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      role,
      department,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      search,
    });

    return {
      users: result.users,
      total: result.total,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    };
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcı istatistikleri (Admin)' })
  async getStats(): Promise<UserStatsDto> {
    return this.usersService.getStats();
  }

  @Get('departments')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Benzersiz departmanları listele (Admin)' })
  async getDepartments(): Promise<{ departments: string[] }> {
    const departments = await this.usersService.getDepartments();
    return { departments };
  }

  @Get('roles')
  @ApiOperation({ summary: 'Mevcut rolleri listele' })
  getRoles(): { roles: { value: string; label: string; level: number }[] } {
    return {
      roles: [
        { value: UserRole.VIEWER, label: 'Görüntüleyici', level: 1 },
        { value: UserRole.USER, label: 'Kullanıcı', level: 2 },
        { value: UserRole.SUPERVISOR, label: 'Supervisor', level: 3 },
        { value: UserRole.ADMIN, label: 'Admin', level: 4 },
      ],
    };
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcı detayı (Admin)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcı güncelle (Admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateDto, currentUser);
  }

  @Patch(':id/role')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcı rolünü değiştir (Admin)' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRole(id, dto.role, currentUser);
  }

  @Patch(':id/activate')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcıyı aktif et (Admin)' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    return this.usersService.setActive(id, true, currentUser);
  }

  @Patch(':id/deactivate')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcıyı pasif yap (Admin)' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    return this.usersService.setActive(id, false, currentUser);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcıyı sil (Admin)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id, currentUser);
    return { message: 'Kullanıcı başarıyla silindi' };
  }
}
