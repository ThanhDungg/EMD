// entities/group — nhóm người dùng: tên, mã, quyền, thành viên.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, fetchBlob } from '@/shared/api';
import { getToken } from '@/shared/auth';
import {
  ASSET_IMPORT_ACCEPT,
  ASSET_IMPORT_MAX_SIZE,
  parseImportError,
} from '@/entities/asset';

export interface GroupPermission {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

export interface GroupMember {
  id: number;
  accountName: string;
  email: string;
  fullName?: string | null;
}

export interface UserGroup {
  id: number;
  code?: string | null;
  name: string;
  image?: string | null;
  isDeleted: boolean;
  permissions: GroupPermission[];
  users: GroupMember[];
}

export interface GroupPayload {
  code?: string;
  name: string;
  permissionIds?: number[];
  userIds?: number[];
}

export interface GroupImportResult {
  total: number;
  created: number;
  updated: number;
}

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchGroups(): Promise<UserGroup[]> {
  return apiClient.get<UserGroup[]>('/groups', token());
}

export async function fetchPermissions(): Promise<GroupPermission[]> {
  return apiClient.get<GroupPermission[]>('/permissions', token());
}

export async function createGroup(payload: GroupPayload): Promise<UserGroup> {
  return apiClient.post<UserGroup>('/groups', payload, token());
}

export async function updateGroup(
  id: number,
  payload: Partial<GroupPayload>,
): Promise<UserGroup> {
  return apiClient.patch<UserGroup>(`/groups/${id}`, payload, token());
}

export async function deleteGroup(id: number): Promise<unknown> {
  return apiClient.remove(`/groups/${id}`, token());
}

export async function restoreGroup(id: number): Promise<unknown> {
  return apiClient.post(`/groups/${id}/restore`, undefined, token());
}

/** Tải file mẫu nhập nhóm. */
export async function downloadGroupImportTemplate(): Promise<Blob> {
  return fetchBlob('/groups/import/template', token());
}

/** Nhập nhóm từ file .xlsx. Ném lỗi parse được nếu file có lỗi. */
export async function importGroupsFromFile(
  file: File,
): Promise<GroupImportResult> {
  const form = new FormData();
  form.append('file', file);
  try {
    return await apiClient.upload<GroupImportResult>(
      '/groups/import',
      form,
      token(),
    );
  } catch (error) {
    throw parseImportError(error);
  }
}

export const groupKeys = {
  all: ['user-group'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  permissions: () => [...groupKeys.all, 'permissions'] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: fetchGroups,
    staleTime: 60 * 1000,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: groupKeys.permissions(),
    queryFn: fetchPermissions,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateGroups() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: groupKeys.all });
  };
}

export function useCreateGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<GroupPayload>;
    }) => updateGroup(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => invalidate(),
  });
}

export function useRestoreGroup() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: restoreGroup,
    onSuccess: () => invalidate(),
  });
}

export function useImportGroups() {
  const invalidate = useInvalidateGroups();
  return useMutation({
    mutationFn: importGroupsFromFile,
    onSuccess: () => invalidate(),
  });
}

export { ASSET_IMPORT_ACCEPT, ASSET_IMPORT_MAX_SIZE };
