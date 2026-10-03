// reports/dto — validation cho query engine kiểu Power BI.
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
export type ReportDatasetKey =
  | 'works'
  | 'incidents'
  | 'energy'
  | 'assets'
  | 'checklist'
  | 'contracts'
  | 'personnel'
  | 'sites';

export const REPORT_DATASETS: ReportDatasetKey[] = [
  'works',
  'incidents',
  'energy',
  'assets',
  'checklist',
  'contracts',
  'personnel',
  'sites',
];

export class ReportFiltersDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  siteIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds?: number[];

  // Lọc theo MÃ loại việc (CHECKLIST/INCIDENT/ENERGY_CHECK...) — dùng cho các
  // báo cáo hằng ngày theo loại công việc, không cần biết id.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryCodes?: string[];

  // Hợp đồng đầu vào / đầu ra
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contractTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  statusIds?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meterTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phases?: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  userIds?: number[];
}

export class QueryReportDto {
  @IsIn(REPORT_DATASETS)
  dataset!: ReportDatasetKey;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsObject()
  filters?: ReportFiltersDto;

  @IsOptional()
  @IsIn(['day', 'week', 'month', 'quarter', 'year'])
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;
}

/**
 * Drill-through: click vào 1 segment biểu đồ → lấy DANH SÁCH bản ghi gốc tạo
 * ra chỉ số đó (cùng bộ lọc + 1 lát cắt theo giá trị của chiều).
 */
export class DrillReportDto extends QueryReportDto {
  @IsObject()
  slice!: { dim: string; value: string };

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}

export class SaveBoardDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
