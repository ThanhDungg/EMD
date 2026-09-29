import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ContractTermType,
  ContractType,
} from '../../../generated/prisma/client.js';

// Hợp đồng (khai báo master data):
// - Loại hợp đồng: đầu vào / đầu ra
// - Loại thời gian: có thời hạn (TERM, cần ngày kết thúc) /
//   không thời hạn (OPEN_ENDED)
// - Dự án: nhiều-nhiều, client gửi `siteIds`, backend tách ra lưu bảng
//   nối contract_sites.
export class CreateContractDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã hợp đồng không được để trống.' })
  code!: string;

  // Tên công ty
  @IsString()
  @IsNotEmpty({ message: 'Tên công ty không được để trống.' })
  companyName!: string;

  // Tên loại hợp đồng (VD "Hợp đồng dịch vụ bảo trì")
  @IsString()
  @IsNotEmpty({ message: 'Tên loại hợp đồng không được để trống.' })
  typeName!: string;

  @IsEnum(ContractType)
  contractType!: ContractType;

  // Loại hình dịch vụ — dùng chung droplist với hồ sơ dự án
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  serviceTypeId?: number | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsEnum(ContractTermType)
  termType!: ContractTermType;

  @IsOptional()
  @IsString()
  notes?: string;

  // Danh sách id dự án (site)
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  siteIds?: number[];
}
