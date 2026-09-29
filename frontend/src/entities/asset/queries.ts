// entities/asset/queries — TanStack Query hooks cho module Tài sản.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAsset,
  createSiteLocation,
  deleteAsset,
  deleteSiteLocation,
  fetchAssets,
  fetchSiteLocationTree,
  importAssetsFromFile,
  importSiteLocationsFromFile,
  updateAsset,
  updateSiteLocation,
} from './api';
import type {
  AssetFilters,
  AssetPayload,
  SiteLocationPayload,
} from './model';

export const assetKeys = {
  all: ['assets'] as const,
  list: (filters: AssetFilters) => [...assetKeys.all, 'list', filters] as const,
  locations: (siteId?: number) =>
    [...assetKeys.all, 'locations', siteId ?? 'all'] as const,
};

/** Cây vị trí theo site. Truyền siteId = chỉ lấy vị trí của dự án đó. */
export function useSiteLocations(siteId?: number, enabled = true) {
  return useQuery({
    queryKey: assetKeys.locations(siteId),
    queryFn: () => fetchSiteLocationTree(siteId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssets(filters: AssetFilters = {}, enabled = true) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: () => fetchAssets(filters),
    enabled,
  });
}

function useInvalidateAssets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: assetKeys.all });
}

export function useCreateSiteLocation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (payload: SiteLocationPayload) => createSiteLocation(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSiteLocation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<SiteLocationPayload>;
    }) => updateSiteLocation(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteSiteLocation() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: number) => deleteSiteLocation(id),
    onSuccess: invalidate,
  });
}

export function useCreateAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (payload: AssetPayload) => createAsset(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<AssetPayload>;
    }) => updateAsset(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onSuccess: invalidate,
  });
}

/**
 * Nhập tài sản từ file .xlsx. Thành công thì làm mới danh sách tài sản.
 * Lỗi ném ra là `AssetImportFailure` (có danh sách lỗi theo dòng) — xử lý ở UI.
 */
export function useImportAssets() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (file: File) => importAssetsFromFile(file),
    onSuccess: invalidate,
  });
}

/**
 * Nhập cây vị trí từ file .xlsx. Thành công thì làm mới cây vị trí đang xem.
 * Lỗi ném ra là `AssetImportFailure` (có danh sách lỗi theo dòng).
 */
export function useImportSiteLocations() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (file: File) => importSiteLocationsFromFile(file),
    onSuccess: invalidate,
  });
}
