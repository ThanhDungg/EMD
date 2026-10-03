// pages/report/ui/BoardsTab — danh sách dashboard đã lưu + mở dashboard để
// xem các widget. Cho phép thêm/xoá widget khi sửa, lưu lại lên server.
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import {
  newWidgetId,
  useDeleteBoard,
  useReportBoards,
  useReportQuery,
  useSaveBoard,
  useUpdateBoard,
} from '@/entities/report';
import type {
  ChartDrillInfo,
  DrillRequest,
  ReportBoard,
  ReportWidgetConfig,
} from '@/entities/report';
import { useSites } from '@/entities/work';
import { BodyCard } from '@/shared/ui';
import { ReportChart } from '@/shared/ui/chart/ReportChart';
import { DrillDrawer } from './DrillDrawer';

const { Text } = Typography;

export function BoardsTab() {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: boards = [], isLoading, refetch } = useReportBoards();
  const { data: sites = [] } = useSites();
  const createBoardMutation = useSaveBoard();
  const createBoardMutate = createBoardMutation.mutate;
  const updateBoard = useUpdateBoard();
  const removeBoard = useDeleteBoard();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('Dashboard mới');
  const [drill, setDrill] = useState<DrillRequest | null>(null);
  const [widgets, setWidgets] = useState<ReportWidgetConfig[]>([]);

  const active: ReportBoard | undefined = useMemo(
    () => boards.find((b) => b.id === activeId),
    [boards, activeId],
  );

  function openBoard(board: ReportBoard) {
    setActiveId(board.id);
    setWidgets(board.config?.widgets ?? []);
    setEditing(false);
  }

  async function handleCreate() {
    setCreating(true);
  }

  function confirmCreate() {
    const name = draftName.trim();
    if (!name) return;
    createBoardMutate(
      { name, config: { widgets: [] } },
      {
        onSuccess: (created) => {
          setActiveId(created.id);
          setWidgets([]);
          setCreating(false);
        },
        onError: () => {
          messageApi.error('Tạo dashboard thất bại.');
          setCreating(false);
        },
      },
    );
  }

  async function handleSave() {
    if (!active) return;
    try {
      await updateBoard.mutateAsync({ id: active.id, payload: { config: { widgets } } });
      messageApi.success('Đã lưu cấu hình dashboard.');
      setEditing(false);
    } catch {
      messageApi.error('Lưu dashboard thất bại.');
    }
  }

  if (isLoading) return <Spin />;

  if (!active) {
    return (
      <BodyCard
        title="Bảng của tôi"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              Tải lại
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Tạo dashboard
            </Button>
          </Space>
        }
      >
        {contextHolder}
        <Modal
          open={creating}
          title="Tạo dashboard"
          okText="Tạo"
          cancelText="Huỷ"
          onCancel={() => setCreating(false)}
          confirmLoading={createBoardMutation.isPending}
          onOk={confirmCreate}
        >
          <Input
            autoFocus
            placeholder="Tên dashboard"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
        </Modal>
        {boards.length === 0 ? (
          <Empty description="Chưa có dashboard nào. Bấm 'Tạo dashboard' hoặc lưu biểu đồ từ tab Khám phá." />
        ) : (
          <div className="report-board-list">
            {boards.map((b) => (
              <div key={b.id} className="report-board-item">
                <div>
                  <div className="report-board-name">{b.name}</div>
                  <Text type="secondary">
                    {b.config?.widgets?.length ?? 0} biểu đồ
                    {b.isPublic ? ' · công khai' : ''}
                    {b.updatedAt ? ` · ${new Date(b.updatedAt).toLocaleDateString('vi-VN')}` : ''}
                  </Text>
                </div>
                <Space>
                  <Button type="link" icon={<EditOutlined />} onClick={() => openBoard(b)}>
                    Mở
                  </Button>
                  <Popconfirm
                    title="Xoá dashboard này?"
                    okText="Xoá"
                    cancelText="Huỷ"
                    onConfirm={async () => {
                      await removeBoard.mutateAsync(b.id);
                      messageApi.success('Đã xoá.');
                    }}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        )}
      </BodyCard>
    );
  }

  return (
    <BodyCard
      title={
        <Space>
          <Button type="text" onClick={() => setActiveId(null)}>
            ← Danh sách
          </Button>
          <span>{active?.name}</span>
          {active?.isPublic ? <Text type="secondary">(công khai)</Text> : null}
        </Space>
      }
      extra={
        <Space>
          {editing ? (
            <>
              <Button
                onClick={() => setWidgets(active?.config?.widgets ?? [])}
                icon={<DeleteOutlined />}
              >
                Huỷ thay đổi
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={updateBoard.isPending}>
                Lưu cấu hình
              </Button>
            </>
          ) : (
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Chỉnh sửa
            </Button>
          )}
        </Space>
      }
    >
      {contextHolder}
      {editing ? (
        <AddWidgetBar
          sites={sites.map((s) => ({ value: s.id, label: s.name }))}
          onAdd={(w) => setWidgets((prev) => [...prev, { ...w, id: newWidgetId() }])}
        />
      ) : null}
      {widgets.length === 0 ? (
        <Empty description="Chưa có biểu đồ nào. Bật 'Chỉnh sửa' để thêm." />
      ) : (
        <div className="report-grid">
          {widgets.map((w) => (
            <WidgetCell
              key={w.id}
              widget={w}
              onRemove={() => setWidgets((p) => p.filter((x) => x.id !== w.id))}
              editable={editing}
              onDrill={(info) =>
                setDrill({
                  dataset: w.dataset,
                  dimensions: w.dimensions,
                  metrics: w.metrics,
                  filters: w.filters,
                  slice: { dim: info.dim, value: info.value },
                  page: 1,
                  limit: 20,
                  chartTitle: w.title,
                })
              }
            />
          ))}
        </div>
      )}
      <DrillDrawer request={drill} onClose={() => setDrill(null)} />
    </BodyCard>
  );
}

// Ô thêm biểu đồ nhanh (dataset + chiều + chỉ số + loại chart), không cần quay
// lại tab Khám phá.
function AddWidgetBar({
  onAdd,
  sites,
}: {
  onAdd: (w: ReportWidgetConfig) => void;
  sites: { value: number; label: string }[];
}) {
  const [dataset, setDataset] = useState<'works' | 'incidents' | 'energy' | 'assets' | 'checklist'>('works');
  const [dimension, setDimension] = useState<string>('status');
  const [metric, setMetric] = useState<string>('count');
  const [chart, setChart] = useState<ReportWidgetConfig['chartType']>('bar');
  const [title, setTitle] = useState('');
  const [siteIds, setSiteIds] = useState<number[]>([]);

  const dims: Record<string, string[]> = {
    works: ['status', 'category', 'site', 'priority', 'month', 'assigner', 'handler'],
    incidents: ['damageType', 'repairType', 'picUnit', 'site', 'status', 'month'],
    energy: ['meterType', 'phase', 'meterCode', 'site', 'month'],
    assets: ['category', 'condition', 'usageStatus', 'site'],
    checklist: ['result', 'site', 'category', 'month'],
  };
  const mets: Record<string, string[]> = {
    works: ['count', 'completed', 'open', 'overdue', 'completionRate', 'avgProgress'],
    incidents: ['count', 'reopenSum', 'withSolution', 'solutionRate'],
    energy: ['totalConsumption', 'readingCount', 'meterCount'],
    assets: ['count', 'quantitySum'],
    checklist: ['count', 'pass', 'fail', 'passRate'],
  };

  return (
    <div className="report-add-widget">
      <Input
        placeholder="Tiêu đề ô (để trống = tự sinh)"
        style={{ width: 200 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Select
        value={dataset}
        style={{ width: 160 }}
        onChange={(v) => {
          setDataset(v);
          setDimension(dims[v][0]);
          setMetric(mets[v][0]);
        }}
        options={[
          { value: 'works', label: 'Công việc' },
          { value: 'incidents', label: 'Sự cố' },
          { value: 'energy', label: 'Năng lượng' },
          { value: 'assets', label: 'Tài sản' },
          { value: 'checklist', label: 'Chất lượng checklist' },
        ]}
      />
      <Select
        value={dimension}
        style={{ width: 160 }}
        onChange={setDimension}
        options={dims[dataset].map((d) => ({ value: d, label: d }))}
      />
      <Select
        value={metric}
        style={{ width: 160 }}
        onChange={setMetric}
        options={mets[dataset].map((m) => ({ value: m, label: m }))}
      />
      <Select
        value={chart}
        style={{ width: 150 }}
        onChange={setChart}
        options={[
          { value: 'bar', label: 'Cột' },
          { value: 'line', label: 'Đường' },
          { value: 'area', label: 'Vùng' },
          { value: 'donut', label: 'Donut' },
          { value: 'pie', label: 'Tròn' },
          { value: 'funnel', label: 'Phễu' },
          { value: 'gauge', label: 'Đồng hồ' },
          { value: 'radar', label: 'Radar' },
          { value: 'treemap', label: 'Treemap' },
          { value: 'table', label: 'Bảng' },
          { value: 'kpi', label: 'KPI' },
          { value: 'combo', label: 'Cột + đường' },
          { value: 'heatmap', label: 'Heatmap' },
        ]}
      />
      <Select
        mode="multiple"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder="Lọc dự án (tuỳ chọn)"
        style={{ width: 200 }}
        value={siteIds}
        onChange={setSiteIds}
        options={sites}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() =>
          onAdd({
            id: '',
            title: title || `${dataset} · ${dimension} · ${metric}`,
            dataset,
            chartType: chart,
            dimensions: [dimension],
            metrics: [metric],
            filters: siteIds.length ? { siteIds } : undefined,
            span: 12,
          })
        }
      >
        Thêm biểu đồ
      </Button>
    </div>
  );
}

function WidgetCell({
  widget,
  editable,
  onRemove,
  onDrill,
}: {
  widget: ReportWidgetConfig;
  editable: boolean;
  onRemove: () => void;
  onDrill: (info: ChartDrillInfo) => void;
}) {
  const { data, isLoading } = useReportQuery({
    dataset: widget.dataset,
    dimensions: widget.dimensions,
    metrics: widget.metrics,
    filters: widget.filters,
    limit: 1000,
  });
  return (
    <div className="report-grid-cell" style={{ gridColumn: `span ${widget.span ?? 12}` }}>
      <div className="report-grid-title">
        {widget.title}
        {editable ? (
          <Popconfirm title="Bỏ biểu đồ này?" okText="Bỏ" cancelText="Huỷ" onConfirm={onRemove}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ) : null}
      </div>
      <Spin spinning={isLoading}>
        {data ? (
          <ReportChart
            chartType={widget.chartType}
            data={data}
            height={280}
            showLabels={widget.showLabels}
            onDrill={onDrill}
          />
        ) : null}
      </Spin>
    </div>
  );
}
