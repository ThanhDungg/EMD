import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMasterplanSystemDto {
  @IsString()
  vnName!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  engName?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workId?: number;
}

export class CreateMasterplanCategoryDto {
  @IsString()
  vnName!: string;

  @Type(() => Number)
  @IsInt()
  systemId!: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  engName?: string;
}

export class CreateMasterplanTaskDto {
  @IsString()
  title!: string;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsOptional()
  @IsString()
  pic?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  formTemplate?: string;

  @IsOptional()
  @IsString()
  classification?: string;

  // data_json kế hoạch/thực tế theo tuần-tháng-năm (xem MasterplanData)
  @IsOptional()
  @IsObject()
  planData?: Record<string, unknown>;
}
