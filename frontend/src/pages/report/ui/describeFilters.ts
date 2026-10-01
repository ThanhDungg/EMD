// pages/report/ui/describeFilters — tóm tắt bộ lọc riêng của biểu đồ thành
// 1 dòng chữ (hiện dưới thẻ biểu đồ).
import type { ReportChart } from '@/entities/report';

export function describeFilters(
  filters: ReportChart['filters'],
): string | null {
  if (!filters) return null;
  const parts: string[] = [];
  if (filters.from || filters.to) {
    parts.push(`${filters.from ?? '…'} → ${filters.to ?? '…'}`);
  }
  const idLabel: Array<[unknown, string]> = [
    [filters.siteId, 'Dự án'],
    [filters.categoryId, 'Loại việc'],
    [filters.statusId, 'Trạng thái'],
    [filters.workId, 'Việc'],
    [filters.provinceId, 'Tỉnh'],
  ];
  for (const [value, label] of idLabel) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${label} #${value}`);
    }
  }
  const textLabel: Array<[unknown, string]> = [
    [filters.meterType, 'Đồng hồ'],
    [filters.operationStatus, 'Tình trạng DA'],
    [filters.rentalStatus, 'Cho thuê'],
    [filters.managementStatus, 'Quản lý'],
    [filters.contractType, 'Loại HĐ'],
  ];
  for (const [value, label] of textLabel) {
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${label}: ${value}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
