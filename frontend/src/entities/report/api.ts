// entities/report/api — API module Báo cáo: dashboard, biểu đồ, chia sẻ, số liệu.
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';
import type {
  ChartPayload,
  DashboardPayload,
  DatasetMeta,
  IdNameOption,
  QueryPayload,
  ReportDashboard,
  ReportResult,
  SharePayload,
} from './model';

function token(): string | undefined {
  return getToken() ?? undefined;
}

/** Id user đăng nhập (giải từ JWT, không gọi API). */
export function getCurrentUserId(): number | null {
  try {
    const t = getToken();
    if (!t) return null;
    const payload = JSON.parse(
      atob(t.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')),
    ) as { sub?: number };
    return typeof payload.sub === 'number' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Mô tả datasets/metrics/dimensions/filters để builder tự dựng form. */
export async function fetchReportMeta(): Promise<DatasetMeta[]> {
  return apiClient.get<DatasetMeta[]>('/reports/meta', token());
}

/** Số liệu cho 1 biểu đồ (kể cả preview lúc tạo chưa lưu). */
export async function queryReportData(
  payload: QueryPayload,
): Promise<ReportResult> {
  return apiClient.post<ReportResult>('/reports/query', payload, token());
}

export async function fetchDashboards(
  scope: 'mine' | 'shared' | 'all' = 'all',
): Promise<ReportDashboard[]> {
  return apiClient.get<ReportDashboard[]>(
    `/reports/dashboards?scope=${scope}`,
    token(),
  );
}

export async function fetchDashboard(id: number): Promise<ReportDashboard> {
  return apiClient.get<ReportDashboard>(`/reports/dashboards/${id}`, token());
}

export async function createDashboard(
  payload: DashboardPayload,
): Promise<ReportDashboard> {
  return apiClient.post<ReportDashboard>('/reports/dashboards', payload, token());
}

export async function updateDashboard(
  id: number,
  payload: Partial<DashboardPayload>,
): Promise<ReportDashboard> {
  return apiClient.patch<ReportDashboard>(
    `/reports/dashboards/${id}`,
    payload,
    token(),
  );
}

export async function deleteDashboard(id: number): Promise<unknown> {
  return apiClient.remove(`/reports/dashboards/${id}`, token());
}

export async function shareDashboard(
  id: number,
  payload: SharePayload,
): Promise<ReportDashboard> {
  return apiClient.post<ReportDashboard>(
    `/reports/dashboards/${id}/shares`,
    payload,
    token(),
  );
}

export async function createChart(
  dashboardId: number,
  payload: ChartPayload,
): Promise<unknown> {
  return apiClient.post(
    `/reports/dashboards/${dashboardId}/charts`,
    payload,
    token(),
  );
}

export async function updateChart(
  id: number,
  payload: Partial<ChartPayload>,
): Promise<unknown> {
  return apiClient.patch(`/reports/charts/${id}`, payload, token());
}

export async function deleteChart(id: number): Promise<unknown> {
  return apiClient.remove(`/reports/charts/${id}`, token());
}

// ---- Options cho bộ lọc builder (tự lọc bản xoá, lỗi quyền → rỗng) ----

async function toOptions<T extends { id: number; isDeleted?: boolean }>(
  list: unknown,
  nameOf: (item: T) => string,
): Promise<IdNameOption[]> {
  if (!Array.isArray(list)) return [];
  return (list as T[])
    .filter((item) => !item.isDeleted)
    .map((item) => ({ id: item.id, name: nameOf(item) }));
}

/** Loại công việc cho lọc works.categoryId. */
export async function fetchWorkCategories(): Promise<IdNameOption[]> {
  try {
    const list = await apiClient.get('/workflow/categories', token());
    return toOptions<{ id: number; vnName: string; isDeleted?: boolean }>(
      list,
      (c) => c.vnName,
    );
  } catch {
    return [];
  }
}

/** Trạng thái của 1 loại việc cho lọc works.statusId. */
export async function fetchWorkStatuses(
  categoryId: number,
): Promise<IdNameOption[]> {
  try {
    const list = await apiClient.get(
      `/workflow/statuses?categoryId=${categoryId}`,
      token(),
    );
    return toOptions<{ id: number; name: string; isDeleted?: boolean }>(
      list,
      (s) => s.name,
    );
  } catch {
    return [];
  }
}

/** Danh mục tài sản cho lọc assets.categoryId. */
export async function fetchAssetCategories(): Promise<IdNameOption[]> {
  try {
    const list = await apiClient.get('/workflow/droplists/category', token());
    return toOptions<{ id: number; name: string; isDeleted?: boolean }>(
      list,
      (c) => c.name,
    );
  } catch {
    return [];
  }
}
