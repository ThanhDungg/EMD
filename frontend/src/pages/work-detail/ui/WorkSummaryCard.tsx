import { Avatar, Descriptions, Space, Typography } from 'antd';
import type { WorkDetail, WorkStatus } from '@/entities/work';
import { formatDate } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';

const { Text } = Typography;

function personName(p: {
  accountName: string;
  fullName?: string | null;
}): string {
  return p.fullName?.trim() || p.accountName;
}

function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDate(value);
  } catch {
    return String(value).slice(0, 10);
  }
}

export const LABEL_STYLE = {
  color: '#252932',
  fontWeight: 600,
  fontSize: 12,
} as const;
export const VALUE_STYLE = { color: '#5f6672', fontSize: 12 } as const;

// Nhãn trạng thái nghiêng chồng góc trái card (theo đặc tả).
// Xanh lá khi đã đóng, còn lại theo màu của status.
export function StatusRibbon({
  status,
}: {
  status: WorkStatus | null | undefined;
}) {
  return (
    <span
      style={{
        position: 'absolute',
        top: -10,
        left: -8,
        zIndex: 1,
        padding: '4px 10px',
        color: '#fff',
        background: status?.isClosed ? '#55ad70' : (status?.color ?? '#0969da'),
        borderRadius: 3,
        transform: 'rotate(-6deg)',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status?.name ?? 'Chưa đặt'}
    </span>
  );
}

export function CreatorMeta({
  workId,
  assigner,
}: {
  workId: number;
  assigner: WorkDetail['assigner'];
}) {
  return (
    <Space size={16} wrap style={{ marginBottom: 4 }}>
      <Text type="secondary">
        Mã <Text strong>#{workId}</Text>
      </Text>
      <Text type="secondary">
        Tạo bởi{' '}
        {assigner ? (
          <Space size={6}>
            <Avatar
              size="small"
              style={{ background: '#d13b3b', fontSize: 11 }}
            >
              {(personName(assigner).charAt(0) || 'U').toUpperCase()}
            </Avatar>
            <Text strong>{personName(assigner)}</Text>
          </Space>
        ) : (
          <Text strong>—</Text>
        )}
      </Text>
    </Space>
  );
}

export function PriorityBadge({
  priority,
}: {
  priority: WorkDetail['priority'];
}) {
  if (priority === 'HIGH') {
    return (
      <span
        style={{
          background: '#ffdede',
          color: '#d13b3b',
          borderRadius: 3,
          padding: '3px 6px',
          fontSize: 12,
        }}
      >
        Cao
      </span>
    );
  }
  return <>{priority ?? '—'}</>;
}

// Card tóm tắt công việc dùng chung mọi loại (kiểu card sự cố, data riêng
// từng loại): ribbon + tiêu đề + mã/người tạo + lưới tổng quan responsive
// (desktop 4 cột, tablet 2 cột, mobile 1 cột).
export function WorkSummaryCard({ detail }: { detail: WorkDetail }) {
  const handlers = detail.handlers ?? [];
  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <StatusRibbon status={detail.status} />
      <BodyCard title={detail.title}>
        <Descriptions
          column={{ xs: 1, sm: 2, xl: 4 }}
          size="small"
          labelStyle={LABEL_STYLE}
          contentStyle={VALUE_STYLE}
        >
          <Descriptions.Item label="Dự án">
            {detail.site?.name ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Quản lý dự án">
            {detail.site?.manager ? personName(detail.site.manager) : '—'}
          </Descriptions.Item>
          <Descriptions.Item label={`Người xử lý (${handlers.length})`}>
            {handlers.length > 0 ? handlers.map(personName).join(', ') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Vị trí">
            {detail.location?.trim() || '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày bắt đầu">
            {formatDay(detail.startDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Hạn hoàn thành">
            {formatDay(detail.endDate)}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày hoàn thành thực tế">
            {formatDay(detail.completedAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Độ ưu tiên">
            <PriorityBadge priority={detail.priority} />
          </Descriptions.Item>
        </Descriptions>
      </BodyCard>
    </div>
  );
}
