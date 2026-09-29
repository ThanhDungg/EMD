import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  SiteManagementStatus,
  SiteOperationStatus,
  SiteRentalStatus,
} from '../../../generated/prisma/client.js';

// Hồ sơ dự án (site) — module Ứng dụng. Quy ước:
// - Địa lý phân cấp: quốc gia → miền → tỉnh thành → phường xã (FK droplist)
// - Định vị: chuỗi toạ độ "lat,lng" cách nhau bằng dấu ";"
//   (client tự vẽ khoanh vùng trên bản đồ)
// - Diện tích đơn vị m2, phần trăm lắp đầy đơn vị %.
export class CreateSiteDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  // Lô / giai đoạn
  @IsOptional()
  @IsString()
  lot?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  // Số nhà, tên đường
  @IsOptional()
  @IsString()
  address?: string;

  // Định vị: "lat,lng;lat,lng"
  @IsOptional()
  @IsString()
  geoPoints?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  countryId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  regionId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provinceId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  wardId?: number | null;

  // Chủ đầu tư (droplist) / số tầng / loại hình dịch vụ (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  investorId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  floors?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serviceTypeId?: number | null;

  // Dịch vụ được cung cấp (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serviceId?: number | null;

  // --- Diện tích (m2) ---
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  landArea?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gfaArea?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  glaArea?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roadArea?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  leasedArea?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  greenArea?: number | null;

  // Phần trăm lắp đầy (%)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  occupancyRate?: number | null;

  // Ngày tiếp nhận dự án
  @IsOptional()
  @IsDateString()
  receivedAt?: string | null;

  @IsOptional()
  @IsEnum(SiteOperationStatus)
  operationStatus?: SiteOperationStatus | null;

  @IsOptional()
  @IsEnum(SiteRentalStatus)
  rentalStatus?: SiteRentalStatus | null;

  @IsOptional()
  @IsEnum(SiteManagementStatus)
  managementStatus?: SiteManagementStatus | null;

  @IsOptional()
  @IsString()
  notes?: string;

  // Quản lý dự án của site (id user)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerId?: number;
}
