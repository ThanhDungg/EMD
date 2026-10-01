import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

// KPI | BAR | PIE | LINE | TABLE | MAP
export const CHART_TYPES = [
  'KPI',
  'BAR',
  'PIE',
  'LINE',
  'TABLE',
  'MAP',
] as const;

// works | checklist | assets | sites | incidents | energy | contracts
export const REPORT_DATASETS = [
  'works',
  'checklist',
  'assets',
  'sites',
  'incidents',
  'energy',
  'contracts',
] as const;

export class CreateChartDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsIn(CHART_TYPES)
  chartType!: string;

  @IsIn(REPORT_DATASETS)
  dataset!: string;

  // count | sum_total (năng lượng)
  @IsOptional()
  @IsString()
  metric?: string;

  // Tên chiều gom nhóm (null = không gom, dùng cho KPI)
  @IsOptional()
  @IsString()
  dimension?: string | null;

  // Bộ lọc riêng của biểu đồ: { from, to, siteId, categoryId, statusId, ... }
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
