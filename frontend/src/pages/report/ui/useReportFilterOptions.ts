// pages/report/ui/useReportFilterOptions — nạp danh sách chọn cho các bộ lọc
// kiểu ID (dự án, loại việc, trạng thái, danh mục tài sản). Dùng chung cho
// modal dựng biểu đồ và thanh filter trên từng thẻ biểu đồ.
import { useQuery } from '@tanstack/react-query';
import { fetchAssetCategories, fetchWorkCategories, fetchWorkStatuses } from '@/entities/report';
import { useSites } from '@/entities/work';

export interface ReportFilterOptions {
  sites: Array<{ value: number; label: string }>;
  workCategories: Array<{ value: number; label: string }>;
  assetCategories: Array<{ value: number; label: string }>;
  workStatuses: Array<{ value: number; label: string }>;
}

export function useReportFilterOptions(
  categoryId: number | undefined,
  enabled = true,
): ReportFilterOptions {
  const { data: sites = [] } = useSites();
  const { data: workCategories = [] } = useQuery({
    queryKey: ['reports', 'work-categories'],
    queryFn: fetchWorkCategories,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  const { data: assetCategories = [] } = useQuery({
    queryKey: ['reports', 'asset-categories'],
    queryFn: fetchAssetCategories,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  // Trạng thái phụ thuộc loại việc → chỉ nạp khi đã chọn loại.
  const { data: workStatuses = [] } = useQuery({
    queryKey: ['reports', 'work-statuses', categoryId ?? 0],
    queryFn: () => fetchWorkStatuses(categoryId as number),
    enabled: enabled && categoryId !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  return {
    sites: sites.map((s) => ({ value: s.id, label: s.name })),
    workCategories: workCategories.map((c) => ({ value: c.id, label: c.name })),
    assetCategories: assetCategories.map((c) => ({
      value: c.id,
      label: c.name,
    })),
    workStatuses: workStatuses.map((s) => ({ value: s.id, label: s.name })),
  };
}