import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// Chủ đầu tư (khai báo master data). Địa lý 3 tầng: quốc gia → tỉnh thành →
// phường xã (không có miền). `investorGroupId` trỏ tới droplist chủ đầu tư
// cha (key `investorGroup`).
export class CreateInvestorDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã chủ đầu tư không được để trống.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên chủ đầu tư không được để trống.' })
  name!: string;

  // Thuộc chủ đầu tư cha
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  investorGroupId?: number | null;

  // Mã số thuế
  @IsOptional()
  @IsString()
  taxCode?: string;

  // Đại diện pháp nhân
  @IsOptional()
  @IsString()
  legalRepresentative?: string;

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

  // Số nhà, tên đường
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email?: string;

  @IsOptional()
  @IsString()
  hotline?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
