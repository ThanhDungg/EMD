import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';
import { fetchWorks } from '@/entities/work';
import type { WorkItem } from '@/entities/work';
import type {
  CategoryItem,
  CompanyProfile,
  MeInfo,
  ModuleItem,
  WorkRecurrence,
} from '../model/home';
import { templateToRecurrence } from '../model/home';

// 8 module core seed sẵn ở backend — dùng fallback khi API lỗi.
// GET /modules đã lọc theo user (trực tiếp hoặc qua nhóm).
const FALLBACK_MODULES: ModuleItem[] = [
  { code: 'WORKFLOW', vnName: 'Quy trình', engName: 'Workflow' },
  { code: 'APPLICATIONS', vnName: 'Ứng dụng', engName: 'Applications' },
  { code: 'REPORTS', vnName: 'Báo cáo', engName: 'Reports' },
  { code: 'ASSETS', vnName: 'Tài sản', engName: 'Assets' },
  {
    code: 'SYSTEM_ADMIN',
    vnName: 'Quản trị hệ thống',
    engName: 'System Administration',
  },
  {
    code: 'APP_CONFIG',
    vnName: 'Cấu hình ứng dụng',
    engName: 'Application Configuration',
  },
  { code: 'INTERNAL_CHAT', vnName: 'Chat nội bộ', engName: 'Internal Chat' },
  {
    code: 'INVESTOR_PORTAL',
    vnName: 'Portal chủ đầu tư',
    engName: 'Investor Portal',
  },
];

function token(): string | undefined {
  return getToken() ?? undefined;
}

export function fetchMe(): Promise<MeInfo> {
  return apiClient.get<MeInfo>('/auth/me', token());
}

// Sidebar module: ưu tiên API, rớt quyền thì dùng danh sách core.
export async function fetchModules(): Promise<ModuleItem[]> {
  try {
    const list = await apiClient.get<ModuleItem[]>('/modules', token());
    return list.filter(
      (m) => !(m as unknown as { isDeleted?: boolean }).isDeleted,
    );
  } catch {
    return FALLBACK_MODULES;
  }
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  try {
    return await apiClient.get<CategoryItem[]>('/workflow/categories', token());
  } catch {
    return [];
  }
}

export async function fetchCompanyProfile(): Promise<CompanyProfile | null> {
  try {
    return await apiClient.get<CompanyProfile>(
      '/workflow/company-profile',
      token(),
    );
  } catch {
    return null;
  }
}

export interface CreateRecurrencePayload {
  title: string;
  description?: string;
  categoryId: number;
  isRecurrence: true;
  recurrence: {
    frequency: string;
    weekdays?: number[];
    monthDays?: number[];
    quarterlyMode?: string;
    yearMonth?: number;
    yearDay?: number;
    startDate?: string;
    endType?: string;
    endDate?: string;
  };
}

// Work mẫu lặp của 1 loại việc (tab Việc lặp) — mẫu chính là 1 dòng work.
export async function fetchRecurrences(
  categoryId: number,
): Promise<WorkRecurrence[]> {
  try {
    const items = await fetchWorks({
      categoryId,
      isRecurrence: true,
      limit: 100,
    });
    return items.map(templateToRecurrence);
  } catch {
    return [];
  }
}

export async function createRecurrence(
  payload: CreateRecurrencePayload,
): Promise<WorkRecurrence> {
  const created = await apiClient.post<WorkItem>(
    '/workflow/works',
    payload,
    token(),
  );
  return templateToRecurrence(created);
}

export function previewRecurrence(
  id: number,
  count = 8,
): Promise<{ dates: string[] }> {
  return apiClient.get<{ dates: string[] }>(
    `/workflow/works/${id}/recurrence-preview?count=${count}`,
    token(),
  );
}

export function generateRecurrence(id: number): Promise<{ created: number }> {
  return apiClient.post<{ created: number }>(
    `/workflow/works/${id}/generate`,
    {},
    token(),
  );
}

export async function toggleRecurrence(
  id: number,
  isActive: boolean,
): Promise<void> {
  await apiClient.patch(
    `/workflow/works/${id}`,
    { recurrence: { isActive } },
    token(),
  );
}

export function deleteRecurrence(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/works/${id}`, token());
}
