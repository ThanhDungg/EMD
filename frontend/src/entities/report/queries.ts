import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBoard,
  deleteBoard,
  drillReport,
  fetchBoards,
  fetchDatasets,
  fetchOverview,
  fetchReportPresets,
  queryReport,
  updateBoard,
} from './api';
import type { DrillRequest, QueryReportPayload } from './model';

export function useReportDatasets() {
  return useQuery({ queryKey: ['reports', 'datasets'], queryFn: fetchDatasets, staleTime: 10 * 60_000 });
}

export function useReportPresets() {
  return useQuery({ queryKey: ['reports', 'presets'], queryFn: fetchReportPresets, staleTime: 30 * 60_000 });
}

export function useReportDrill(payload: DrillRequest | null) {
  return useQuery({
    queryKey: ['reports', 'drill', JSON.stringify(payload)],
    queryFn: () => drillReport(payload as DrillRequest),
    enabled: !!payload,
    staleTime: 30_000,
  });
}

export function useReportQuery(payload: QueryReportPayload, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'query', JSON.stringify(payload)],
    queryFn: () => queryReport(payload),
    enabled,
    staleTime: 60_000,
  });
}

export function useReportOverview(params: { from?: string; to?: string; siteId?: number }) {
  return useQuery({
    queryKey: ['reports', 'overview', params.from, params.to, params.siteId],
    queryFn: () => fetchOverview(params),
    staleTime: 60_000,
  });
}

export function useReportBoards() {
  return useQuery({ queryKey: ['reports', 'boards'], queryFn: fetchBoards, staleTime: 30_000 });
}

export function useSaveBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBoard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'boards'] }),
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateBoard>[1] }) =>
      updateBoard(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'boards'] }),
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBoard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports', 'boards'] }),
  });
}
