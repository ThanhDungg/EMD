import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UploadImagesDto } from './dto/upload-images.dto.js';
import type { StoredImage } from './uploads.service.js';
import { UploadsService } from './uploads.service.js';

/**
 * Ảnh đính kèm nằm ngoài thư mục public nên phải qua API (JwtAuthGuard toàn
 * cục) mới xem được. `path` trả về lúc upload là path tương đối, dùng lại
 * nguyên vẹn cho endpoint này. Giới hạn files/fileSize lấy từ config
 * (MulterModule.registerAsync) nên không khai ở đây.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  // FilesInterceptor chứ không FileInterceptor: 1 request có thể nhiều ảnh.
  @UseInterceptors(FilesInterceptor('files'))
  uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadImagesDto,
  ): Promise<{ files: StoredImage[] }> {
    return this.uploadsService
      .saveImages(files ?? [], {
        photoLat: dto.photoLat,
        photoLng: dto.photoLng,
        photoTakenAt: dto.photoTakenAt,
      })
      .then((files) => ({ files }));
  }

  @Get('file')
  async readFile(
    @Query('path') path: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.uploadsService.openStored(path);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    // Chặn trình duyệt đoán mime (ảnh svg/html nhúng script) — chỉ ảnh raster.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${file.name}"`);
    return new StreamableFile(file.stream);
  }
}
