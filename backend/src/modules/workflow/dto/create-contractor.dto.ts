import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ContractorStatus } from '../../../generated/prisma/client.js';

// Nhà thầu (khai báo master data): mã, tên, loại nhà thầu (droplist
// `contractorType`), dịch vụ cung cấp (droplist `service` dùng chung với danh
// mục dự án), mã số thuế, hotline, địa lý 3 tầng, số nhà tên đường, email,
// trạng thái, ghi chú.
export class CreateContractorDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã nhà thầu không được để trống.' })
  code!: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên nhà thầu không được để trống.' })
  name!: string;

  // Loại nhà thầu
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractorTypeId?: number | null;

  // Dịch vụ cung cấp
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serviceId?: number | null;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  hotline?: string;

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

  // Đang hoạt động / ngưng hoạt động
  @IsOptional()
  @IsEnum(ContractorStatus)
  status?: ContractorStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
