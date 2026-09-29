// entities/investor — chủ đầu tư (khai báo master data).
// Chủ đầu tư thuộc 1 chủ đầu tư cha (droplist `investorGroup`); hồ sơ dự án vẫn
// chọn chủ đầu tư qua droplist key `investor` (id + name).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { droplistKeys } from '@/entities/droplist';
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';

export interface InvestorGroupRef {
  id: number;
  code?: string | null;
  name: string;
  shortName?: string | null;
}

export interface Investor {
  id: number;
  code?: string | null;
  name: string;
  investorGroupId?: number | null;
  investorGroup?: InvestorGroupRef | null;
  taxCode?: string | null;
  legalRepresentative?: string | null;
  countryId?: number | null;
  country?: { id: number; name: string } | null;
  provinceId?: number | null;
  province?: { id: number; name: string } | null;
  wardId?: number | null;
  ward?: { id: number; name: string } | null;
  address?: string | null;
  email?: string | null;
  hotline?: string | null;
  notes?: string | null;
}

export interface InvestorPayload {
  code: string;
  name: string;
  investorGroupId?: number | null;
  taxCode?: string;
  legalRepresentative?: string;
  countryId?: number | null;
  provinceId?: number | null;
  wardId?: number | null;
  address?: string;
  email?: string;
  hotline?: string;
  notes?: string;
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchInvestors(): Promise<Investor[]> {
  return apiClient.get<Investor[]>('/workflow/investors', token());
}

export async function fetchInvestor(id: number): Promise<Investor> {
  return apiClient.get<Investor>(`/workflow/investors/${id}`, token());
}

export async function createInvestor(
  payload: InvestorPayload,
): Promise<Investor> {
  return apiClient.post<Investor>('/workflow/investors', payload, token());
}

export async function updateInvestor(
  id: number,
  payload: Partial<InvestorPayload>,
): Promise<Investor> {
  return apiClient.patch<Investor>(
    `/workflow/investors/${id}`,
    payload,
    token(),
  );
}

export async function deleteInvestor(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/investors/${id}`, token());
}

export const investorKeys = {
  all: ['investor'] as const,
  list: () => [...investorKeys.all, 'list'] as const,
  detail: (id: number) => [...investorKeys.all, 'detail', id] as const,
};

export function useInvestors() {
  return useQuery({
    queryKey: investorKeys.list(),
    queryFn: fetchInvestors,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvestor(id: number | undefined) {
  return useQuery({
    queryKey: investorKeys.detail(id ?? 0),
    queryFn: () => fetchInvestor(id as number),
    enabled: id !== undefined,
  });
}

// Sửa/xoá chủ đầu tư cũng ảnh hưởng droplist chọn chủ đầu tư của hồ sơ dự án.
function useInvalidateInvestors() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: investorKeys.all });
    queryClient.invalidateQueries({ queryKey: droplistKeys.all });
  };
}

export function useCreateInvestor() {
  const invalidate = useInvalidateInvestors();
  return useMutation({
    mutationFn: (payload: InvestorPayload) => createInvestor(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateInvestor() {
  const invalidate = useInvalidateInvestors();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<InvestorPayload>;
    }) => updateInvestor(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteInvestor() {
  const invalidate = useInvalidateInvestors();
  return useMutation({
    mutationFn: (id: number) => deleteInvestor(id),
    onSuccess: invalidate,
  });
}
