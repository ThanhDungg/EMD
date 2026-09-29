import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  QuarterlyMode,
  RecurrenceEndType,
  RecurrenceFrequency,
} from '../../../generated/prisma/client.js';

// Thông tin lặp của work mẫu (bảng work_recurrence_schedules — chỉ thời gian,
// không tiêu đề/nội dung). Kết thúc lặp: NEVER (chạy mãi) hoặc ON_DATE (đến ngày chọn).
export class RecurrenceScheduleDto {
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  // Theo tuần: thứ ISO (1 = Thứ 2 ... 7 = Chủ nhật)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  // Theo tháng: các ngày trong tháng (tháng thiếu ngày thì bỏ qua)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(31)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  monthDays?: number[];

  // Theo quý: đầu quý hoặc cuối quý
  @IsOptional()
  @IsEnum(QuarterlyMode)
  quarterlyMode?: QuarterlyMode;

  // Theo năm: 1 ngày trong năm (29/2 chỉ năm nhuận)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  yearMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  yearDay?: number;

  // Hiệu lực từ ngày (bỏ trống → theo startDate của work mẫu)
  @IsOptional()
  @IsDateString()
  startDate?: string;

  // Kết thúc lặp: NEVER hoặc ON_DATE (+ endDate)
  @IsOptional()
  @IsEnum(RecurrenceEndType)
  endType?: RecurrenceEndType;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Tạm dừng mẫu (không xoá)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRecurrenceScheduleDto {
  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  frequency?: RecurrenceFrequency;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(31)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  monthDays?: number[];

  @IsOptional()
  @IsEnum(QuarterlyMode)
  quarterlyMode?: QuarterlyMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  yearMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  yearDay?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(RecurrenceEndType)
  endType?: RecurrenceEndType;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
