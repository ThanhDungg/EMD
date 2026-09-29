// entities/work/queries — TanStack Query hooks cho domain công việc.
// Query key tập trung ở workKeys để mutation invalidate đúng chỗ.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChecklistItem,
  createWork,
  deleteChecklistItem,
  deleteWork,
  fetchChecklistTemplates,
  fetchChecklistTree,
  fetchDirectory,
  fetchEnergyChecks,
  fetchIncidentTypes,
  fetchSites,
  fetchStatusesByCategory,
  fetchWorkById,
  fetchWorkHistories,
  fetchWorks,
  fetchWorksPage,
  restoreWork,
  saveIncidentDetail,
  updateChecklistItem,
  updateWork,
} from './api';
import type {
  CreateChecklistItemPayload,
  CreateWorkPayload,
  FetchWorksParams,
  SaveIncidentDetailPayload,
  UpdateWorkPayload,
} from './api';

export const workKeys = {
  all: ['works'] as const,
  page: (params: FetchWorksParams) =>
    [...workKeys.all, 'page', params] as const,
  list: (params: FetchWorksParams) =>
    [...workKeys.all, 'list', params] as const,
  detail: (id: number) => [...workKeys.all, 'detail', id] as const,
  checklist: (workId: number) =>
    [...workKeys.all, 'checklist', workId] as const,
  checklistTemplates: () =>
    [...workKeys.all, 'checklist', 'templates'] as const,
  energy: (workId: number) => [...workKeys.all, 'energy', workId] as const,
  history: (workId: number) => [...workKeys.all, 'history', workId] as const,
  statuses: (categoryId: number) =>
    [...workKeys.all, 'statuses', categoryId] as const,
  sites: () => [...workKeys.all, 'sites'] as const,
  directory: () => [...workKeys.all, 'directory'] as const,
  incidentTypes: () => [...workKeys.all, 'incident-types'] as const,
};

// Danh sách dạng trang (bảng theo loại việc). params phải memo ở caller.
export function useWorksPage(params: FetchWorksParams, enabled = true) {
  return useQuery({
    queryKey: workKeys.page(params),
    queryFn: () => fetchWorksPage(params),
    enabled,
  });
}

// Danh sách dạng mảng gọn (trang chủ, scope, Việc lặp). params phải memo ở caller.
export function useWorks(params: FetchWorksParams, enabled = true) {
  return useQuery({
    queryKey: workKeys.list(params),
    queryFn: () => fetchWorks(params),
    enabled,
  });
}

export function useWorkDetail(id: number) {
  return useQuery({
    queryKey: workKeys.detail(id),
    queryFn: () => fetchWorkById(id),
    enabled: Number.isFinite(id),
  });
}

export function useChecklistTree(workId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: workKeys.checklist(workId ?? 0),
    queryFn: () => fetchChecklistTree(workId as number),
    enabled: enabled && workId !== undefined,
  });
}

// Thư viện mẫu checklist (pick mẫu trong modal tạo việc Checklist).
export function useChecklistTemplates(enabled = true) {
  return useQuery({
    queryKey: workKeys.checklistTemplates(),
    queryFn: fetchChecklistTemplates,
    enabled,
  });
}

export function useEnergyChecks(workId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: workKeys.energy(workId ?? 0),
    queryFn: () => fetchEnergyChecks(workId as number),
    enabled: enabled && workId !== undefined,
  });
}

export function useWorkHistories(workId: number | undefined) {
  return useQuery({
    queryKey: workKeys.history(workId ?? 0),
    queryFn: () => fetchWorkHistories(workId as number),
    enabled: workId !== undefined,
  });
}

export function useStatusesByCategory(categoryId: number | undefined) {
  return useQuery({
    queryKey: workKeys.statuses(categoryId ?? 0),
    queryFn: () => fetchStatusesByCategory(categoryId as number),
    enabled: categoryId !== undefined,
  });
}

export function useSites() {
  return useQuery({ queryKey: workKeys.sites(), queryFn: fetchSites });
}

export function useDirectory() {
  return useQuery({ queryKey: workKeys.directory(), queryFn: fetchDirectory });
}

export function useIncidentTypes(enabled = true) {
  return useQuery({
    queryKey: workKeys.incidentTypes(),
    queryFn: fetchIncidentTypes,
    enabled,
  });
}

export function useUpdateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateWorkPayload }) =>
      updateWork(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(workKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: workKeys.all });
    },
  });
}

export function useDeleteWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWork(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.all }),
  });
}

// Mở lại công việc đã xoá mềm (nút Khôi phục ở thùng rác).
export function useRestoreWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreWork(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.all }),
  });
}

// Lưu chi tiết sự cố (PUT upsert theo work) — dùng cho form sửa inline
// ở trang chi tiết sự cố.
export function useSaveIncidentDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workId,
      payload,
    }: {
      workId: number;
      payload: SaveIncidentDetailPayload;
    }) => saveIncidentDetail(workId, payload),
    onSuccess: (_result, { workId }) => {
      queryClient.invalidateQueries({ queryKey: workKeys.detail(workId) });
      queryClient.invalidateQueries({ queryKey: workKeys.all });
    },
  });
}

// --- Mẫu checklist (node workId null) — quản lý ở module Ứng dụng ---
// Mọi thay đổi (mẫu / nhóm / nội dung con) đều invalidate lại thư viện mẫu
// để màn quản lý và dialog chọn mẫu ở modal Tạo việc cập nhật theo.
function useInvalidateChecklistTemplates() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: workKeys.checklistTemplates() });
}

export function useCreateChecklistItem() {
  const invalidate = useInvalidateChecklistTemplates();
  return useMutation({
    mutationFn: (payload: CreateChecklistItemPayload) =>
      createChecklistItem(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistItem() {
  const invalidate = useInvalidateChecklistTemplates();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<CreateChecklistItemPayload>;
    }) => updateChecklistItem(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistItem() {
  const invalidate = useInvalidateChecklistTemplates();
  return useMutation({
    mutationFn: (id: number) => deleteChecklistItem(id),
    onSuccess: invalidate,
  });
}

export function useCreateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkPayload) => createWork(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.all }),
  });
}
