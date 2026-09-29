// pages/home/api/homeQueries — TanStack Query hooks cho trang chủ + Việc lặp.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workKeys } from '@/entities/work';
import {
  createRecurrence,
  deleteRecurrence,
  fetchCategories,
  fetchCompanyProfile,
  fetchMe,
  fetchModules,
  fetchRecurrences,
  generateRecurrence,
  toggleRecurrence,
} from './home';
import type { CreateRecurrencePayload } from './home';
import type { WorkRecurrence } from '../model/home';

export const homeKeys = {
  all: ['home'] as const,
  me: () => [...homeKeys.all, 'me'] as const,
  modules: () => [...homeKeys.all, 'modules'] as const,
  categories: () => [...homeKeys.all, 'categories'] as const,
  companyProfile: () => [...homeKeys.all, 'company-profile'] as const,
  recurrences: (categoryId: number) =>
    [...homeKeys.all, 'recurrences', categoryId] as const,
};

export function useMe() {
  return useQuery({
    queryKey: homeKeys.me(),
    queryFn: () => fetchMe().catch(() => null),
  });
}

export function useModules() {
  return useQuery({ queryKey: homeKeys.modules(), queryFn: fetchModules });
}

export function useCategories() {
  return useQuery({
    queryKey: homeKeys.categories(),
    queryFn: fetchCategories,
  });
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: homeKeys.companyProfile(),
    queryFn: fetchCompanyProfile,
  });
}

export function useRecurrences(categoryId: number) {
  return useQuery({
    queryKey: homeKeys.recurrences(categoryId),
    queryFn: () => fetchRecurrences(categoryId),
  });
}

function useInvalidateRecurrences() {
  const queryClient = useQueryClient();
  return (categoryId: number) => {
    queryClient.invalidateQueries({
      queryKey: homeKeys.recurrences(categoryId),
    });
    // Sinh/tắt/xoá mẫu lặp ảnh hưởng list works → refresh luôn
    queryClient.invalidateQueries({ queryKey: workKeys.all });
  };
}

export function useCreateRecurrence(categoryId: number) {
  const invalidate = useInvalidateRecurrences();
  return useMutation({
    mutationFn: (payload: CreateRecurrencePayload) => createRecurrence(payload),
    onSuccess: () => invalidate(categoryId),
  });
}

export function useToggleRecurrence(categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      toggleRecurrence(id, isActive),
    onSuccess: (_, { id, isActive }) => {
      // Cập nhật ngay công tắc trên list, không cần refetch
      queryClient.setQueryData<WorkRecurrence[]>(
        homeKeys.recurrences(categoryId),
        (old) => old?.map((r) => (r.id === id ? { ...r, isActive } : r)),
      );
      queryClient.invalidateQueries({ queryKey: workKeys.all });
    },
  });
}

export function useGenerateRecurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => generateRecurrence(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.all }),
  });
}

export function useDeleteRecurrence(categoryId: number) {
  const invalidate = useInvalidateRecurrences();
  return useMutation({
    mutationFn: (id: number) => deleteRecurrence(id),
    onSuccess: () => invalidate(categoryId),
  });
}
