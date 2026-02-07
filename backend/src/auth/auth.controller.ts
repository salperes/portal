import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../common/entities';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kullanıcı girişi (AD credentials ile)' })
  @ApiResponse({ status: 200, description: 'Başarılı giriş', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Geçersiz kullanıcı adı veya şifre' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token yenileme' })
  @ApiResponse({ status: 200, description: 'Yeni access token' })
  @ApiResponse({ status: 401, description: 'Geçersiz refresh token' })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgisi' })
  @ApiResponse({ status: 200, description: 'Kullanıcı bilgisi' })
  @ApiResponse({ status: 401, description: 'Yetkisiz erişim' })
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.adUsername,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
      title: user.title,
      phone: user.phone,
      isAdmin: user.isAdmin,
      theme: user.theme,
      avatarUrl: user.avatarUrl,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Çıkış yap' })
  @ApiResponse({ status: 200, description: 'Başarılı çıkış' })
  async logout(@CurrentUser() user: User) {
    // Redis'ten SMB kimlik bilgilerini sil
    await this.authService.logout(user.id);
    return { message: 'Başarıyla çıkış yapıldı' };
  }
}
