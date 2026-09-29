// entities/site — hồ sơ dự án (site) + 5 bảng con theo dự án.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';

function token(): string | undefined {
  return getToken() ?? undefined;
}

// ---------------- Hồ sơ dự án ----------------

export type SiteOperationStatus = 'ACTIVE' | 'SUSPENDED';
export type SiteRentalStatus = 'RENTED' | 'VACANT' | 'PREPARING';
export type SiteManagementStatus = 'MANAGED' | 'NOT_MANAGED' | 'SUSPENDED';

export const SITE_OPERATION_STATUS_LABEL: Record<SiteOperationStatus, string> =
  {
    ACTIVE: 'Đang hoạt động',
    SUSPENDED: 'Ngưng hoạt động',
  };

export const SITE_RENTAL_STATUS_LABEL: Record<SiteRentalStatus, string> = {
  RENTED: 'Đang cho thuê',
  VACANT: 'Trống',
  PREPARING: 'Chuẩn bị cho thuê',
};

export const SITE_MANAGEMENT_STATUS_LABEL: Record<
  SiteManagementStatus,
  string
> = {
  MANAGED: 'Đang quản lý',
  NOT_MANAGED: 'Chưa quản lý',
  SUSPENDED: 'Ngưng quản lý',
};

export interface SiteRef {
  id: number;
  code?: string | null;
  name: string;
}

export interface SiteProfile extends SiteRef {
  lot?: string | null;
  stage?: string | null;
  address?: string | null;
  /** Toạ độ "lat,lng" cách nhau bằng ";" — client tự vẽ bản đồ. */
  geoPoints?: string | null;
  countryId?: number | null;
  country?: SiteRef | null;
  regionId?: number | null;
  region?: SiteRef | null;
  provinceId?: number | null;
  province?: SiteRef | null;
  wardId?: number | null;
  ward?: SiteRef | null;
  investorId?: number | null;
  investor?: SiteRef | null;
  floors?: number | null;
  serviceTypeId?: number | null;
  serviceType?: SiteRef | null;
  serviceId?: number | null;
  service?: SiteRef | null;
  landArea?: string | number | null;
  gfaArea?: string | number | null;
  glaArea?: string | number | null;
  roadArea?: string | number | null;
  leasedArea?: string | number | null;
  greenArea?: string | number | null;
  occupancyRate?: string | number | null;
  receivedAt?: string | null;
  operationStatus?: SiteOperationStatus | null;
  rentalStatus?: SiteRentalStatus | null;
  managementStatus?: SiteManagementStatus | null;
  notes?: string | null;
  manager?: {
    id: number;
    accountName: string;
    fullName?: string | null;
    email: string;
  } | null;
}

export interface SitePayload {
  name: string;
  code?: string;
  lot?: string;
  stage?: string;
  address?: string;
  geoPoints?: string;
  countryId?: number | null;
  regionId?: number | null;
  provinceId?: number | null;
  wardId?: number | null;
  investorId?: number | null;
  floors?: number | null;
  serviceTypeId?: number | null;
  serviceId?: number | null;
  landArea?: number | null;
  gfaArea?: number | null;
  glaArea?: number | null;
  roadArea?: number | null;
  leasedArea?: number | null;
  greenArea?: number | null;
  occupancyRate?: number | null;
  receivedAt?: string;
  operationStatus?: SiteOperationStatus | null;
  rentalStatus?: SiteRentalStatus | null;
  managementStatus?: SiteManagementStatus | null;
  notes?: string;
  managerId?: number | null;
}

export async function fetchSites(): Promise<SiteProfile[]> {
  return apiClient.get<SiteProfile[]>('/workflow/sites', token());
}

export async function fetchSiteProfile(id: number): Promise<SiteProfile> {
  return apiClient.get<SiteProfile>(`/workflow/sites/${id}`, token());
}

export async function updateSiteProfile(
  id: number,
  payload: Partial<SitePayload>,
): Promise<SiteProfile> {
  return apiClient.patch<SiteProfile>(`/workflow/sites/${id}`, payload, token());
}

export async function createSite(payload: SitePayload): Promise<SiteProfile> {
  return apiClient.post<SiteProfile>('/workflow/sites', payload, token());
}

