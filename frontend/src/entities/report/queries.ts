// entities/report/queries — TanStack Query hooks cho module Báo cáo.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChart,
  createDashboard,
  deleteChart,
  deleteDashboard,
  fetchDashboard,
  fetchDashboards,
  fetchReportMeta,
  queryReportData,
  shareDashboard,
  updateChart,
  updateDashboard,
} from './api';
import type {
  ChartPayload,
  DashboardPayload,
  QueryPayload,
  SharePayload,
} from './model';

export const reportKeys = {
  all: ['reports'] as const,
  meta: () => [...reportKeys.all, 'meta'] as const,
  list: (scope: string) => [...reportKeys.all, 'list', scope] as const,
  detail: (id: number) => [...reportKeys.all, 'detail', id] as const,
  data: (payload: QueryPayload) =>
    [...reportKeys.all, 'data', payload] as const,
};

export function useReportMeta() {
  return useQuery({
    queryKey: reportKeys.meta(),
    queryFn: fetchReportMeta,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboards(scope: 'mine' | 'shared' | 'all' = 'all') {
  return useQuery({
    queryKey: reportKeys.list(scope),
    queryFn: () => fetchDashboards(scope),
  });
}

export function useDashboard(id: number | undefined) {
  return useQuery({
    queryKey: reportKeys.detail(id ?? 0),
    queryFn: () => fetchDashboard(id as number),
    enabled: id !== undefined,
  });
}

/** Số liệu 1 biểu đồ (tự refetch khi config đổi — key chứa toàn bộ payload). */
export function useReportData(payload: QueryPayload | null, enabled = true) {
  return useQuery({
    queryKey: reportKeys.data(
      payload ?? { dataset: '', metric: '', dimension: null },
    ),
    queryFn: () => queryReportData(payload as QueryPayload),
    enabled: enabled && payload !== null && payload.dataset !== '',
  });
}

function useInvalidateReports() {
  const queryClient = useQueryClient();
  return (dashboardId?: number) => {
    queryClient.invalidateQueries({ queryKey: reportKeys.all });
    if (dashboardId !== undefined) {
      queryClient.invalidateQueries({
        queryKey: reportKeys.detail(dashboardId),
      });
    }
  };
}

export function useCreateDashboard() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (payload: DashboardPayload) => createDashboard(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateDashboard() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<DashboardPayload> }) =>
      updateDashboard(id, payload),
    onSuccess: (_r, { id }) => invalidate(id),
  });
}

export function useDeleteDashboard() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (id: number) => deleteDashboard(id),
    onSuccess: () => invalidate(),
  });
}

export function useShareDashboard() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SharePayload }) =>
      shareDashboard(id, payload),
    onSuccess: (_r, { id }) => invalidate(id),
  });
}

export function useCreateChart() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({
      dashboardId,
      payload,
    }: {
      dashboardId: number;
      payload: ChartPayload;
    }) => createChart(dashboardId, payload),
    onSuccess: (_r, { dashboardId }) => invalidate(dashboardId),
  });
}

export function useUpdateChart() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ChartPayload> }) =>
      updateChart(id, payload),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteChart() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: (id: number) => deleteChart(id),
    onSuccess: () => invalidate(),
  });
}
