import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateWorkflowCategoryDto {
  @IsString()
  vnName!: string;

  // Mã riêng của loại việc — admin điền sau qua API
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  engName?: string;

  @IsOptional()
  @IsString()
  image?: string;

  // Loại này có cho đặt lịch lặp không (checklist + kiểm tra năng lượng)
  @IsOptional()
  @IsBoolean()
  supportsRecurrence?: boolean;
}
