import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FYP_BOX_MIMES,
  IMAGE_MAGIC_BYTES,
  IMAGE_MIME_EXT,
  STORED_PATH_RE,
} from './upload.constants.js';

/** Thông tin 1 ảnh vừa lưu — client đưa `path` vào mảng attachments. */
export interface StoredImage {
  /** Path tương đối lưu trong DB, VD: /uploads/2026/09/<uuid>.jpg */
  path: string;
  /** Tên file gốc người dùng chọn (chỉ để hiển thị) */
  name: string;
  mimeType: string;
  size: number;
  /** Lat/long + giờ chụp do client gửi kèm (chỉ echo lại, không lưu vào file) */
  photoLat?: number;
  photoLng?: number;
  photoTakenAt?: string;
}

export interface StoredFileHandle {
  stream: ReturnType<typeof createReadStream>;
  absolutePath: string;
  size: number;
  mimeType: string;
  name: string;
}

type MulterFile = Express.Multer.File;

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly root: string;
  private readonly basePath: string;
  private readonly maxFileSize: number;
  private readonly maxFiles: number;

  constructor(private readonly config: ConfigService) {
    const dir = this.config.get<string>('upload.dir') ?? 'uploads';
    // Đường dẫn tương đối neo vào cwd của process (chạy `node dist/main.js`
    // thì neo vào backend/ chứ không phải backend/dist/).
    this.root = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
    this.basePath = (this.config.get<string>('upload.basePath') ?? 'uploads').replace(
      /^\/+|\/+$/g,
      '',
    );
    this.maxFileSize =
      Number(this.config.get<number>('upload.maxFileSize')) || 10 * 1024 * 1024;
    this.maxFiles = Number(this.config.get<number>('upload.maxFiles')) || 10;
  }

  async onModuleInit() {
    await mkdir(this.root, { recursive: true });
    this.logger.log(`Ảnh đính kèm lưu tại ${this.root}`);
  }

  private assertSize(file: MulterFile) {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File "${file.originalname}" vượt quá ${this.maxFileSize} bytes.`,
      );
    }
    if (file.size === 0) {
      throw new BadRequestException(`File "${file.originalname}" rỗng.`);
    }
  }

  private assertLooksLikeImage(file: MulterFile) {
    const head = file.buffer.subarray(0, 16);
    const startsWith = (bytes: number[]) =>
      bytes.every((b, i) => head[i] === b);
    const matchesFtyp = FYP_BOX_MIMES.has(file.mimetype)
      ? startsWith([0x66, 0x74, 0x79, 0x70])
      : false;
    if (!matchesFtyp && !IMAGE_MAGIC_BYTES.some((s) => startsWith(s.bytes))) {
      throw new BadRequestException(
        `File "${file.originalname}" không phải ảnh hợp lệ.`,
      );
    }
  }

  /**
   * Lưu nhiều ảnh 1 lần. Path chia theo năm/tháng cho dễ quản lý,
   * tên file là uuid nên không đụng tên nhau và không lộ tên thật lên URL.
   */
  async saveImages(
    files: MulterFile[],
    meta: { photoLat?: number; photoLng?: number; photoTakenAt?: string } = {},
  ): Promise<StoredImage[]> {
    if (files.length === 0) {
      throw new BadRequestException('Chưa có file ảnh nào được gửi lên.');
    }
    if (files.length > this.maxFiles) {
      throw new BadRequestException(
        `Mỗi lần tối đa ${this.maxFiles} ảnh, đã nhận ${files.length}.`,
      );
    }

    const now = new Date();
    const dir = `${String(now.getFullYear())}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    await mkdir(join(this.root, dir), { recursive: true });

    const out: StoredImage[] = [];
    for (const file of files) {
      this.assertSize(file);
      const ext = IMAGE_MIME_EXT[file.mimetype];
      if (!ext) {
        throw new BadRequestException(
          `Định dạng "${file.mimetype}" không được hỗ trợ, chỉ nhận ảnh.`,
        );
      }
      this.assertLooksLikeImage(file);

      const filename = `${randomUUID()}.${ext}`;
      await writeFile(join(this.root, dir, filename), file.buffer);
      out.push({
        path: `/${this.basePath}/${dir}/${filename}`,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        ...meta,
      });
    }
    return out;
  }

  /**
   * Path lưu trong DB → handle để stream ra ngoài.
   * Chặn path traversal: chỉ nhận đúng dạng /<basePath>/YYYY/MM/<uuid>.<ext>
   * của chính deployment này rồi kiểm tra file nằm thật sự bên trong
   * thư mục upload.
   */
  async openStored(path: string): Promise<StoredFileHandle> {
    const matched =
      typeof path === 'string' ? STORED_PATH_RE.exec(path) : null;
    if (!matched || matched[1] !== this.basePath) {
      throw new BadRequestException('Đường dẫn ảnh không hợp lệ.');
    }
    const [, , year, month, stem, ext] = matched;
    const filename = `${stem}.${ext}`;
    // Bỏ đoạn basePath vì `root` đã trỏ sẵn vào thư mục upload.
    const absolutePath = resolve(join(this.root, year, month, filename));
    if (!absolutePath.startsWith(this.root + sep)) {
      throw new BadRequestException('Đường dẫn ảnh không hợp lệ.');
    }

    let size: number;
    try {
      size = (await stat(absolutePath)).size;
    } catch {
      throw new NotFoundException('Ảnh không tồn tại trên máy chủ.');
    }

    const mimeType =
      Object.entries(IMAGE_MIME_EXT).find(([, e]) => e === ext)?.[0] ??
      'application/octet-stream';
    return {
      stream: createReadStream(absolutePath),
      absolutePath,
      size,
      mimeType,
      name: filename,
    };
  }
}
