// pages/report/ui/ChartBuilderModal — dựng/sửa 1 biểu đồ: chọn nguồn số liệu,
// kiểu biểu đồ, chiều gom nhóm và bộ lọc riêng đi theo biểu đồ, xem trước.
import {
  Alert,
  Col,
  Divider,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  CHART_TYPE_LABEL,
  useCreateChart,
  useReportData,
  useReportMeta,
  useUpdateChart,
} from '@/entities/report';
import type { ChartFilters, ChartType, ReportChart } from '@/entities/report';
import { apiErrorMessage } from '@/shared/lib';
import { ChartContent } from './charts/ChartContent';
import { ChartFilterField } from './ChartFilterField';
import { useReportFilterOptions } from './useReportFilterOptions';

const { Text } = Typography;

interface Props {
  open: boolean;
  dashboardId: number;
  editing: ReportChart | null;
  onClose: () => void;
}

export function ChartBuilderModal({ open, dashboardId, editing, onClose }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: meta = [], isLoading: metaLoading } = useReportMeta();
  const createMutation = useCreateChart();
  const updateMutation = useUpdateChart();
  const saving = createMutation.isPending || updateMutation.isPending;

  const [title, setTitle] = useState('');
  const [dataset, setDataset] = useState('');
  const [chartType, setChartType] = useState<ChartType>('BAR');
  const [metric, setMetric] = useState('count');
  const [dimension, setDimension] = useState<string | null>(null);
  const [filters, setFilters] = useState<ChartFilters>({});

  // Nạp config khi mở sửa; tạo mới thì mặc định dataset đầu tiên.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDataset(editing.dataset);
      setChartType(editing.chartType);
      setMetric(editing.metric || 'count');
      setDimension(editing.dimension ?? null);
      setFilters({ ...(editing.filters ?? {}) });
    } else {
      setTitle('');
      const first = meta[0];
      setDataset(first?.dataset ?? '');
      setChartType((first?.chartTypes[0] as ChartType) ?? 'BAR');
      setMetric(first?.metrics[0]?.value ?? 'count');
      setDimension(first?.dimensions[0]?.value ?? null);
      setFilters({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const datasetMeta = useMemo(
    () => meta.find((m) => m.dataset === dataset),
    [meta, dataset],
  );

  function pickDataset(next: string) {
    const m = meta.find((d) => d.dataset === next);
    setDataset(next);
    setChartType((m?.chartTypes[0] as ChartType) ?? 'BAR');
    setMetric(m?.metrics[0]?.value ?? 'count');
    setDimension(m?.dimensions[0]?.value ?? null);
    setFilters((prev) => ({ ...prev, statusId: undefined }));
  }

  function pickChartType(next: ChartType) {
    setChartType(next);
    if (next === 'MAP') {
      const sites = meta.find((d) => d.dataset === 'sites');
      if (sites) {
        setDataset('sites');
        setMetric(sites.metrics[0]?.value ?? 'count');
      }
      setDimension('map');
    } else if (dimension === 'map') {
      setDimension(datasetMeta?.dimensions[0]?.value ?? null);
    }
  }

  function setFilter(key: string, value: unknown) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === null || value === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      // Đổi loại việc thì trạng thái cũ không còn đúng — xoá để chọn lại.
      if (key === 'categoryId') delete next.statusId;
      return next;
    });
  }

  // Options cho các lọc theo ID (dùng chung với thanh filter trên thẻ biểu đồ).
  const categoryId = (filters.categoryId as number | undefined) ?? undefined;
  const filterOptions = useReportFilterOptions(categoryId, open);

  const previewPayload =
    open && dataset
      ? { dataset, metric, dimension, filters, limit: 20 }
      : null;
  const preview = useReportData(previewPayload, open);

  async function handleSave() {
    if (!title.trim()) {
      messageApi.error('Vui lòng nhập tên biểu đồ.');
      return;
    }
    if (!dataset) {
      messageApi.error('Vui lòng chọn nguồn số liệu.');
      return;
    }
    try {
      const payload = {
        title: title.trim(),
        chartType,
        dataset,
        metric,
        dimension,
        filters,
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật biểu đồ.');
      } else {
        await createMutation.mutateAsync({ dashboardId, payload });
        messageApi.success('Đã thêm biểu đồ.');
      }
      onClose();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu biểu đồ thất bại.'));
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText={editing ? 'Lưu' : 'Thêm'}
      cancelText="Huỷ"
      confirmLoading={saving}
      title={editing ? 'Sửa biểu đồ' : 'Thêm biểu đồ'}
      width={1020}
      destroyOnClose
      zIndex={1200}
    >
      {contextHolder}
      {metaLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Row gutter={24}>
          <Col span={10}>
            <Form layout="vertical">
              <Form.Item label="Tên biểu đồ" required>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Việc theo trạng thái"
                />
              </Form.Item>
              <Form.Item label="Nguồn số liệu">
                <Select
                  value={dataset || undefined}
                  options={meta.map((m) => ({ value: m.dataset, label: m.label }))}
                  onChange={pickDataset}
                />
              </Form.Item>
              <Form.Item label="Kiểu biểu đồ">
                <Select
                  value={chartType}
                  options={(datasetMeta?.chartTypes ?? []).map((t) => ({
                    value: t,
                    label: CHART_TYPE_LABEL[t as ChartType] ?? t,
                  }))}
                  onChange={(v) => pickChartType(v as ChartType)}
                />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label="Số liệu">
                    <Select
                      value={metric}
                      options={(datasetMeta?.metrics ?? []).map((m) => ({
                        value: m.value,
                        label: m.label,
                      }))}
                      onChange={setMetric}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Gom nhóm theo"
                    help={chartType === 'KPI' ? 'KPI hiển thị tổng, không cần gom nhóm' : undefined}
                  >
                    <Select
                      allowClear={chartType !== 'MAP'}
                      disabled={chartType === 'MAP'}
                      placeholder="Không gom (tổng)"
                      value={dimension ?? undefined}
                      options={(datasetMeta?.dimensions ?? [])
                        .filter((d) => d.value !== 'map')
                        .map((d) => ({ value: d.value, label: d.label }))}
                      onChange={(v) => setDimension(v ?? null)}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {(datasetMeta?.filters.length ?? 0) > 0 && (
                <>
                  <Divider orientation="left" style={{ margin: '8px 0 12px' }}>
                    Bộ lọc mặc định của biểu đồ
                  </Divider>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    Đây là lọc cố định khi mở báo cáo. Người xem vẫn có thể tự
                    chỉnh thêm trên thanh bộ lọc của từng biểu đồ.
                  </Text>
                  {datasetMeta?.filters.map((f) => (
                    <Form.Item key={f.value} label={f.label} style={{ marginBottom: 12 }}>
                      <ChartFilterField
                        filter={f}
                        filters={filters}
                        options={filterOptions}
                        categoryId={categoryId}
                        onChange={setFilter}
                      />
                    </Form.Item>
                  ))}
                </>
              )}
            </Form>
          </Col>
          <Col span={14}>
            <Divider orientation="left" style={{ margin: '0 0 12px' }}>
              Xem trước
            </Divider>
            {preview.isLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : preview.isError ? (
              <Alert
                type="error"
                showIcon
                message={apiErrorMessage(preview.error, 'Tải số liệu thất bại.')}
              />
            ) : (
              <ChartContent
                chartType={chartType}
                result={preview.data}
                height={340}
              />
            )}
          </Col>
        </Row>
      )}
    </Modal>
  );
}
