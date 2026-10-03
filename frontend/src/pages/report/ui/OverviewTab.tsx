// pages/report/ui/OverviewTab — dashboard mở sẵn: KPI + 8 visual Power BI
// về công việc, sự cố, năng lượng, tài sản, chất lượng checklist.
// Mọi biểu đồ đều bấm được (drill-through) → mở danh sách chi tiết.
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Select, Space, Spin, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import {
  downloadCsv,
  useReportOverview,
  type ChartDrillInfo,
  type DrillRequest,
  type QueryReportResult,
} from '@/entities/report';
import { useSites } from '@/entities/work';
import { ReportChart } from '@/shared/ui/chart/ReportChart';
import { DrillDrawer } from './DrillDrawer';

const { Text } = Typography;

const KPIS = [
  { key: 'totalWorks', label: 'Tổng công việc', suffix: '' },
  { key: 'openWorks', label: 'Việc đang mở', suffix: '' },
  { key: 'totalIncidents', label: 'Sự cố', suffix: '' },
  { key: 'totalEnergy', label: 'Tiêu thụ năng lượng', suffix: '' },
  { key: 'passRate', label: 'Tỉ lệ đạt checklist (%)', suffix: '%' },
] as const;

function quarterStart(d: Dayjs): Dayjs {
  return d.month(3 * Math.floor(d.month() / 3)).startOf('month').date(1);
}

export function OverviewTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [drill, setDrill] = useState<DrillRequest | null>(null);
  const { data: sites = [] } = useSites();
  const params = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
      siteId,
    }),
    [range, siteId],
  );
  const { data, isLoading, refetch } = useReportOverview(params);

  const filters = useMemo(
    () => ({
      from: params.from,
      to: params.to,
      siteIds: siteId !== undefined ? [siteId] : undefined,
    }),
    [params.from, params.to, siteId],
  );

  /** Mở drill cho 1 biểu đồ: dataset + chiều tương ứng với dataset đó. */
  function drillInto(
    dataset: DrillRequest['dataset'],
    block: QueryReportResult | undefined,
    title: string,
  ) {
    return (info: ChartDrillInfo) => {
      if (!info.value) return;
      setDrill({
        dataset,
        dimensions: block?.dimensions ?? [info.dim],
        metrics: block?.metrics ?? [],
        filters,
        slice: { dim: info.dim, value: info.value },
        page: 1,
        limit: 20,
        chartTitle: title,
      });
    };
  }

  return (
    <div className="report-overview">
      {contextHolder}
      <div className="report-toolbar">
        <Space wrap>
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
            presets={[
              { label: '7 ngày qua', value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: '30 ngày qua', value: [dayjs().subtract(29, 'day'), dayjs()] },
              { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs()] },
              { label: 'Quý này', value: [quarterStart(dayjs()), dayjs()] },
              { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs()] },
            ]}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả dự án"
            style={{ width: 220 }}
            value={siteId}
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSiteId}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Tải lại
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              if (!data) return;
              downloadCsv('bao-cao-tong-quan.csv', [
                ...data.byMonth.rows,
                ...data.byStatus.rows,
                ...data.byCategory.rows,
              ]);
              messageApi.success('Đã xuất CSV.');
            }}
          >
            Xuất CSV
          </Button>
          <Text type="secondary" className="report-drill-hint">
            Bấm vào biểu đồ để xem danh sách chi tiết
          </Text>
        </Space>
      </div>

      <Spin spinning={isLoading}>
        <div className="report-kpi-grid">
          {KPIS.map((k) => (
            <div key={k.key} className="report-kpi-tile">
              <div className="report-kpi-tile-value">
                {Number(data?.kpis[k.key] ?? 0).toLocaleString('vi-VN', {
                  maximumFractionDigits: 2,
                })}
                {k.suffix}
              </div>
              <Text type="secondary">{k.label}</Text>
            </div>
          ))}
        </div>

        <div className="report-grid">
          <ReportBlock
            title="Công việc theo trạng thái"
            chart="donut"
            data={data?.byStatus}
            onDrill={drillInto('works', data?.byStatus, 'Công việc theo trạng thái')}
          />
          <ReportBlock
            title="Việc theo loại (kèm % hoàn thành)"
            chart="bar"
            data={data?.byCategory}
            onDrill={drillInto('works', data?.byCategory, 'Việc theo loại')}
          />
          <ReportBlock
            title="Xu hướng công việc theo tháng"
            chart="line"
            data={data?.byMonth}
            span={24}
            onDrill={drillInto('works', data?.byMonth, 'Xu hướng công việc theo tháng')}
          />
          <ReportBlock
            title="Sự cố theo loại hư hỏng"
            chart="bar"
            data={data?.incidents}
            onDrill={drillInto('incidents', data?.incidents, 'Sự cố theo loại hư hỏng')}
          />
          <ReportBlock
            title="Tiêu thụ năng lượng theo tháng"
            chart="area"
            data={data?.energyTrend}
            onDrill={drillInto('energy', data?.energyTrend, 'Tiêu thụ năng lượng theo tháng')}
          />
          <ReportBlock
            title="Năng lượng theo loại đồng hồ"
            chart="donut"
            data={data?.energyByType}
            onDrill={drillInto('energy', data?.energyByType, 'Năng lượng theo loại đồng hồ')}
          />
          <ReportBlock
            title="Tình trạng tài sản"
            chart="treemap"
            data={data?.assetsByCond}
            onDrill={drillInto('assets', data?.assetsByCond, 'Tình trạng tài sản')}
          />
          <ReportBlock
            title="Chất lượng checklist (Đạt/Không đạt)"
            chart="gauge"
            data={data?.quality}
          />
        </div>
      </Spin>

      <DrillDrawer request={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function ReportBlock({
  title,
  chart,
  data,
  span = 12,
  onDrill,
}: {
  title: string;
  chart: Parameters<typeof ReportChart>[0]['chartType'];
  data?: QueryReportResult;
  span?: number;
  onDrill?: (info: ChartDrillInfo) => void;
}) {
  return (
    <div className="report-grid-cell" style={{ gridColumn: `span ${span}` }}>
      <div className="report-grid-title">{title}</div>
      {data ? (
        <ReportChart chartType={chart} data={data} height={280} onDrill={onDrill} />
      ) : null}
    </div>
  );
}
