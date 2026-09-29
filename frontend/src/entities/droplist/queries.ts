// entities/droplist/queries — hooks TanStack Query cho các bảng droplist.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDroplist,
  deleteDroplist,
  fetchDroplist,
  updateDroplist,
} from './api';
import type { DroplistKey } from './model';

export const droplistKeys = {
  all: ['droplists'] as const,
  list: (key: DroplistKey) => [...droplistKeys.all, key] as const,
};

export function useDroplist(key: DroplistKey, enabled = true) {
  return useQuery({
    queryKey: droplistKeys.list(key),
    queryFn: () => fetchDroplist(key),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateDroplists() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: droplistKeys.all });
}

export function useCreateDroplist(key: DroplistKey) {
  const invalidate = useInvalidateDroplists();
  return useMutation({
    mutationFn: (payload: { name: string; code?: string }) =>
      createDroplist(key, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateDroplist(key: DroplistKey) {
  const invalidate = useInvalidateDroplists();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; code?: string };
    }) => updateDroplist(key, id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDroplist(key: DroplistKey) {
  const invalidate = useInvalidateDroplists();
  return useMutation({
    mutationFn: (id: number) => deleteDroplist(key, id),
    onSuccess: invalidate,
  });
}
