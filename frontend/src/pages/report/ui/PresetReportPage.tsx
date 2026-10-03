// pages/report/ui/PresetReportPage — trang render 1 BÁO CÁO CON theo preset do
// server khai báo (GET /reports/presets). Dùng chung cho cả 3 nhóm:
//   · Báo cáo hằng ngày  (/report/daily/:key)
//   · Báo cáo hoạt động  (/report/activity/:key)
//   · Báo cáo tổng quan   (/report/summary/:key)
//
// Mỗi biểu đồ bấm được (drill-through) → mở DrillDrawer với danh sách bản ghi.
import { DownloadOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, DatePicker, Empty, Select, Space, Spin, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  downloadCsv,
  useReportPresets,
  useReportQuery,
} from '@/entities/report';
import type {
  ChartDrillInfo,
  DrillRequest,
  PresetChartDef,
} from '@/entities/report';
import { useSites } from '@/entities/work';
import { ReportChart } from '@/shared/ui/chart/ReportChart';
import { DrillDrawer } from './DrillDrawer';

const { Title, Text } = Typography;

function quarterStart(d: Dayjs): Dayjs {
  return d.month(3 * Math.floor(d.month() / 3)).startOf('month').date(1);
}

export function PresetReportPage() {
  const { presetKey } = useParams<{ presetKey: string }>();
  const { data: meta, isLoading: loadingPresets } = useReportPresets();
  const { data: sites = [] } = useSites();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [drill, setDrill] = useState<DrillRequest | null>(null);

  // Tìm báo cáo con theo key trong danh mục preset (danh sách nhỏ, không cần
  // memo — tính mỗi render đều rẻ hơn là phải giữ deps đúng).
  const found = (() => {
    for (const g of meta?.groups ?? []) {
      const item = g.items.find((i) => i.key === presetKey);
      if (item) return { group: g, item };
    }
    return null;
  })();

  const filters = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
      siteIds: siteId !== undefined ? [siteId] : undefined,
      ...(found?.item.filters ?? {}),
    }),
    [range, siteId, found],
  );

  // 1 lần gọi cho dải KPI: gom các metric của preset vào 1 query (không giới
  // hạn limit — KPI cần tính trên TOÀN BỘ bản ghi, không phải 1 dòng).
  const kpiMetrics = useMemo(
    () => (found?.item.kpis ?? []).map((k) => k.metric),
    [found],
  );
  const { data: kpiData, isLoading: loadingKpi } = useReportQuery(
    found
      ? {
          dataset: found.item.dataset,
          dimensions: [],
          metrics: kpiMetrics,
          filters,
        }
      : { dataset: 'works' },
    !!found && kpiMetrics.length > 0,
  );

  const kpiRow = kpiData?.rows[0];

  if (loadingPresets) {
    return (
      <div className="report-page">
        <Spin />
      </div>
    );
  }

  if (!found) {
    return (
      <div className="report-page">
        <Empty description="Không tìm thấy báo cáo này." />
      </div>
    );
  }

  const { group, item } = found;

  return (
    <div className="report-page report-preset">
      <div className="report-toolbar">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {item.title}
          </Title>
          <Text type="secondary">
            {group.label} · <InfoCircleOutlined /> {item.description}
          </Text>
        </div>
        <Space wrap>
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
            presets={[
              { label: 'Hôm nay', value: [dayjs(), dayjs()] },
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
            style={{ width: 200 }}
            value={siteId}
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSiteId}
          />
          <Text type="secondary" className="report-drill-hint">
            Bấm vào biểu đồ để xem danh sách chi tiết
          </Text>
        </Space>
      </div>

      {(item.kpis ?? []).length > 0 ? (
        <Spin spinning={loadingKpi}>
          <div className="report-kpi-grid">
            {(item.kpis ?? []).map((k) => (
              <div key={k.metric} className="report-kpi-tile">
                <div className="report-kpi-tile-value">
                  {Number(kpiRow?.[k.metric] ?? 0).toLocaleString('vi-VN', {
                    maximumFractionDigits: 2,
                  })}
                  {k.suffix ?? ''}
                </div>
                <Text type="secondary">{k.label}</Text>
              </div>
            ))}
          </div>
        </Spin>
      ) : null}

      <div className="report-grid">
        {item.charts.map((c) => (
          <PresetChart
            key={c.title}
            def={c}
            dataset={item.dataset}
            filters={filters}
            onDrill={(info) =>
              setDrill({
                dataset: item.dataset,
                dimensions: c.dimensions,
                metrics: c.metrics,
                filters,
                slice: { dim: info.dim, value: info.value },
                page: 1,
                limit: 20,
                chartTitle: c.title,
              })
            }
          />
        ))}
      </div>

      <DrillDrawer request={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function PresetChart({
  def,
  dataset,
  filters,
  onDrill,
}: {
  def: PresetChartDef;
  dataset: DrillRequest['dataset'];
  filters: DrillRequest['filters'];
  onDrill: (info: ChartDrillInfo) => void;
}) {
  const payload = useMemo(
    () => ({
      dataset,
      dimensions: def.dimensions,
      metrics: def.metrics,
      filters,
      limit: 2000,
    }),
    [dataset, def.dimensions, def.metrics, filters],
  );
  const { data, isLoading, refetch } = useReportQuery(payload);

  return (
    <div className="report-grid-cell" style={{ gridColumn: `span ${def.span ?? 12}` }}>
      <div className="report-grid-title">
        <span>
          {def.title}
          {def.dimensions.length > 0 ? (
            <Text type="secondary" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
              theo {def.dimensions.join(' · ')}
            </Text>
          ) : null}
        </span>
        <Space size={4}>
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            disabled={!data || data.rows.length === 0}
            onClick={() =>
              downloadCsv(
                `${def.title.replace(/[^\w]+/g, '-').toLowerCase()}.csv`,
                data?.rows ?? [],
              )
            }
          />
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={() => refetch()} />
        </Space>
      </div>
      <Spin spinning={isLoading}>
        {data ? (
          <ReportChart chartType={def.chartType} data={data} height={300} onDrill={onDrill} />
        ) : null}
      </Spin>
    </div>
  );
}
