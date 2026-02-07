import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class BrowseFilesDto {
  @ApiProperty({ description: 'Share adı', example: 'Paylasim' })
  @IsNotEmpty()
  @IsString()
  share: string;

  @ApiProperty({ description: 'Klasör yolu', example: 'Documents/Reports', required: false })
  @IsOptional()
  @IsString()
  path?: string;
}

export class DownloadFileDto {
  @ApiProperty({ description: 'Share adı', example: 'Paylasim' })
  @IsNotEmpty()
  @IsString()
  share: string;

  @ApiProperty({ description: 'Dosya yolu', example: 'Documents/report.pdf' })
  @IsNotEmpty()
  @IsString()
  path: string;
}

export class DeleteFileDto {
  @ApiProperty({ description: 'Share adı', example: 'Paylasim' })
  @IsNotEmpty()
  @IsString()
  share: string;

  @ApiProperty({ description: 'Dosya veya klasör yolu', example: 'Documents/old-file.txt' })
  @IsNotEmpty()
  @IsString()
  path: string;
}

export class CreateFolderDto {
  @ApiProperty({ description: 'Share adı', example: 'Paylasim' })
  @IsNotEmpty()
  @IsString()
  share: string;

  @ApiProperty({ description: 'Yeni klasör yolu', example: 'Documents/NewFolder' })
  @IsNotEmpty()
  @IsString()
  path: string;
}

export class UploadFileDto {
  @ApiProperty({ description: 'Share adı', example: 'Paylasim' })
  @IsNotEmpty()
  @IsString()
  share: string;

  @ApiProperty({ description: 'Hedef klasör yolu', example: 'Documents/Uploads', required: false })
  @IsOptional()
  @IsString()
  path?: string;
}
