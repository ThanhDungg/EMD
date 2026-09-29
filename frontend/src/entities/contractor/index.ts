// entities/contractor — nhà thầu (khai báo master data).
// Khác với bảng con `site_contractors` (nhà thầu của 1 dự án): đây là danh mục
// nhà thầu dùng chung, có loại nhà thầu + dịch vụ cung cấp + địa lý.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { droplistKeys } from '@/entities/droplist';
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';

export type ContractorStatus = 'ACTIVE' | 'INACTIVE';

export const CONTRACTOR_STATUS_LABEL: Record<ContractorStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngưng hoạt động',
};

export interface Contractor {
  id: number;
  code?: string | null;
  name: string;
  contractorTypeId?: number | null;
  contractorType?: { id: number; code?: string | null; name: string } | null;
  serviceId?: number | null;
  service?: { id: number; name: string } | null;
  taxCode?: string | null;
  hotline?: string | null;
  countryId?: number | null;
  country?: { id: number; name: string } | null;
  provinceId?: number | null;
  province?: { id: number; name: string } | null;
  wardId?: number | null;
  ward?: { id: number; name: string } | null;
  address?: string | null;
  email?: string | null;
  status: ContractorStatus;
  notes?: string | null;
}

export interface ContractorPayload {
  code: string;
  name: string;
  contractorTypeId?: number | null;
  serviceId?: number | null;
  taxCode?: string;
  hotline?: string;
  countryId?: number | null;
  provinceId?: number | null;
  wardId?: number | null;
  address?: string;
  email?: string;
  status?: ContractorStatus;
  notes?: string;
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchContractors(): Promise<Contractor[]> {
  return apiClient.get<Contractor[]>('/workflow/contractors', token());
}

export async function fetchContractor(id: number): Promise<Contractor> {
  return apiClient.get<Contractor>(`/workflow/contractors/${id}`, token());
}

export async function createContractor(
  payload: ContractorPayload,
): Promise<Contractor> {
  return apiClient.post<Contractor>('/workflow/contractors', payload, token());
}

export async function updateContractor(
  id: number,
  payload: Partial<ContractorPayload>,
): Promise<Contractor> {
  return apiClient.patch<Contractor>(
    `/workflow/contractors/${id}`,
    payload,
    token(),
  );
}

export async function deleteContractor(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/contractors/${id}`, token());
}

export const contractorKeys = {
  all: ['contractor'] as const,
  list: () => [...contractorKeys.all, 'list'] as const,
  detail: (id: number) => [...contractorKeys.all, 'detail', id] as const,
};

export function useContractors() {
  return useQuery({
    queryKey: contractorKeys.list(),
    queryFn: fetchContractors,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContractor(id: number | undefined) {
  return useQuery({
    queryKey: contractorKeys.detail(id ?? 0),
    queryFn: () => fetchContractor(id as number),
    enabled: id !== undefined,
  });
}

function useInvalidateContractors() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: contractorKeys.all });
    queryClient.invalidateQueries({ queryKey: droplistKeys.all });
  };
}

export function useCreateContractor() {
  const invalidate = useInvalidateContractors();
  return useMutation({
    mutationFn: (payload: ContractorPayload) => createContractor(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateContractor() {
  const invalidate = useInvalidateContractors();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ContractorPayload>;
    }) => updateContractor(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteContractor() {
  const invalidate = useInvalidateContractors();
  return useMutation({
    mutationFn: (id: number) => deleteContractor(id),
    onSuccess: invalidate,
  });
}
