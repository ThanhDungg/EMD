// entities/asset/api — API module Tài sản: vị trí theo site, tài sản, droplist.
import { apiClient, fetchBlob } from '@/shared/api';
import { getToken } from '@/shared/auth';
import type {
  AssetFilters,
  AssetImportFailure,
  AssetImportResult,
  AssetItem,
  AssetPayload,
  LocationImportResult,
  SiteLocationNode,
  SiteLocationPayload,
} from './model';

function token(): string | undefined {
  return getToken() ?? undefined;
}

// ---------------- Cây vị trí theo site ----------------

/** Cây vị trí của 1 site (màn sự cố gọi sau khi người dùng chọn dự án). */
export async function fetchSiteLocationTree(
  siteId?: number,
): Promise<SiteLocationNode[]> {
  const query = siteId === undefined ? '' : `?siteId=${siteId}`;
  return apiClient.get<SiteLocationNode[]>(
    `/workflow/site-locations${query}`,
    token(),
  );
}

export async function createSiteLocation(
  payload: SiteLocationPayload,
): Promise<SiteLocationNode> {
  return apiClient.post<SiteLocationNode>(
    '/workflow/site-locations',
    payload,
    token(),
  );
}

export async function updateSiteLocation(
  id: number,
  payload: Partial<SiteLocationPayload>,
): Promise<SiteLocationNode> {
  return apiClient.patch<SiteLocationNode>(
    `/workflow/site-locations/${id}`,
    payload,
    token(),
  );
}

export async function deleteSiteLocation(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/site-locations/${id}`, token());
}

// ---------------- Tài sản ----------------

function buildAssetQuery(filters: AssetFilters): string {
  const query = new URLSearchParams();
  if (filters.siteId !== undefined) query.set('siteId', String(filters.siteId));
  if (filters.locationId !== undefined)
    query.set('locationId', String(filters.locationId));
  if (filters.categoryId !== undefined)
    query.set('categoryId', String(filters.categoryId));
  if (filters.usageStatusId !== undefined)
    query.set('usageStatusId', String(filters.usageStatusId));
  if (filters.conditionId !== undefined)
    query.set('conditionId', String(filters.conditionId));
  if (filters.keyword) query.set('keyword', filters.keyword);
  if (filters.includeDeleted) query.set('includeDeleted', 'true');
  const s = query.toString();
  return s ? `?${s}` : '';
}

export async function fetchAssets(
  filters: AssetFilters = {},
): Promise<AssetItem[]> {
  return apiClient.get<AssetItem[]>(
    `/workflow/assets${buildAssetQuery(filters)}`,
    token(),
  );
}

export async function createAsset(payload: AssetPayload): Promise<AssetItem> {
  return apiClient.post<AssetItem>('/workflow/assets', payload, token());
}

export async function updateAsset(
  id: number,
  payload: Partial<AssetPayload>,
): Promise<AssetItem> {
  return apiClient.patch<AssetItem>(`/workflow/assets/${id}`, payload, token());
}

export async function deleteAsset(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/assets/${id}`, token());
}

// ---------------- Nhập tài sản bằng Excel ----------------

/**
 * Backend trả 400 kèm danh sách lỗi từng dòng khi file sai. `apiClient`
 * ném Error dạng `API 400: {...}` nên phải bóc lại body để hiện bảng lỗi.
 * Dùng chung cho mọi modal nhập Excel (tài sản, vị trí, dự án...).
 */
export function parseImportError(error: unknown): AssetImportFailure {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/^API \d+: ([\s\S]*)$/);
  const body = match?.[1] ? safeParse(match[1]) : undefined;
  const message = body?.message?.message;
  if (!body || typeof message !== 'string') {
    return { message: raw, errors: [], hiddenErrorCount: 0 };
  }
  return {
    message,
    errors: Array.isArray(body.message.errors) ? body.message.errors : [],
    hiddenErrorCount: Number(body.message.hiddenErrorCount ?? 0),
  };
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Nhập tài sản từ file .xlsx theo mẫu. Ném `AssetImportFailure` nếu file có lỗi. */
export async function importAssetsFromFile(
  file: File,
): Promise<AssetImportResult> {
  const form = new FormData();
  form.append('file', file);
  try {
    return await apiClient.upload<AssetImportResult>(
      '/workflow/assets/import',
      form,
      token(),
    );
  } catch (error) {
    throw parseImportError(error);
  }
}

/** Tải file mẫu .xlsx (có sheet danh mục + hướng dẫn). */
export async function downloadAssetImportTemplate(): Promise<Blob> {
  return fetchBlob('/workflow/assets/import/template', token());
}

/** Xuất danh sách tài sản đang lọc ra .xlsx (nhập lại được ngay). */
export async function downloadAssetExport(
  filters: AssetFilters = {},
): Promise<Blob> {
  return fetchBlob(`/workflow/assets/export${buildAssetQuery(filters)}`, token());
}

// ---------------- Nhập cây vị trí bằng Excel ----------------

/** Nhập vị trí từ file .xlsx. Ném `AssetImportFailure` nếu file có lỗi. */
export async function importSiteLocationsFromFile(
  file: File,
): Promise<LocationImportResult> {
  const form = new FormData();
  form.append('file', file);
  try {
    return await apiClient.upload<LocationImportResult>(
      '/workflow/site-locations/import',
      form,
      token(),
    );
  } catch (error) {
    throw parseImportError(error);
  }
}

/** Tải file mẫu .xlsx cho cây vị trí (có sheet danh mục + hướng dẫn). */
export async function downloadLocationImportTemplate(): Promise<Blob> {
  return fetchBlob('/workflow/site-locations/import/template', token());
}

/** Xuất cây vị trí ra .xlsx (lọc theo dự án nếu có, nhập lại được ngay). */
export async function downloadLocationExport(
  siteId?: number,
): Promise<Blob> {
  const query = siteId === undefined ? '' : `?siteId=${siteId}`;
  return fetchBlob(`/workflow/site-locations/export${query}`, token());
}
