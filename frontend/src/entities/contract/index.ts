// entities/contract — hợp đồng (khai báo master data).
// Hợp đồng thuộc NHIỀU dự án (quan hệ nhiều-nhiều): API nhận `siteIds` và
// backend lưu vào bảng contract_sites. Kèm bảng đường dẫn tài liệu.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';

export type ContractType = 'INPUT' | 'OUTPUT';
export type ContractTermType = 'TERM' | 'OPEN_ENDED';

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  INPUT: 'Hợp đồng đầu vào',
  OUTPUT: 'Hợp đồng đầu ra',
};

export const CONTRACT_TERM_LABEL: Record<ContractTermType, string> = {
  TERM: 'Có thời hạn',
  OPEN_ENDED: 'Không thời hạn',
};

export interface ContractSiteLink {
  id: number;
  siteId: number;
  site?: { id: number; code?: string | null; name: string } | null;
}

/** Đường dẫn tài liệu — sau khi lưu client hiển thị bằng thẻ <a>. */
export interface ContractDocument {
  id: number;
  name: string;
  path: string;
  sortOrder: number;
}

export interface Contract {
  id: number;
  code: string;
  companyName: string;
  typeName: string;
  contractType: ContractType;
  serviceTypeId?: number | null;
  serviceType?: { id: number; name: string } | null;
  startDate?: string | null;
  endDate?: string | null;
  termType: ContractTermType;
  notes?: string | null;
  siteLinks: ContractSiteLink[];
  documents: ContractDocument[];
}

export interface ContractPayload {
  code: string;
  companyName: string;
  typeName: string;
  contractType: ContractType;
  serviceTypeId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  termType: ContractTermType;
  notes?: string;
  siteIds?: number[];
}

export interface ContractDocumentPayload {
  name: string;
  path: string;
  sortOrder?: number;
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchContracts(): Promise<Contract[]> {
  return apiClient.get<Contract[]>('/workflow/contracts', token());
}

export async function fetchContract(id: number): Promise<Contract> {
  return apiClient.get<Contract>(`/workflow/contracts/${id}`, token());
}

export async function createContract(
  payload: ContractPayload,
): Promise<Contract> {
  return apiClient.post<Contract>('/workflow/contracts', payload, token());
}

export async function updateContract(
  id: number,
  payload: Partial<ContractPayload>,
): Promise<Contract> {
  return apiClient.patch<Contract>(
    `/workflow/contracts/${id}`,
    payload,
    token(),
  );
}

export async function deleteContract(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/contracts/${id}`, token());
}

export async function createContractDocument(
  contractId: number,
  payload: ContractDocumentPayload,
): Promise<ContractDocument> {
  return apiClient.post<ContractDocument>(
    `/workflow/contracts/${contractId}/documents`,
    payload,
    token(),
  );
}

export async function updateContractDocument(
  id: number,
  payload: Partial<ContractDocumentPayload>,
): Promise<ContractDocument> {
  return apiClient.patch<ContractDocument>(
    `/workflow/contract-documents/${id}`,
    payload,
    token(),
  );
}

export async function deleteContractDocument(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/contract-documents/${id}`, token());
}

export const contractKeys = {
  all: ['contract'] as const,
  list: () => [...contractKeys.all, 'list'] as const,
  detail: (id: number) => [...contractKeys.all, 'detail', id] as const,
};

export function useContracts() {
  return useQuery({
    queryKey: contractKeys.list(),
    queryFn: fetchContracts,
    staleTime: 5 * 60 * 1000,
  });
}

export function useContract(id: number | undefined) {
  return useQuery({
    queryKey: contractKeys.detail(id ?? 0),
    queryFn: () => fetchContract(id as number),
    enabled: id !== undefined,
  });
}

function useInvalidateContracts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: contractKeys.all });
}

export function useCreateContract() {
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: (payload: ContractPayload) => createContract(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateContract() {
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ContractPayload>;
    }) => updateContract(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteContract() {
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: (id: number) => deleteContract(id),
    onSuccess: invalidate,
  });
}

export function useCreateContractDocument(contractId: number) {
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: (payload: ContractDocumentPayload) =>
      createContractDocument(contractId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateContractDocument() {
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ContractDocumentPayload>;
    }) => updateContractDocument(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteContractDocument() {
  const invalidate = useInvalidateContracts();
  return useMutation({
    mutationFn: (id: number) => deleteContractDocument(id),
    onSuccess: invalidate,
  });
}
