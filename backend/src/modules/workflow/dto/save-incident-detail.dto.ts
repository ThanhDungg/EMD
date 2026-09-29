import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

// Chi tiết sự cố hư hỏng (PUT upsert theo work — tất cả optional)
export class SaveIncidentDetailDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforeImages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  afterImages?: string[];

  @IsOptional()
  @IsString()
  phase?: string;

  @IsOptional()
  @IsString()
  rbfRbw?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  // Vị trí sự cố: FK tới 1 node cây vị trí của site (bắt buộc có site trước).
  // locationName là tên hiển thị denormalize để không phải join khi list.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number | null;

  @IsOptional()
  @IsString()
  locationName?: string;

  // Tài sản / thiết bị liên quan: FK tới assets (thuộc vị trí của sự cố).
  // relatedAsset là mã + tên hiển thị denormalize.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assetId?: number | null;

  @IsOptional()
  @IsString()
  relatedAsset?: string;

  // Phân loại sửa chữa / hư hỏng / đơn vị phụ trách: lấy từ droplist
  // (repair_types / damage_types / pic_units). Kèm nhãn denormalize để
  // hiển thị nhanh.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  repairTypeId?: number | null;

  @IsOptional()
  @IsString()
  repairType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  damageTypeId?: number | null;

  @IsOptional()
  @IsString()
  damageType?: string;

  @IsOptional()
  @IsString()
  cause?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  picUnitId?: number | null;

  @IsOptional()
  @IsString()
  picUnit?: string;

  @IsOptional()
  @IsString()
  solution?: string;

  // Công việc tiếp theo (text thuần)
  @IsOptional()
  @IsString()
  nextWork?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reopenCount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
