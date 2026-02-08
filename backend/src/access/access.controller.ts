import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AccessService } from './access.service';
import { CreateAccessRuleDto, CheckPermissionDto } from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, ResourceType, TargetType } from '../common/entities';

@ApiTags('Access Control')
@ApiBearerAuth()
@Controller('access')
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('check')
  @ApiOperation({ summary: 'İzin kontrolü' })
  checkPermission(
    @Body() dto: CheckPermissionDto,
    @CurrentUser() user: User,
  ) {
    return this.accessService.checkPermission(
      user.id,
      user,
      dto.resourceType,
      dto.resourceId,
      dto.permission,
    );
  }

  @Get('rules')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Erişim kurallarını listele (Admin)' })
  @ApiQuery({ name: 'resourceType', required: false, enum: ResourceType })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'targetType', required: false, enum: TargetType })
  findRules(
    @Query('resourceType') resourceType?: ResourceType,
    @Query('resourceId') resourceId?: string,
    @Query('targetType') targetType?: TargetType,
  ) {
    return this.accessService.findRules({ resourceType, resourceId, targetType });
  }

  @Post('rules')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Yeni erişim kuralı oluştur (Admin)' })
  createRule(
    @Body() dto: CreateAccessRuleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.accessService.createRule(dto, userId);
  }

  @Delete('rules/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Erişim kuralını sil (Admin)' })
  removeRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.accessService.removeRule(id);
  }

  @Get('user/:id/permissions')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kullanıcının erişebildiği kaynaklar (Admin)' })
  getUserPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.accessService.getUserPermissions(id);
  }

  @Get('resource/:type/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Kaynağa erişebilen kullanıcılar (Admin)' })
  getResourceAccessors(
    @Param('type') type: ResourceType,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accessService.getResourceAccessors(type, id);
  }
}
