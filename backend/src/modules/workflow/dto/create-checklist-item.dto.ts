import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkflowTaskStatus } from '../../../generated/prisma/client.js';

// Kết quả đánh giá checklist: Đạt / Không đạt (null = chưa đánh giá).
export const CHECKLIST_RESULTS = ['PASS', 'FAIL'] as const;

export class CreateChecklistItemDto {
  // Tiêu đề (row cha chỉ cần mỗi field này)
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  standard?: string;

  // Loại nhập liệu (source cũ: Boolean/number/text/drop-down menu/multiselect...)
  @IsOptional()
  @IsString()
  valueType?: string;

  // Độ ưu tiên của dòng (source cũ: "Bình thường")
  @IsOptional()
  @IsString()
  itemPriority?: string;

  // Bắt buộc nhập giá trị / bắt buộc đính kèm ảnh
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  requiredImage?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  // Lat/long vị trí chụp + thời gian chụp ảnh trên điện thoại
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  photoLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  photoLng?: number;

  @IsOptional()
  @IsString()
  photoTakenAt?: string;

  @IsOptional()
  @IsBoolean()
  checkpoint?: boolean;

  // Kết quả đánh giá nội dung con: PASS = Đạt, FAIL = Không đạt,
  // bỏ trống = chưa đánh giá.
  @IsOptional()
  @IsIn(CHECKLIST_RESULTS)
  result?: string;

  @IsOptional()
  @IsEnum(WorkflowTaskStatus)
  status?: WorkflowTaskStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  // null = row cha gốc
  // Cho phép gửi null = xoá liên kết cha
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workId?: number;
}
