// entities/report/model — kiểu dữ liệu module Báo cáo tự phục vụ.

export type ChartType = 'KPI' | 'BAR' | 'PIE' | 'LINE' | 'TABLE' | 'MAP';

export interface ReportUserRef {
  id: number;
  accountName: string;
  fullName?: string | null;
}

export interface ReportGroupRef {
  id: number;
  name: string;
}

export interface ReportRow {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface ReportMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
  sub?: string;
}

export interface ReportResult {
  dataset: string;
  metric: string;
  dimension: string | null;
  total: number;
  rows: ReportRow[];
  markers?: ReportMarker[];
}

/** Bộ lọc riêng đi theo từng biểu đồ. */
export interface ChartFilters {
  from?: string;
  to?: string;
  siteId?: number;
  categoryId?: number;
  statusId?: number;
  workId?: number;
  provinceId?: number;
  meterType?: string;
  operationStatus?: string;
  rentalStatus?: string;
  managementStatus?: string;
  contractType?: string;
  [key: string]: unknown;
}

export interface ReportChart {
  id: number;
  dashboardId: number;
  title: string;
  chartType: ChartType;
  dataset: string;
  metric: string;
  dimension?: string | null;
  filters?: ChartFilters | null;
  sortOrder: number;
}

export interface ReportDashboard {
  id: number;
  title: string;
  description?: string | null;
  ownerId: number;
  owner?: ReportUserRef | null;
  charts?: ReportChart[];
  sharedUsers?: ReportUserRef[];
  sharedGroups?: ReportGroupRef[];
  _count?: { charts: number };
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardPayload {
  title: string;
  description?: string;
}

export interface ChartPayload {
  title: string;
  chartType: ChartType;
  dataset: string;
  metric?: string;
  dimension?: string | null;
  filters?: ChartFilters;
  sortOrder?: number;
}

export interface SharePayload {
  userIds?: number[];
  groupIds?: number[];
}

export interface QueryPayload {
  dataset: string;
  metric?: string;
  dimension?: string | null;
  filters?: ChartFilters;
  limit?: number;
}

// ---- Meta cho builder (GET /reports/meta) ----

export interface MetaOption {
  value: string;
  label: string;
}

export interface MetaFilter extends MetaOption {
  type: string;
}

export interface IdNameOption {
  id: number;
  name: string;
}

export interface DatasetMeta {
  dataset: string;
  label: string;
  metrics: MetaOption[];
  dimensions: MetaOption[];
  filters: MetaFilter[];
  chartTypes: string[];
}

export const CHART_TYPE_LABEL: Record<ChartType, string> = {
  KPI: 'Số tổng',
  BAR: 'Cột',
  PIE: 'Tròn',
  LINE: 'Đường',
  TABLE: 'Bảng',
  MAP: 'Bản đồ',
};
