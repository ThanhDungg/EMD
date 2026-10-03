// entities/report/model — mirror backend reports.constants.ts (giữ đồng bộ tay).
export type ReportDatasetKey =
  | 'works'
  | 'incidents'
  | 'energy'
  | 'assets'
  | 'checklist'
  | 'contracts'
  | 'personnel'
  | 'sites';

export interface DatasetField {
  key: string;
  label: string;
  kind: 'dimension' | 'metric';
  hint?: string;
}

export interface DatasetDef {
  key: ReportDatasetKey;
  label: string;
  description: string;
  dimensions: DatasetField[];
  metrics: DatasetField[];
  defaultChart: string;
  suggestedCharts: string[];
}

export type ChartKey =
  | 'kpi'
  | 'bar'
  | 'stackedBar'
  | 'line'
  | 'area'
  | 'donut'
  | 'pie'
  | 'funnel'
  | 'gauge'
  | 'radar'
  | 'treemap'
  | 'table'
  | 'combo'
  | 'heatmap';

export interface ChartDef {
  key: ChartKey;
  label: string;
  description: string;
  needsDimension: boolean;
}

export const REPORT_CHARTS: ChartDef[] = [
  { key: 'kpi', label: 'KPI', description: 'Thẻ số tổng', needsDimension: false },
  { key: 'bar', label: 'Cột', description: 'So sánh giữa các nhóm', needsDimension: true },
  { key: 'stackedBar', label: 'Cột chồng', description: 'Cơ cấu 2 chiều', needsDimension: true },
  { key: 'line', label: 'Đường', description: 'Xu hướng thời gian', needsDimension: true },
  { key: 'area', label: 'Vùng', description: 'Xu hướng tô nền', needsDimension: true },
  { key: 'donut', label: 'Donut', description: 'Cơ cấu %', needsDimension: true },
  { key: 'pie', label: 'Tròn', description: 'Tròn đặc', needsDimension: true },
  { key: 'funnel', label: 'Phễu', description: 'Pipeline xử lý', needsDimension: true },
  { key: 'gauge', label: 'Đồng hồ', description: 'Tỉ lệ đơn (%)', needsDimension: false },
  { key: 'radar', label: 'Radar', description: 'So đa chiều', needsDimension: true },
  { key: 'treemap', label: 'Treemap', description: 'Cơ cấu phân cấp', needsDimension: true },
  { key: 'table', label: 'Bảng', description: 'Chi tiết từng dòng', needsDimension: true },
  {
    key: 'combo',
    label: 'Cột + đường',
    description: 'Số lượng + tỉ lệ (2 trục)',
    needsDimension: true,
  },
  { key: 'heatmap', label: 'Heatmap', description: 'Ma trận 2 chiều', needsDimension: true },
];

export interface ReportFilters {
  from?: string;
  to?: string;
  siteIds?: number[];
  categoryIds?: number[];
  // Mã loại việc (CHECKLIST / INCIDENT / ENERGY_CHECK / MASTERPLAN /
  // OFFICE_WORK) — dùng cho báo cáo hằng ngày theo loại công việc.
  categoryCodes?: string[];
  contractTypes?: string[];
  statusIds?: number[];
  priorities?: string[];
  meterTypes?: string[];
  phases?: string[];
  userIds?: number[];
}

export interface QueryReportPayload {
  dataset: ReportDatasetKey;
  dimensions?: string[];
  metrics?: string[];
  filters?: ReportFilters;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  limit?: number;
}

export interface QueryReportResult {
  rows: Record<string, string | number>[];
  total: number;
  dimensions: string[];
  metrics: string[];
}

// 1 widget trên dashboard = 1 visual Power BI thu nhỏ.
export interface ReportWidgetConfig {
  id: string;
  title: string;
  dataset: ReportDatasetKey;
  chartType: ChartKey;
  dimensions: string[];
  metrics: string[];
  filters?: ReportFilters;
  span?: number; // 6/8/12/24 trên grid 24
  showLabels?: boolean;
}

export interface ReportBoard {
  id: number;
  uuid: string;
  name: string;
  description?: string | null;
  config: { widgets?: ReportWidgetConfig[] } | null;
  isPublic: boolean;
  ownerId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportOverview {
  kpis: {
    totalWorks: number;
    openWorks: number;
    totalIncidents: number;
    totalEnergy: number;
    passRate: number;
  };
  byStatus: QueryReportResult;
  byCategory: QueryReportResult;
  byMonth: QueryReportResult;
  incidents: QueryReportResult;
  energyTrend: QueryReportResult;
  energyByType: QueryReportResult;
  assetsByCond: QueryReportResult;
  quality: QueryReportResult;
}

export function newWidgetId(): string {
  return `w_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
}

// ---- Drill-through: click 1 chỉ số trên biểu đồ → danh sách bản ghi gốc ----

/** Thông tin lát cắt: chỉ số nào của biểu đồ được click. */
export interface DrillSlice {
  dim: string;
  value: string;
}

/** Yêu cầu drill (dataset + bộ lọc giống biểu đồ + lát cắt). */
export interface DrillRequest {
  dataset: ReportDatasetKey;
  dimensions?: string[];
  metrics?: string[];
  filters?: ReportFilters;
  slice: DrillSlice;
  page?: number;
  limit?: number;
  /** Tiêu đề biểu đồ đã click (hiển thị trên drawer). */
  chartTitle?: string;
}

export interface DrillColumn {
  key: string;
  label: string;
}

export interface DrillResult {
  rows: Record<string, string | number>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  columns: DrillColumn[];
  dataset: ReportDatasetKey;
  slice: DrillSlice;
}

/**
 * ReportChart chỉ biết chiều + giá trị được click; trang cha báo cáo ghép thêm
 * dataset / bộ lọc / tiêu đề để thành DrillRequest đầy đủ.
 */
export interface ChartDrillInfo {
  dim: string;
  value: string;
}

// ---- Danh mục báo cáo cha / con (3 nhóm) ----

export interface PresetChartDef {
  title: string;
  chartType: ChartKey;
  dimensions: string[];
  metrics: string[];
  span?: number;
}

export interface PresetKpiDef {
  label: string;
  metric: string;
  suffix?: string;
}

export interface PresetDef {
  key: string;
  title: string;
  description: string;
  dataset: ReportDatasetKey;
  filters?: Record<string, string[]>;
  kpis?: PresetKpiDef[];
  charts: PresetChartDef[];
}

export interface PresetGroupDef {
  key: string;
  label: string;
  description: string;
  items: PresetDef[];
}
