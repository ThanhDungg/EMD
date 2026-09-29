// entities/droplist/api — 1 endpoint chung cho mọi bảng droplist.
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';
import type { DroplistItem, DroplistKey } from './model';

function token(): string | undefined {
  return getToken() ?? undefined;
}

export async function fetchDroplist(key: DroplistKey): Promise<DroplistItem[]> {
  return apiClient.get<DroplistItem[]>(`/workflow/droplists/${key}`, token());
}

export async function createDroplist(
  key: DroplistKey,
  payload: { name: string; code?: string; shortName?: string },
): Promise<DroplistItem> {
  return apiClient.post<DroplistItem>(
    `/workflow/droplists/${key}`,
    payload,
    token(),
  );
}

export async function updateDroplist(
  key: DroplistKey,
  id: number,
  payload: { name?: string; code?: string; shortName?: string },
): Promise<DroplistItem> {
  return apiClient.patch<DroplistItem>(
    `/workflow/droplists/${key}/${id}`,
    payload,
    token(),
  );
}

export async function deleteDroplist(
  key: DroplistKey,
  id: number,
): Promise<unknown> {
  return apiClient.remove(`/workflow/droplists/${key}/${id}`, token());
}
