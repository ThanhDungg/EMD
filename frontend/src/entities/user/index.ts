// entities/user — tài khoản: nhân viên (isInvestor=false) và
// tài khoản chủ đầu tư (isInvestor=true). Hai tab dùng chung API, khác
// query param isInvestor.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, fetchBlob } from '@/shared/api';
import { getToken } from '@/shared/auth';
import { parseImportError } from '@/entities/asset';
import { ASSET_IMPORT_ACCEPT, ASSET_IMPORT_MAX_SIZE } from '@/entities/asset';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export const GENDER_LABEL: Record<Gender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

export interface UserRef {
  id: number;
  code?: string | null;
  name: string;
}

export interface AccountUser {
  id: number;
  accountName: string;
  email: string;
  fullName?: string | null;
  gender?: Gender | null;
  birthday?: string | null;
  address?: string | null;
  internalPhone?: string | null;
  phone?: string | null;
  hireDate?: string | null;
  userLevelId?: number | null;
  userLevel?: UserRef | null;
  avatarPath?: string | null;
  signaturePath?: string | null;
  positionId?: number | null;
  position?: UserRef | null;
  departmentId?: number | null;
  department?: UserRef | null;
  coDepartmentId?: number | null;
  coDepartment?: UserRef | null;
  statusId?: number | null;
  status?: UserRef | null;
  managerId?: number | null;
  manager?: {
    id: number;
    accountName: string;
    fullName?: string | null;
    email: string;
  } | null;
  groups?: Array<{
    id: number;
    code?: string | null;
    name: string;
  }>;
  isDeleted: boolean;
  isInvestor: boolean;
}

export interface UserPayload {
  accountName: string;
  email: string;
  password?: string;
  fullName?: string;
  gender?: Gender | null;
  birthday?: string | null;
  address?: string;
  internalPhone?: string;
  phone?: string;
  hireDate?: string | null;
  userLevelId?: number | null;
  positionId?: number | null;
  departmentId?: number | null;
  coDepartmentId?: number | null;
  statusId?: number | null;
  managerId?: number | null;
  groupIds?: number[];
  isInvestor?: boolean;
}

export interface UserReferences {
  positions: UserRef[];
  userLevels: UserRef[];
  departments: UserRef[];
  statuses: UserRef[];
}

export interface UserImportResult {
  total: number;
  created: number;
  updated: number;
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

function investorQuery(isInvestor: boolean): string {
  return `?isInvestor=${isInvestor ? 'true' : 'false'}`;
}

export async function fetchUsers(isInvestor: boolean): Promise<AccountUser[]> {
  return apiClient.get<AccountUser[]>(`/users${investorQuery(isInvestor)}`, token());
}

export async function fetchUserReferences(): Promise<UserReferences> {
  return apiClient.get<UserReferences>('/users/references', token());
}

export async function createUser(payload: UserPayload): Promise<AccountUser> {
  return apiClient.post<AccountUser>('/users', payload, token());
}

export async function updateUser(
  id: number,
  payload: Partial<UserPayload>,
): Promise<AccountUser> {
  return apiClient.patch<AccountUser>(`/users/${id}`, payload, token());
}

export async function deleteUser(id: number): Promise<unknown> {
  return apiClient.remove(`/users/${id}`, token());
}

export async function restoreUser(id: number): Promise<unknown> {
  return apiClient.post(`/users/${id}/restore`, undefined, token());
}

/** Tải file mẫu nhập tài khoản (theo tab nhân viên / chủ đầu tư). */
export async function downloadUserImportTemplate(
  isInvestor: boolean,
): Promise<Blob> {
  return fetchBlob(`/users/import/template${investorQuery(isInvestor)}`, token());
}

/** Nhập tài khoản từ file .xlsx. Ném lỗi parse được nếu file có lỗi. */
export async function importUsersFromFile(
  file: File,
  isInvestor: boolean,
): Promise<UserImportResult> {
  const form = new FormData();
  form.append('file', file);
  try {
    return await apiClient.upload<UserImportResult>(
      `/users/import${investorQuery(isInvestor)}`,
      form,
      token(),
    );
  } catch (error) {
    throw parseImportError(error);
  }
}

export const userKeys = {
  all: ['user'] as const,
  list: (isInvestor: boolean) =>
    [...userKeys.all, 'list', isInvestor ? 'investor' : 'employee'] as const,
  references: () => [...userKeys.all, 'references'] as const,
};

export function useUsers(isInvestor: boolean) {
  return useQuery({
    queryKey: userKeys.list(isInvestor),
    queryFn: () => fetchUsers(isInvestor),
    staleTime: 60 * 1000,
  });
}

export function useUserReferences() {
  return useQuery({
    queryKey: userKeys.references(),
    queryFn: fetchUserReferences,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: userKeys.all });
  };
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UserPayload> }) =>
      updateUser(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => invalidate(),
  });
}

export function useRestoreUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: restoreUser,
    onSuccess: () => invalidate(),
  });
}

export function useImportUsers(isInvestor: boolean) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (file: File) => importUsersFromFile(file, isInvestor),
    onSuccess: () => invalidate(),
  });
}

/** Quyền của chính mình (để ẩn/hiện menu theo vai trò). */
export async function fetchMyPermissions(): Promise<string[]> {
  const me = await apiClient.get<{ permissionCodes?: string[] }>(
    '/auth/me',
    token(),
  );
  return me.permissionCodes ?? [];
}

export function useMyPermissions() {
  return useQuery({
    queryKey: ['session', 'permissions'] as const,
    queryFn: fetchMyPermissions,
    staleTime: 5 * 60 * 1000,
  });
}

export { ASSET_IMPORT_ACCEPT, ASSET_IMPORT_MAX_SIZE };
