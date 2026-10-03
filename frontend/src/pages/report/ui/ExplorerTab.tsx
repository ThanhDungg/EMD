// pages/report/ui/ExplorerTab — builder tự do kiểu Power BI: chọn dataset, chiều
// (dimension), chỉ số (metric), loại biểu đồ, bộ lọc → xem kết quả ngay, lưu
// vào dashboard hoặc xuất CSV. Không cần viết SQL.
import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { downloadCsv, newWidgetId, useReportDatasets, useReportQuery, useSaveBoard } from '@/entities/report';
import type {
  ChartDrillInfo,
  ChartKey,
  DatasetDef,
  DrillRequest,
  QueryReportPayload,
  ReportFilters,
  ReportWidgetConfig,
} from '@/entities/report';
import { useSites } from '@/entities/work';
import { ReportChart } from '@/shared/ui/chart/ReportChart';
import { DrillDrawer } from './DrillDrawer';

const { Text } = Typography;

const PRIORITIES = [
  { value: 'HIGH', label: 'Cao' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'LOW', label: 'Thấp' },
];
const METER_TYPES = [
  { value: 'ELECTRICITY', label: 'Điện' },
  { value: 'WATER', label: 'Nước' },
  { value: 'DO_OIL', label: 'Dầu DO' },
];
const PHASES = [
  { value: 'NORMAL', label: 'Bình thường' },
  { value: 'PEAK', label: 'Cao điểm' },
  { value: 'OFF_PEAK', label: 'Thấp điểm' },
];

