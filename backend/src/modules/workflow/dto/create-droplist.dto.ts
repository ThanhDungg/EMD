import { IsOptional, IsString } from 'class-validator';

// Dùng chung cho mọi bảng droplist của hệ thống (xem DROPLISTS trong
// droplists.service.ts): module Tài sản (danh mục tài sản, đơn vị tính,
// trạng thái dùng, tình trạng) + module Ứng dụng (phân loại sửa chữa,
// phân loại hư hỏng, đơn vị phụ trách).
export class CreateDroplistDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  // Chỉ dùng cho key `investorGroup` (chủ đầu tư cha).
  @IsOptional()
  @IsString()
  shortName?: string;
}
