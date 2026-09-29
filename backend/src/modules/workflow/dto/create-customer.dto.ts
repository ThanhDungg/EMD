import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { CustomerStatus } from '../../../generated/prisma/client.js';

// Khách hàng — danh mục kiểm tra năng lượng. Khách hàng thuộc NHIỀU dự án
// (nhiều-nhiều): client gửi `siteIds` (mảng id dự án), backend tách ra lưu vào
// bảng nối customer_sites.
// Địa lý: quốc gia → tỉnh thành → phường xã (tỉnh phải thuộc quốc gia, phường
// phải thuộc tỉnh).
export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã khách hàng không được để trống.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống.' })
  name!: string;

  // Tên viết tắt
  @IsOptional()
  @IsString()
  shortName?: string;

  // Mã số thuế
  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  countryId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provinceId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  wardId?: number | null;

  // Số nhà
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  hotline?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email?: string;

  // Đang hoạt động / ngưng hoạt động
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  // Nhà xưởng (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  factoryId?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  // Danh sách id dự án (site) — quan hệ nhiều-nhiều
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  siteIds?: number[];
}