export function ExplorerTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: meta } = useReportDatasets();
  const { data: sites = [] } = useSites();
  const saveBoard = useSaveBoard();
  const createBoard = saveBoard.mutate;
  const [saving, setSaving] = useState(false);
  const [boardName, setBoardName] = useState('Dashboard của tôi');
  const [isPublic, setIsPublic] = useState(false);

  const datasets = meta?.datasets ?? [];
  const [datasetKey, setDatasetKey] = useState<string>('works');
  const dataset: DatasetDef | undefined =
    datasets.find((d) => d.key === datasetKey) ?? datasets[0];
  const [chartType, setChartType] = useState<ChartKey>('bar');
  const [dimensions, setDimensions] = useState<string[]>(['status']);
  const [metrics, setMetrics] = useState<string[]>(['count']);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [meterTypes, setMeterTypes] = useState<string[]>([]);
  const [phases, setPhases] = useState<string[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [drill, setDrill] = useState<DrillRequest | null>(null);

  const filters: ReportFilters = useMemo(
    () => ({
      from: range?.[0]?.format('YYYY-MM-DD'),
      to: range?.[1]?.format('YYYY-MM-DD'),
      siteIds: siteIds.length ? siteIds : undefined,
      priorities: priorities.length ? priorities : undefined,
      meterTypes: meterTypes.length ? meterTypes : undefined,
      phases: phases.length ? phases : undefined,
    }),
    [range, siteIds, priorities, meterTypes, phases],
  );

  const payload: QueryReportPayload = useMemo(
    () => ({
      dataset: (dataset?.key ?? 'works') as QueryReportPayload['dataset'],
      dimensions,
      metrics,
      filters,
      limit: 2000,
    }),
    [dataset, dimensions, metrics, filters],
  );
  const { data, isLoading } = useReportQuery(payload, !!dataset);

  function switchDataset(next: string) {
    const def = datasets.find((d) => d.key === next);
    setDatasetKey(next);
    setDimensions(def?.dimensions[0] ? [def.dimensions[0].key] : []);
    setMetrics(def?.metrics[0] ? [def.metrics[0].key] : []);
    setChartType((def?.defaultChart as ChartKey) ?? 'bar');
  }

  /** Click vào biểu đồ → mở danh sách bản ghi gốc của lát cắt đó. */
  function handleDrill(info: ChartDrillInfo) {
    if (!info.value) return;
    setDrill({
      dataset: dataset?.key ?? 'works',
      dimensions,
      metrics,
      filters,
      slice: { dim: info.dim, value: info.value },
      page: 1,
      limit: 20,
      chartTitle: `${dataset?.label ?? ''} · ${dimensions.join(' / ') || 'Tổng'}`,
    });
  }

  async function handleSaveBoard() {
    if (!dataset) return;
    setSaving(true);
  }

  function confirmSave(name: string, isPublic: boolean) {
    if (!dataset) return;
    const widget: ReportWidgetConfig = {
      id: newWidgetId(),
      title: `${dataset.label} · ${dimensions.join(' / ') || 'tổng'}`,
      dataset: dataset.key,
      chartType,
      dimensions,
      metrics,
      filters,
      span: 12,
      showLabels,
    };
    createBoard(
      { name, config: { widgets: [widget] }, isPublic },
      {
        onSuccess: () => {
          messageApi.success('Đã lưu vào "Bảng của tôi".');
          setSaving(false);
        },
        onError: () => {
          messageApi.error('Lưu dashboard thất bại.');
          setSaving(false);
        },
      },
    );
  }

  if (!dataset) {
    return (
      <div className="report-explorer">
        <Spin />
      </div>
    );
  }

  const isEnergy = dataset.key === 'energy';

  return (
    <div className="report-explorer">
      {contextHolder}
      <div className="report-explorer-side">
        <div className="report-side-title">Nguồn dữ liệu</div>
        <Select
          value={datasetKey}
          onChange={switchDataset}
          style={{ width: '100%' }}
          options={datasets.map((d) => ({ value: d.key, label: d.label }))}
        />
        <Text type="secondary" className="report-side-hint">
          {dataset.description}
        </Text>

        <div className="report-side-title">Chiều (trục)</div>
        <Select
          mode="multiple"
          maxCount={2}
          value={dimensions}
          onChange={setDimensions}
          style={{ width: '100%' }}
          placeholder="Chọn tối đa 2 chiều"
          options={dataset.dimensions.map((f) => ({ value: f.key, label: f.label }))}
        />

        <div className="report-side-title">Chỉ số (giá trị)</div>
        <Select
          mode="multiple"
          maxCount={4}
          value={metrics}
          onChange={setMetrics}
          style={{ width: '100%' }}
          placeholder="Chọn chỉ số"
          options={dataset.metrics.map((f) => ({ value: f.key, label: f.label }))}
        />

        <div className="report-side-title">Loại biểu đồ</div>
        <Select
          value={chartType}
          onChange={setChartType}
          style={{ width: '100%' }}
          options={dataset.suggestedCharts.map((c) => {
            const def = REPORT_CHART_LABELS[c];
            return { value: c, label: def?.label ?? c };
          })}
        />
        <Text type="secondary" className="report-side-hint">
          {REPORT_CHART_LABELS[chartType]?.hint}
        </Text>

        <div className="report-side-title">Bộ lọc</div>
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
          style={{ width: '100%' }}
          presets={[
            { label: '7 ngày qua', value: [dayjs().subtract(6, 'day'), dayjs()] },
            { label: '30 ngày qua', value: [dayjs().subtract(29, 'day'), dayjs()] },
            { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs()] },
          ]}
        />
        <Select
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Dự án"
          value={siteIds}
          onChange={setSiteIds}
          style={{ width: '100%' }}
          options={sites.map((s) => ({ value: s.id, label: s.name }))}
        />
        {dataset.key === 'works' ? (
          <Select
            mode="multiple"
            allowClear
            placeholder="Ưu tiên"
            value={priorities}
            onChange={setPriorities}
            style={{ width: '100%' }}
            options={PRIORITIES}
          />
        ) : null}
        {isEnergy ? (
          <>
            <Select
              mode="multiple"
              allowClear
              placeholder="Loại đồng hồ"
              value={meterTypes}
              onChange={setMeterTypes}
              style={{ width: '100%' }}
              options={METER_TYPES}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Pha điện"
              value={phases}
              onChange={setPhases}
              style={{ width: '100%' }}
              options={PHASES}
            />
          </>
        ) : null}
        <Checkbox checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)}>
          Hiện nhãn số
        </Checkbox>
      </div>

      <div className="report-explorer-main">
        <div className="report-toolbar">
          <Space>
            <Input
              readOnly
              value={`${dataset.label} · ${dimensions.join(' / ') || 'Tổng'} · ${
                metrics.join(', ') || 'count'
              }`}
              style={{ width: 380 }}
            />
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                downloadCsv(`bao-cao-${dataset.key}.csv`, data?.rows ?? [])
              }
            >
              Xuất CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={saveBoard.isPending}
              onClick={handleSaveBoard}
            >
              Lưu vào dashboard
            </Button>
          </Space>
          <Text type="secondary">
            {data ? `${data.rows.length} nhóm / ${data.total} bản ghi` : ''}
          </Text>
        </div>
        <div className="report-chart-panel">
          <Spin spinning={isLoading}>
            {data && data.rows.length > 0 ? (
              <ReportChart
                chartType={chartType}
                data={data}
                height={420}
                showLabels={showLabels}
                onDrill={handleDrill}
              />
            ) : (
              <Empty description="Chưa có dữ liệu cho bộ lọc này" />
            )}
          </Spin>
        </div>
        <div className="report-hint-row">
          <Text type="secondary">
            Bấm vào biểu đồ để xem danh sách chi tiết. Gợi ý: kết hợp{' '}
            <b>Trạng thái + Dự án</b> để xem cơ cấu tiến độ từng dự án, hoặc{' '}
            <b>Tháng tạo + Số việc</b> để theo dõi xu hướng.
          </Text>
        </div>
      </div>

      <Modal
        open={saving}
        title="Lưu biểu đồ vào dashboard"
        okText="Lưu"
        cancelText="Huỷ"
        onCancel={() => setSaving(false)}
        confirmLoading={saveBoard.isPending}
        onOk={() => boardName.trim() && confirmSave(boardName.trim(), isPublic)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="Tên dashboard"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
          />
          <Space>
            <Switch
              checked={isPublic}
              onChange={setIsPublic}
              size="small"
            />
            <Text type="secondary">
              Chia sẻ cho mọi người cùng xem (công khai)
            </Text>
          </Space>
        </Space>
      </Modal>

      <DrillDrawer request={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

const REPORT_CHART_LABELS: Record<string, { label: string; hint: string }> = {
  kpi: { label: 'KPI', hint: 'Gộp 1 số lớn duy nhất.' },
  bar: { label: 'Cột', hint: 'So sánh giá trị giữa các nhóm.' },
  stackedBar: { label: 'Cột chồng', hint: 'So sánh nhiều chỉ số cùng lúc.' },
  line: { label: 'Đường', hint: 'Xu hướng theo thời gian.' },
  area: { label: 'Vùng', hint: 'Nhấn mạnh khối lượng theo thời gian.' },
  donut: { label: 'Donut', hint: 'Cơ cấu % theo 1 chiều.' },
  pie: { label: 'Tròn', hint: 'Cơ cấu % theo 1 chiều.' },
  funnel: { label: 'Phễu', hint: 'Pipeline xử lý sự cố.' },
  gauge: { label: 'Đồng hồ', hint: '1 tỉ lệ đơn (0–100%), chọn chỉ số dạng Rate.' },
  radar: { label: 'Radar', hint: 'So sánh nhiều nhóm trên cùng thang đo.' },
  treemap: { label: 'Treemap', hint: 'Cơ cấu tài sản theo diện tích.' },
  table: { label: 'Bảng', hint: 'Số liệu chi tiết từng dòng.' },
  combo: {
    label: 'Cột + đường (2 trục)',
    hint: 'Chọn 2 chỉ số: số lượng + tỉ lệ (VD số việc + % hoàn thành).',
  },
  heatmap: {
    label: 'Heatmap',
    hint: 'Chọn 2 chiều: ma trận dòng × cột, màu thể hiện chỉ số.',
  },
};