export async function deleteSite(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/sites/${id}`, token());
}

// ---------------- 5 bảng con theo dự án ----------------

export type SiteDetailKind =
  | 'members'
  | 'serviceProviders'
  | 'contractors'
  | 'partnerContacts'
  | 'units';

export const SITE_DETAIL_LABEL: Record<SiteDetailKind, string> = {
  members: 'Nhân viên của dự án',
  serviceProviders: 'Nhà cung cấp dịch vụ',
  contractors: 'Nhà thầu',
  partnerContacts: 'Thông tin liên lạc đối tác',
  units: 'Unit',
};

/** Nhân viên — thông tin lấy từ users (tên/email/sđt/chức vụ). */
export interface SiteMemberRow {
  id: number;
  user: {
    id: number;
    accountName: string;
    fullName?: string | null;
    email: string;
    phone?: string | null;
    internalPhone?: string | null;
    position?: { name: string } | null;
  };
}

/** Nhà cung cấp / nhà thầu / liên lạc đối tác — cùng shape. */
export interface SitePartnerRow {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface SiteUnitRow {
  id: number;
  code: string;
  name: string;
  area?: string | number | null;
  status?: string | null;
  notes?: string | null;
}

export type SiteDetailRow =
  | SiteMemberRow
  | SitePartnerRow
  | SiteUnitRow;

export interface SiteDetailPayload {
  siteId: number;
  userId?: number;
  name?: string;
  email?: string;
  phone?: string;
  code?: string;
  area?: number | null;
  status?: string;
  notes?: string;
}

export async function fetchSiteDetails<T>(
  kind: SiteDetailKind,
  siteId: number,
): Promise<T[]> {
  return apiClient.get<T[]>(
    `/workflow/site-details/${kind}?siteId=${siteId}`,
    token(),
  );
}

export async function createSiteDetail(
  kind: SiteDetailKind,
  payload: SiteDetailPayload,
): Promise<SiteDetailRow> {
  return apiClient.post<SiteDetailRow>(
    `/workflow/site-details/${kind}`,
    payload,
    token(),
  );
}

export async function updateSiteDetail(
  kind: SiteDetailKind,
  id: number,
  payload: Partial<SiteDetailPayload>,
): Promise<SiteDetailRow> {
  return apiClient.patch<SiteDetailRow>(
    `/workflow/site-details/${kind}/${id}`,
    payload,
    token(),
  );
}

export async function deleteSiteDetail(
  kind: SiteDetailKind,
  id: number,
): Promise<unknown> {
  return apiClient.remove(`/workflow/site-details/${kind}/${id}`, token());
}

// ---------------- Query hooks ----------------

export const siteKeys = {
  all: ['site-profile'] as const,
  list: () => [...siteKeys.all, 'list'] as const,
  profile: (id: number) => [...siteKeys.all, 'profile', id] as const,
  detail: (kind: SiteDetailKind, siteId: number) =>
    [...siteKeys.all, 'detail', kind, siteId] as const,
};

export function useSiteProfiles() {
  return useQuery({
    queryKey: siteKeys.list(),
    queryFn: fetchSites,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSiteProfile(id: number | undefined) {
  return useQuery({
    queryKey: siteKeys.profile(id ?? 0),
    queryFn: () => fetchSiteProfile(id as number),
    enabled: id !== undefined,
  });
}

export function useUpdateSiteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<SitePayload> }) =>
      updateSiteProfile(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
  });
}

export function useCreateSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SitePayload) => createSite(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSite(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
  });
}

export function useSiteDetails<T>(
  kind: SiteDetailKind,
  siteId: number | undefined,
) {
  return useQuery({
    queryKey: siteKeys.detail(kind, siteId ?? 0),
    queryFn: () => fetchSiteDetails<T>(kind, siteId as number),
    enabled: siteId !== undefined,
  });
}

export function useCreateSiteDetail(kind: SiteDetailKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SiteDetailPayload) => createSiteDetail(kind, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
  });
}

export function useUpdateSiteDetail(kind: SiteDetailKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<SiteDetailPayload>;
    }) => updateSiteDetail(kind, id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
  });
}

export function useDeleteSiteDetail(kind: SiteDetailKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSiteDetail(kind, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
  });
}
