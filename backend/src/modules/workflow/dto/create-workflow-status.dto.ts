import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateWorkflowStatusDto {
  // Loại việc mà status này thuộc về
  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  // Mã trong phạm vi 1 loại (VD TODO) — unique theo cặp (categoryId, code)
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'code chỉ gồm chữ hoa, số và gạch dưới (VD TODO, IN_PROGRESS).',
  })
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  // Màu hex hiển thị tag ở FE (VD #2174cd)
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color phải dạng hex #rrggbb.' })
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  // Trạng thái mặc định khi tạo work không chọn status (mỗi loại nên có 1 cái)
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  // Trạng thái kết thúc (Hoàn thành, Đã huỷ...) — dùng thống kê công việc tồn
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
