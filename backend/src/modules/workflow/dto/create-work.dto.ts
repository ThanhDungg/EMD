import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { WorkflowPriority } from '../../../generated/prisma/client.js';
import { RecurrenceScheduleDto } from './recurrence-schedule.dto.js';

export class CreateWorkDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Lọc theo loại công việc
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  // Người thực hiện (nhiều người qua bảng work_handlers).
  // Người giao = user đăng nhập, tự gắn ở API nên không nhận từ client.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Type(() => Number)
  @IsInt({ each: true })
  handlerIds?: number[];

  // Người theo dõi (nhiều người)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  followerIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  siteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  incidentTypeId?: number;

  // Trạng thái thuộc bộ status của loại việc (?categoryId).
  // Bỏ trống → tự gắn status mặc định của loại.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Thời điểm hoàn thành thực tế
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  // Tiến độ 0–100 (%)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsEnum(WorkflowPriority)
  priority?: WorkflowPriority;

  @IsOptional()
  @IsString()
  location?: string;

  // --- Công việc lặp mẫu (checklist + kiểm tra năng lượng) ---
  // isRecurrence = true → work này là MẪU (giữ tiêu đề/nội dung/người thực hiện).
  // Thông tin lặp nằm ở `recurrence` (bảng work_recurrence_schedules riêng).
  @IsOptional()
  @IsBoolean()
  isRecurrence?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceScheduleDto)
  recurrence?: RecurrenceScheduleDto;
}
