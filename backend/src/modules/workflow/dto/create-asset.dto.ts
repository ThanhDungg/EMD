import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Tài sản / thiết bị. Vị trí (locationId) phải thuộc đúng site của tài sản —
// service kiểm tra, vì không thể ràng buộc bằng FK chéo.
export class CreateAssetDto {
  // Mã tài sản (bắt buộc, unique)
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  // Ngày đưa vào sử dụng
  @IsOptional()
  @IsDateString()
  usageDate?: string;

  // Trạng thái dùng (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usageStatusId?: number;

  // Thuộc danh mục tài sản nào (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  // Vị trí đặt tài sản (thuộc 1 site)
  // null = chưa gán vị trí
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number | null;

  // Nhà cung cấp / xuất xứ / model
  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  // Đơn vị tính (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  unitId?: number;

  // Hạn bảo hành
  @IsOptional()
  @IsDateString()
  warrantyEnd?: string;

  // Tình trạng (droplist)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  conditionId?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  // Thông tin chi tiết (text tự do)
  @IsOptional()
  @IsString()
  detail?: string;

  // Toạ độ đặt tài sản (chọn trên bản đồ). null = chưa xác định.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}
