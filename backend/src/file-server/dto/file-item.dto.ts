import { ApiProperty } from '@nestjs/swagger';

export class FileItemDto {
  @ApiProperty({ description: 'Dosya veya klasör adı' })
  name: string;

  @ApiProperty({ description: 'Klasör mü?' })
  isDirectory: boolean;

  @ApiProperty({ description: 'Dosya boyutu (byte)' })
  size: number;

  @ApiProperty({ description: 'Oluşturulma tarihi' })
  createdAt: Date;

  @ApiProperty({ description: 'Değiştirilme tarihi' })
  modifiedAt: Date;

  @ApiProperty({ description: 'Dosya uzantısı (dosyalar için)', required: false })
  extension?: string;

  @ApiProperty({ description: 'MIME tipi', required: false })
  mimeType?: string;
}

export class ShareItemDto {
  @ApiProperty({ description: 'Share adı' })
  name: string;

  @ApiProperty({ description: 'Tam yol' })
  path: string;
}

export class ListFilesResponseDto {
  @ApiProperty({ description: 'Mevcut yol' })
  path: string;

  @ApiProperty({ description: 'Share adı' })
  share: string;

  @ApiProperty({ type: [FileItemDto], description: 'Dosya ve klasör listesi' })
  items: FileItemDto[];
}

export class ListSharesResponseDto {
  @ApiProperty({ type: [ShareItemDto], description: 'Kullanılabilir share listesi' })
  shares: ShareItemDto[];
}
