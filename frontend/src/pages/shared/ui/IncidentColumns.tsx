// pages/shared/ui/IncidentColumns — cột + helper hiển thị dùng chung cho các
// bảng SỰ CỐ HƯ HỎNG (danh sách loại việc ở pages/home và danh sách sự cố của
// 1 tài sản ở pages/assets — trang mở từ tem QR).

import { Button } from 'antd';
import { EllipsisText, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import { PRIORITY_LABEL } from '@/entities/work';
import type { WorkItem, WorkStatus } from '@/entities/work';

// Độ rộng mặc định từng cột (tableLayout="fixed", kéo mép tiêu đề để chỉnh).
export const INCIDENT_COL_WIDTH = {
  site: 180,
  location: 180,
  status: 160,
  day: 120,
  priority: 120,
  asset: 200,
  repairType: 180,
  phase: 140,
} as const;

export function statusTag(
  status: WorkStatus | null | undefined,
): React.ReactNode {
  if (!status) return <Tag style={{ borderRadius: 3 }}>Chưa đặt</Tag>;
  return (
    <Tag style={{ borderRadius: 3 }}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: status.color ?? '#8f96a5',
          marginRight: 6,
        }}
      />
      {status.name}
    </Tag>
  );
}

export function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDate(value);
  } catch {
    return String(value).slice(0, 10);
  }
}

const detailText = (value?: string | null) => (
  <EllipsisText text={value?.trim() ?? ''} />
);

/**
 * Cột bảng sự cố hư hỏng (không có Tiến độ): Tiêu đề · Vị trí · Loại tài sản ·
 * Phân loại sửa chữa · Phase · Dự án · Tình trạng · Từ ngày · Ngày hoàn thành ·
 * Ưu tiên. Nguồn dữ liệu: `work.incidentDetail` (API list trả sẵn).
 */
export function buildIncidentColumns(
  onOpenDetail: (work: WorkItem) => void,
): ColumnsType<WorkItem> {
  return [
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      render: (value: string, record: WorkItem) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto', fontWeight: 600 }}
          onClick={() => onOpenDetail(record)}
        >
          <EllipsisText text={value} />
        </Button>
      ),
    },
    {
      title: 'Vị trí',
      key: 'location',
      width: INCIDENT_COL_WIDTH.location,
      render: (_: unknown, record: WorkItem) =>
        detailText(record.incidentDetail?.locationName ?? record.location),
    },
    {
      title: 'Loại tài sản',
      key: 'asset',
      width: INCIDENT_COL_WIDTH.asset,
      render: (_: unknown, record: WorkItem) =>
        detailText(record.incidentDetail?.relatedAsset),
    },
    {
      title: 'Phân loại sửa chữa',
      key: 'repairType',
      width: INCIDENT_COL_WIDTH.repairType,
      render: (_: unknown, record: WorkItem) =>
        detailText(record.incidentDetail?.repairType),
    },
    {
      title: 'Phase',
      key: 'phase',
      width: INCIDENT_COL_WIDTH.phase,
      render: (_: unknown, record: WorkItem) =>
        detailText(record.incidentDetail?.phase),
    },
    {
      title: 'Dự án',
      dataIndex: 'site',
      key: 'site',
      width: INCIDENT_COL_WIDTH.site,
      render: (site: WorkItem['site']) => (
        <EllipsisText text={site?.name ?? ''} />
      ),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      width: INCIDENT_COL_WIDTH.status,
      render: (s: WorkItem['status']) => statusTag(s),
    },
    {
      title: 'Từ ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      width: INCIDENT_COL_WIDTH.day,
      render: (v: WorkItem['startDate']) => formatDay(v),
    },
    {
      title: 'Ngày hoàn thành',
      key: 'completedAt',
      width: INCIDENT_COL_WIDTH.day,
      render: (_: unknown, record: WorkItem) =>
        formatDay(record.completedAt ?? record.endDate),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: INCIDENT_COL_WIDTH.priority,
      render: (v: WorkItem['priority']) => (v ? (PRIORITY_LABEL[v] ?? v) : '—'),
    },
  ];
}
