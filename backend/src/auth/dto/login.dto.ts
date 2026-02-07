import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'ahmet.yilmaz', description: 'AD kullanıcı adı' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: '********', description: 'AD şifresi' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    department: string;
    role: string;
    isAdmin: boolean;
  };
}
