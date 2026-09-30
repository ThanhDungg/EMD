import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

@Module({
  imports: [
    // Giới hạn multer lấy từ env (UPLOAD_MAX_FILES / UPLOAD_MAX_FILE_SIZE)
    // để không vượt quá chỗ đã cấu hình.
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          files: Number(config.get<number>('upload.maxFiles')) || 10,
          fileSize: Number(config.get<number>('upload.maxFileSize')) || 10 * 1024 * 1024,
        },
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
