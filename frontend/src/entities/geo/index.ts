// entities/geo — droplist địa lý phân cấp:
// - hồ sơ dự án: quốc gia → miền → tỉnh thành → phường xã
// - khách hàng: quốc gia → tỉnh thành → phường xã (tỉnh lọc theo quốc gia)
// 1 endpoint chung /workflow/geo/:key?parentId=&countryId=.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';

export type GeoKey = 'country' | 'region' | 'province' | 'ward';

export interface GeoItem {
  id: number;
  code?: string | null;
  name: string;
}

export interface GeoPayload {
  name: string;
  code?: string;
  parentId?: number;
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchGeoList(
  key: GeoKey,
  parentId?: number,
  countryId?: number,
): Promise<GeoItem[]> {
  const params = new URLSearchParams();
  if (parentId !== undefined) params.set('parentId', String(parentId));
  if (countryId !== undefined) params.set('countryId', String(countryId));
  const query = params.toString();
  return apiClient.get<GeoItem[]>(
    `/workflow/geo/${key}${query ? `?${query}` : ''}`,
    token(),
  );
}

export async function createGeoItem(
  key: GeoKey,
  payload: GeoPayload,
): Promise<GeoItem> {
  return apiClient.post<GeoItem>(`/workflow/geo/${key}`, payload, token());
}

export async function updateGeoItem(
  key: GeoKey,
  id: number,
  payload: Partial<GeoPayload>,
): Promise<GeoItem> {
  return apiClient.patch<GeoItem>(`/workflow/geo/${key}/${id}`, payload, token());
}

export async function deleteGeoItem(key: GeoKey, id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/geo/${key}/${id}`, token());
}

export const geoKeys = {
  all: ['geo'] as const,
  list: (key: GeoKey, parentId?: number, countryId?: number) =>
    [...geoKeys.all, key, parentId ?? 'all', countryId ?? 'all'] as const,
};

export function useGeoList(
  key: GeoKey,
  parentId?: number,
  enabled = true,
  countryId?: number,
) {
  return useQuery({
    queryKey: geoKeys.list(key, parentId, countryId),
    queryFn: () => fetchGeoList(key, parentId, countryId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateGeo() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: geoKeys.all });
}

export function useCreateGeoItem(key: GeoKey) {
  const invalidate = useInvalidateGeo();
  return useMutation({
    mutationFn: (payload: GeoPayload) => createGeoItem(key, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateGeoItem(key: GeoKey) {
  const invalidate = useInvalidateGeo();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<GeoPayload> }) =>
      updateGeoItem(key, id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteGeoItem(key: GeoKey) {
  const invalidate = useInvalidateGeo();
  return useMutation({
    mutationFn: (id: number) => deleteGeoItem(key, id),
    onSuccess: invalidate,
  });
}
