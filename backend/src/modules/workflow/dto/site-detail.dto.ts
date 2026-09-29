import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export type SiteDetailKind =
  'members' | 'serviceProviders' | 'contractors' | 'partnerContacts' | 'units';

// Payload tạo 1 dòng của 5 bảng con. Dùng chung 1 DTO cho cả 5 loại — field
// không dùng với loại nào thì client không gửi (ValidationPipe chỉ kiểm tra
// field có trong payload).
export class CreateSiteDetailDto {
  // Luôn bắt buộc: dòng thuộc dự án nào
  @Type(() => Number)
  @IsInt()
  siteId!: number;

  // --- members: nhân viên (thông tin tên/email/sđt/chức vụ lấy từ users) ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  // --- serviceProviders / contractors / partnerContacts ---
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { each: true })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  // --- units ---
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  area?: number | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
