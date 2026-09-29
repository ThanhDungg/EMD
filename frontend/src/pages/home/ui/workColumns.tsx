import { Button } from 'antd';
import { EllipsisText, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import { PRIORITY_LABEL } from '@/entities/work';
import type { DirectoryUser, WorkItem, WorkStatus } from '@/entities/work';
import type { UserOption } from './WorkFilter';

// Độ rộng mặc định từng cột (tableLayout="fixed" như Table beca-ui source cũ).
// Kéo mép tiêu đề để chỉnh (prop resizable của Table shared).
export const COL_WIDTH = {
  progress: 100,
  site: 180,
  location: 180,
  status: 160,
  day: 120,
  priority: 120,
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

// Thanh tiến độ dạng pill: nền xám, % trắng bên trong trái, fill xanh khi > 0.
export function ProgressPill({ value }: { value: number }): React.ReactNode {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div
      style={{
        width: 100,
        height: 16,
        background: '#b9bdc4',
        borderRadius: 999,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${v}%`,
          height: '100%',
          background: v > 0 ? '#1677e8' : 'transparent',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: 8,
          top: 0,
          lineHeight: '16px',
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        {`${v}%`}
      </span>
    </div>
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

// Cột mặc định bảng công việc mọi loại (tableLayout fixed + width rõ ràng):
// Tiêu đề (link xanh + ellipsis + tooltip), Tiến độ (pill), Dự án,
// Tình trạng (badge), Từ ngày, Ngày HT, Độ ưu tiên.
// Riêng CHECKLIST chèn thêm cột Vị trí giữa Dự án và Tình trạng.
export function buildWorkColumns(
  isChecklist: boolean,
  onOpenDetail: (work: WorkItem) => void,
): ColumnsType<WorkItem> {
  const columns: ColumnsType<WorkItem> = [
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
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: COL_WIDTH.progress,
      render: (p: number) => <ProgressPill value={p} />,
    },
    {
      title: 'Dự án',
      dataIndex: 'site',
      key: 'site',
      width: COL_WIDTH.site,
      render: (site: WorkItem['site']) => (
        <EllipsisText text={site?.name ?? ''} />
      ),
    },
  ];
  if (isChecklist) {
    columns.push({
      title: 'Vị trí',
      dataIndex: 'location',
      key: 'location',
      width: COL_WIDTH.location,
      render: (v: WorkItem['location']) => (
        <EllipsisText text={v?.trim() ?? ''} />
      ),
    });
  }
  columns.push(
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      width: COL_WIDTH.status,
      render: (s: WorkItem['status']) => statusTag(s),
    },
    {
      title: 'Từ ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      width: COL_WIDTH.day,
      render: (v: WorkItem['startDate']) => formatDay(v),
    },
    {
      title: 'Ngày HT',
      dataIndex: 'endDate',
      key: 'endDate',
      width: COL_WIDTH.day,
      render: (v: WorkItem['endDate']) => formatDay(v),
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: COL_WIDTH.priority,
      render: (v: WorkItem['priority']) => (v ? (PRIORITY_LABEL[v] ?? v) : '—'),
    },
  );
  return columns;
}

// Options Nhân viên cho filter: danh bạ API (nếu có quyền) gộp với người
// xuất hiện trong các list (người giao + người thực hiện).
export function buildEmployeeOptions(
  directory: DirectoryUser[],
  ...lists: WorkItem[][]
): UserOption[] {
  const map = new Map<number, UserOption>();
  for (const u of directory) {
    map.set(u.id, {
      id: u.id,
      accountName: u.accountName,
      fullName: u.fullName,
    });
  }
  for (const list of lists) {
    for (const w of list) {
      if (w.assigner && !map.has(w.assigner.id)) {
        map.set(w.assigner.id, { ...w.assigner });
      }
      for (const h of w.handlers ?? []) {
        if (!map.has(h.id)) map.set(h.id, { ...h });
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.fullName?.trim() || a.accountName).localeCompare(
      b.fullName?.trim() || b.accountName,
      'vi',
    ),
  );
}
