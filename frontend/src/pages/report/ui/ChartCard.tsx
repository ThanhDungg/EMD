// pages/report/ui/ChartCard — 1 thẻ biểu đồ trong dashboard: tự tải số liệu
// theo cấu hình, kèm THANH BỘ LỌC RIÊNG để người xem chỉnh ngay tại chỗ
// (lọc ở đây chỉ có tác dụng khi xem, không sửa cấu hình đã lưu của biểu đồ).
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Spin, Typography } from 'antd';
import { useState } from 'react';
import { CHART_TYPE_LABEL, useReportData } from '@/entities/report';
import type { ChartFilters, ReportChart } from '@/entities/report';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { ChartContent } from './charts/ChartContent';
import { ChartFilterBar } from './ChartFilterBar';
import { describeFilters } from './describeFilters';

const { Text } = Typography;

interface Props {
  chart: ReportChart;
  canEdit: boolean;
  onEdit: (chart: ReportChart) => void;
  onDelete: (chart: ReportChart) => Promise<void> | void;
  deletingId: number | null;
}

export function ChartCard({ chart, canEdit, onEdit, onDelete, deletingId }: Props) {
  // Lọc người xem đang bật. null = xoá lọc gốc của biểu đồ ở ô đó.
  const [overrides, setOverrides] = useState<ChartFilters>({});

  const baseFilters: ChartFilters = chart.filters ?? {};
  const effectiveFilters = { ...baseFilters, ...overrides };
  // Bỏ các key null/undefined khỏi payload gửi backend.
  const cleanFilters = Object.fromEntries(
    Object.entries(effectiveFilters).filter(
      ([, v]) => v !== null && v !== undefined && v !== '',
    ),
  ) as ChartFilters;

  const { data, isLoading, isError, error } = useReportData({
    dataset: chart.dataset,
    metric: chart.metric,
    dimension: chart.dimension,
    filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
    limit: 20,
  });
  const filterText = describeFilters(cleanFilters);

  return (
    <BodyCard
      title={`${chart.title} · ${CHART_TYPE_LABEL[chart.chartType] ?? chart.chartType}`}
      extra={
        canEdit ? (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              aria-label={`Sửa ${chart.title}`}
              onClick={() => onEdit(chart)}
            />
            <Popconfirm
              title={`Xoá biểu đồ "${chart.title}"?`}
              okText="Xoá"
              cancelText="Huỷ"
              onConfirm={() => onDelete(chart)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Xoá ${chart.title}`}
                loading={deletingId === chart.id}
              />
            </Popconfirm>
          </Space>
        ) : undefined
      }
    >
      <ChartFilterBar
        dataset={chart.dataset}
        baseFilters={baseFilters}
        overrides={overrides}
        onOverridesChange={setOverrides}
      />
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : isError ? (
        <Text type="danger">{apiErrorMessage(error, 'Tải số liệu thất bại.')}</Text>
      ) : (
        <>
          <ChartContent chartType={chart.chartType} result={data} />
          {filterText && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Lọc: {filterText}
            </Text>
          )}
        </>
      )}
    </BodyCard>
  );
}
