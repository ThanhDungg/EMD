// entities/customer — khách hàng thuộc danh mục kiểm tra năng lượng.
// Khách hàng thuộc NHIỀU dự án (quan hệ nhiều-nhiều): API nhận `siteIds` và
// backend lưu vào bảng customer_sites.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';

export type CustomerStatus = 'ACTIVE' | 'INACTIVE';

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngưng hoạt động',
};

export interface CustomerSiteLink {
  id: number;
  siteId: number;
  site?: { id: number; code?: string | null; name: string } | null;
}

export interface Customer {
  id: number;
  code: string;
  name: string;
  shortName?: string | null;
  taxCode?: string | null;
  countryId?: number | null;
  country?: { id: number; name: string } | null;
  provinceId?: number | null;
  province?: { id: number; name: string } | null;
  wardId?: number | null;
  ward?: { id: number; name: string } | null;
  address?: string | null;
  hotline?: string | null;
  email?: string | null;
  status: CustomerStatus;
  factoryId?: number | null;
  factory?: { id: number; name: string } | null;
  notes?: string | null;
  /** Các dự án (site) mà khách hàng đang ở. */
  siteLinks: CustomerSiteLink[];
}

export interface CustomerPayload {
  code: string;
  name: string;
  shortName?: string;
  taxCode?: string;
  countryId?: number | null;
  provinceId?: number | null;
  wardId?: number | null;
  address?: string;
  hotline?: string;
  email?: string;
  status?: CustomerStatus;
  factoryId?: number | null;
  notes?: string;
  /** Danh sách id dự án — backend tách ra lưu bảng nối customer_sites. */
  siteIds?: number[];
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchCustomers(): Promise<Customer[]> {
  return apiClient.get<Customer[]>('/workflow/customers', token());
}

export async function fetchCustomer(id: number): Promise<Customer> {
  return apiClient.get<Customer>(`/workflow/customers/${id}`, token());
}

export async function createCustomer(
  payload: CustomerPayload,
): Promise<Customer> {
  return apiClient.post<Customer>('/workflow/customers', payload, token());
}

export async function updateCustomer(
  id: number,
  payload: Partial<CustomerPayload>,
): Promise<Customer> {
  return apiClient.patch<Customer>(
    `/workflow/customers/${id}`,
    payload,
    token(),
  );
}

export async function deleteCustomer(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/customers/${id}`, token());
}

export const customerKeys = {
  all: ['customer'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
  detail: (id: number) => [...customerKeys.all, 'detail', id] as const,
};

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: fetchCustomers,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomer(id: number | undefined) {
  return useQuery({
    queryKey: customerKeys.detail(id ?? 0),
    queryFn: () => fetchCustomer(id as number),
    enabled: id !== undefined,
  });
}

function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: customerKeys.all });
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (payload: CustomerPayload) => createCustomer(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<CustomerPayload>;
    }) => updateCustomer(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (id: number) => deleteCustomer(id),
    onSuccess: invalidate,
  });
}
