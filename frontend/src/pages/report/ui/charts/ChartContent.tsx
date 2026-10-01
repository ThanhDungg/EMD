// pages/report/ui/charts/ChartContent — render nội dung 1 biểu đồ theo loại:
// KPI (số tổng) · Cột/Tròn/Đường (echarts) · Bảng · Bản đồ.
import { Empty, Table, Typography } from 'antd';
import type { ChartType, ReportResult } from '@/entities/report';
import { EChartView } from './EChartView';
import { SitesMapView } from './SitesMapView';

const { Text } = Typography;

interface Props {
  chartType: ChartType;
  result?: ReportResult;
  height?: number;
}

export function ChartContent({ chartType, result, height = 300 }: Props) {
  if (!result) {
    return <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  if (chartType === 'KPI') {
    const first = result.rows[0];
    return (
      <div style={{ textAlign: 'center', padding: '28px 0' }}>
        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
          {result.total.toLocaleString('vi-VN')}
        </div>
        {first && first.key !== 'total' && (
          <Text type="secondary">
            {first.label}: {first.value.toLocaleString('vi-VN')}
          </Text>
        )}
      </div>
    );
  }

  if (chartType === 'TABLE') {
    return (
      <Table
        size="small"
        rowKey="key"
        dataSource={result.rows}
        pagination={{ pageSize: 8, size: 'small' }}
        columns={[
          { title: 'Nhãn', dataIndex: 'label', key: 'label' },
          {
            title: 'Giá trị',
            dataIndex: 'value',
            key: 'value',
            width: 130,
            align: 'right',
            render: (v: number) => v.toLocaleString('vi-VN'),
          },
        ]}
        footer={() => `Tổng: ${result.total.toLocaleString('vi-VN')}`}
      />
    );
  }

  if (chartType === 'MAP') {
    return <SitesMapView markers={result.markers ?? []} height={height} />;
  }

  if (result.rows.length === 0) {
    return <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  return <EChartView type={chartType} rows={result.rows} height={height} />;
}
