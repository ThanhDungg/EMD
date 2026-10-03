// entities/report/api — gọi BE /reports.
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';
import type {
  DatasetDef,
  DrillRequest,
  DrillResult,
  PresetGroupDef,
  QueryReportPayload,
  QueryReportResult,
  ReportBoard,
  ReportOverview,
} from './model';

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchDatasets(): Promise<{ datasets: DatasetDef[] }> {
  return apiClient.get('/reports/datasets', token());
}

// Danh mục 3 nhóm báo cáo cha + báo cáo con (server-driven).
export async function fetchReportPresets(): Promise<{ groups: PresetGroupDef[] }> {
  return apiClient.get('/reports/presets', token());
}

export async function queryReport(payload: QueryReportPayload): Promise<QueryReportResult> {
  return apiClient.post<QueryReportResult>('/reports/query', payload, token());
}

// Drill-through: danh sách bản ghi gốc của 1 chỉ số đã click.
export async function drillReport(payload: DrillRequest): Promise<DrillResult> {
  return apiClient.post<DrillResult>('/reports/drill', payload, token());
}

export async function fetchOverview(params: {
  from?: string;
  to?: string;
  siteId?: number;
}): Promise<ReportOverview> {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.siteId !== undefined) q.set('siteId', String(params.siteId));
  const suffix = q.toString();
  return apiClient.get<ReportOverview>(`/reports/overview${suffix ? `?${suffix}` : ''}`, token());
}

export async function fetchBoards(): Promise<ReportBoard[]> {
  return apiClient.get<ReportBoard[]>('/reports/boards', token());
}

export async function createBoard(payload: {
  name: string;
  description?: string;
  config?: { widgets?: unknown[] };
  isPublic?: boolean;
}): Promise<ReportBoard> {
  return apiClient.post<ReportBoard>('/reports/boards', payload, token());
}

export async function updateBoard(
  id: number,
  payload: Partial<{ name: string; description?: string; config?: { widgets?: unknown[] }; isPublic?: boolean }>,
): Promise<ReportBoard> {
  return apiClient.patch<ReportBoard>(`/reports/boards/${id}`, payload, token());
}

export async function deleteBoard(id: number): Promise<void> {
  await apiClient.remove(`/reports/boards/${id}`, token());
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
