import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

const logger = new Logger('HttpExceptionFilter');

/**
 * Lỗi ràng buộc DB (trùng mã, còn dữ liệu tham chiếu) vốn trả 500 khiến UI chỉ
 * hiện "Internal server error". Chuyển sang 409/404 kèm thông báo tiếng Việt.
 * Kiểm tra theo `code` của Prisma để không phụ thuộc import runtime nội bộ.
 */
function prismaErrorMessage(exception: unknown): {
  status: number;
  message: string;
} | null {
  if (typeof exception !== 'object' || exception === null) return null;
  const err = exception as { code?: unknown; meta?: { target?: unknown } };
  if (err.code === 'P2002') {
    const target = err.meta?.target;
    const field = Array.isArray(target) ? target.join(', ') : target;
    return {
      status: HttpStatus.CONFLICT,
      message: field
        ? `Giá trị "${field}" đã tồn tại, vui lòng dùng giá trị khác.`
        : 'Giá trị đã tồn tại, vui lòng dùng giá trị khác.',
    };
  }
  if (err.code === 'P2003') {
    return {
      status: HttpStatus.CONFLICT,
      message:
        'Không thể lưu vì còn dữ liệu đang tham chiếu tới bản ghi này.',
    };
  }
  if (err.code === 'P2025') {
    return {
      status: HttpStatus.NOT_FOUND,
      message: 'Không tìm thấy bản ghi cần thao tác.',
    };
  }
  return null;
}

// Chuẩn NestJS: filter tập trung để trả lỗi JSON đồng nhất
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const prismaError = prismaErrorMessage(exception);
    if (prismaError) {
      res.status(prismaError.status).json({
        statusCode: prismaError.status,
        message: {
          message: [prismaError.message],
          error: 'Conflict',
          statusCode: prismaError.status,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Lỗi 500 bị nuốt thành message chung nên phải log lại, không thì không
    // truy được nguyên nhân. Response trả về giữ nguyên như cũ.
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    res.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
