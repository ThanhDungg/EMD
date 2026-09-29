import {
  ClockCircleOutlined,
  MessageOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  FloatButton,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  TreeSelect,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { locationPath, useAssets, useSiteLocations } from '@/entities/asset';
import { useDroplist } from '@/entities/droplist';
import type { SiteLocationNode } from '@/entities/asset';
import {
  useCreateWork,
  useDirectory,
  useSaveIncidentDetail,
  useSites,
  useUpdateWork,
} from '@/entities/work';
import type { WorkDetail } from '@/entities/work';
import { apiErrorMessage, formatDateTime } from '@/shared/lib';
import { BodyCard, ImageGallery } from '@/shared/ui';
import {
  CreatorMeta,
  LABEL_STYLE,
  PriorityBadge,
  StatusRibbon,
  VALUE_STYLE,
} from './WorkSummaryCard';
import { WorkHistoryTimeline } from './WorkHistoryTimeline';

const { Title } = Typography;

function personName(p: {
  accountName: string;
  fullName?: string | null;
}): string {
  return p.fullName?.trim() || p.accountName;
}

function formatDT(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDateTime(value);
  } catch {
    return String(value);
  }
}

// Bộ field chi tiết sự cố — dùng chung cho form tạo (CreateWorkModal) và
// form sửa trực tiếp ở trang chi tiết.
export interface IncidentFormValues {
  phase?: string;
  rbfRbw?: string;
  unit?: string;
  locationId?: number;
  assetId?: number;
  repairTypeId?: number;
  damageTypeId?: number;
  cause?: string;
  picUnitId?: number;
  solution?: string;
  nextWork?: string;
  reopenCount?: number;
  notes?: string;
}

interface LocationTreeNode {
  title: string;
  value: number;
  key: number;
  children: LocationTreeNode[];
}

/** Cây vị trí (theo dự án) → treeData cho TreeSelect. */
export function toTreeData(nodes: SiteLocationNode[]): LocationTreeNode[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    key: n.id,
    children: toTreeData(n.children ?? []),
  }));
}

// pages/work-detail — nội dung trang chi tiết sự cố (route /works/:id loại INCIDENT).
// Chỉ render phần content (sidebar giữ nguyên của layout chung).
export function IncidentDetailView({ detail }: { detail: WorkDetail }) {
  const navigate = useNavigate();
  const { data: sites = [] } = useSites();
  const { data: directory = [] } = useDirectory();
  const createMutation = useCreateWork();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const d = detail.incidentDetail;
  const handlers = detail.handlers ?? [];
  const attachments = [...(d?.beforeImages ?? []), ...(d?.afterImages ?? [])];

  // --- Form sửa trực tiếp chi tiết sự cố (cùng bộ field với lúc tạo) ---
  const [incidentForm] = Form.useForm<IncidentFormValues>();
  const saveDetailMutation = useSaveIncidentDetail();
  const updateWorkMutation = useUpdateWork();
  const [locationId, setLocationId] = useState<number | undefined>(
    d?.locationId ?? undefined,
  );
  const siteId = detail.site?.id;
  const { data: locations = [] } = useSiteLocations(siteId, true);
  const { data: repairTypes = [] } = useDroplist('repairType');
  const { data: damageTypes = [] } = useDroplist('damageType');
  const { data: picUnits = [] } = useDroplist('picUnit');
  const { data: locationAssets = [] } = useAssets(
    { locationId },
    locationId !== undefined,
  );

  const locationTree = useMemo(() => toTreeData(locations), [locations]);
  const assetOptions = useMemo(
    () =>
      locationAssets.map((a) => ({
        value: a.id,
        label: `${a.code} — ${a.name}`,
      })),
    [locationAssets],
  );

  // Nạp sẵn dữ liệu hiện có vào form (detail vừa tải xong).
  useEffect(() => {
    incidentForm.setFieldsValue({
      phase: d?.phase ?? undefined,
      rbfRbw: d?.rbfRbw ?? undefined,
      unit: d?.unit ?? undefined,
      locationId: d?.locationId ?? undefined,
      assetId: d?.assetId ?? undefined,
      repairTypeId: d?.repairTypeId ?? undefined,
      damageTypeId: d?.damageTypeId ?? undefined,
      cause: d?.cause ?? undefined,
      picUnitId: d?.picUnitId ?? undefined,
      solution: d?.solution ?? undefined,
      nextWork: d?.nextWork ?? undefined,
      reopenCount: d?.reopenCount ?? 0,
      notes: d?.notes ?? undefined,
    });
    setLocationId(d?.locationId ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.id, d?.locationId, d?.assetId, d?.phase, d?.notes, d?.picUnitId]);

  async function handleSaveDetail() {
    let values: IncidentFormValues;
    try {
      values = await incidentForm.validateFields();
    } catch {
      return;
    }
    const locationName =
      values.locationId === undefined
        ? undefined
        : (locationPath(locations, values.locationId) ?? undefined);
    const asset = locationAssets.find((a) => a.id === values.assetId);
    try {
      await saveDetailMutation.mutateAsync({
        workId: detail.id,
        payload: {
          phase: values.phase?.trim() || undefined,
          rbfRbw: values.rbfRbw?.trim() || undefined,
          unit: values.unit?.trim() || undefined,
          locationId: values.locationId ?? null,
          locationName,
          assetId: values.assetId ?? null,
          relatedAsset: asset ? `${asset.code} — ${asset.name}` : undefined,
          repairTypeId: values.repairTypeId ?? null,
          damageTypeId: values.damageTypeId ?? null,
          cause: values.cause?.trim() || undefined,
          picUnitId: values.picUnitId ?? null,
          solution: values.solution?.trim() || undefined,
          nextWork: values.nextWork?.trim() || undefined,
          reopenCount: values.reopenCount ?? 0,
          notes: values.notes?.trim() || undefined,
        },
      });
      // Vị trí của work lấy theo vị trí sự cố (cột "Vị trí" ở danh sách)
      if (locationName && locationName !== detail.location) {
        await updateWorkMutation.mutateAsync({
          id: detail.id,
          payload: { location: locationName },
        });
      }
      message.success('Đã lưu thông tin chi tiết sự cố.');
    } catch (err) {
      message.error(apiErrorMessage(err, 'Lưu thông tin sự cố thất bại.'));
    }
  }

  function openCreate() {
    form.setFieldsValue({
      siteId: detail.site?.id,
      handlerIds: handlers.map((h) => h.id),
    });
    setCreateOpen(true);
  }

  async function handleCreateSave() {
    try {
      const values = await form.validateFields();
      createMutation.mutate(
        {
          title: values.title,
          description: values.description || undefined,
          categoryId: detail.categoryId as number,
          priority: values.priority,
          siteId: values.siteId,
          location: values.location || undefined,
          handlerIds: values.handlerIds,
          startDate: values.startDate?.format('YYYY-MM-DD'),
          endDate: values.endDate?.format('YYYY-MM-DD'),
        },
        {
          onSuccess: (created) => {
            setCreateOpen(false);
            message.success('Đã tạo công việc liên quan');
            navigate(`/work/${created.id}`);
          },
          onError: (err) =>
            message.error(apiErrorMessage(err, 'Tạo công việc thất bại.')),
        },
      );
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('Tạo công việc thất bại');
    }
  }

  return (
    <>
      {/* Card tóm tắt sự cố */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <StatusRibbon status={detail.status} />
        <BodyCard>
          <Title level={5} style={{ margin: '8px 0 8px', fontWeight: 700 }}>
            {detail.title}
          </Title>
          <CreatorMeta workId={detail.id} assigner={detail.assigner} />
          <Divider style={{ margin: '12px 0' }} />
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
              {handlers.length > 0 ? (
                <Space size={6} wrap>
                  {handlers.map((h) => (
                    <Space key={h.id} size={4}>
                      <Avatar
                        size="small"
                        style={{ background: '#d13b3b', fontSize: 11 }}
                      >
                        {(personName(h).charAt(0) || 'U').toUpperCase()}
                      </Avatar>
                      <span>{personName(h)}</span>
                    </Space>
                  ))}
                </Space>
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Phân loại sự cố">
              {detail.incidentType?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày xảy ra sự cố">
              <Space size={4}>
                <ClockCircleOutlined style={{ color: '#9ba3b2' }} />
                {formatDT(detail.startDate)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Hạn hoàn thành">
              <Space size={4}>
                <ClockCircleOutlined style={{ color: '#9ba3b2' }} />
                {formatDT(detail.endDate)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày hoàn thành thực tế">
              <Space size={4}>
                <ClockCircleOutlined style={{ color: '#9ba3b2' }} />
                {formatDT(detail.completedAt)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Độ ưu tiên">
              <PriorityBadge priority={detail.priority} />
            </Descriptions.Item>
            <Descriptions.Item label="Đính kèm" span={4}>
              <ImageGallery
                files={attachments}
                size={48}
                emptyText="Chưa có file đính kèm"
              />
            </Descriptions.Item>
          </Descriptions>
        </BodyCard>
      </div>

      {/* Card thông tin chi tiết: sửa trực tiếp, đúng bộ field lúc tạo */}
      <BodyCard
        title="Thông tin chi tiết"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button size="small" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo công việc
            </Button>
            <Button
              type="primary"
              size="small"
              loading={
                saveDetailMutation.isPending || updateWorkMutation.isPending
              }
              onClick={handleSaveDetail}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        <Form form={incidentForm} layout="vertical" requiredMark="optional">
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Phase"
                name="phase"
                rules={[{ required: true, message: 'Vui lòng nhập Phase.' }]}
              >
                <Input placeholder="VD: Phase 1" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="RBF/RBW"
                name="rbfRbw"
                rules={[{ required: true, message: 'Vui lòng nhập RBF/RBW.' }]}
              >
                <Input placeholder="VD: RBF" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Unit"
                name="unit"
                rules={[{ required: true, message: 'Vui lòng nhập Unit.' }]}
              >
                <Input placeholder="VD: Unit A" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Vị trí sự cố"
                name="locationId"
                help={siteId ? undefined : 'Công việc chưa có dự án'}
                rules={[
                  { required: true, message: 'Vui lòng chọn vị trí sự cố.' },
                ]}
              >
                <TreeSelect
                  showSearch
                  treeDefaultExpandAll
                  treeNodeFilterProp="title"
                  disabled={!siteId}
                  placeholder={
                    siteId ? 'Chọn vị trí xảy ra sự cố' : 'Chọn Dự án trước'
                  }
                  treeData={locationTree}
                  onChange={(v) => {
                    setLocationId(v ?? undefined);
                    // Tài sản phải thuộc vị trí vừa chọn → xoá tài sản cũ
                    incidentForm.setFieldValue('assetId', undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Tài sản/Thiết bị liên quan"
                name="assetId"
                help={
                  locationId === undefined
                    ? 'Chọn vị trí sự cố trước để lọc tài sản'
                    : undefined
                }
              >
                <Select
                  allowClear
                  showSearch
                  disabled={locationId === undefined}
                  placeholder={
                    locationId === undefined
                      ? 'Chọn vị trí sự cố trước'
                      : 'Chọn tài sản/thiết bị tại vị trí này'
                  }
                  optionFilterProp="label"
                  options={assetOptions}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Phân loại sửa chữa"
                name="repairTypeId"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn phân loại sửa chữa.',
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn phân loại sửa chữa"
                  optionFilterProp="label"
                  options={repairTypes.map((x) => ({
                    value: x.id,
                    label: x.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Phân loại hư hỏng"
                name="damageTypeId"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn phân loại hư hỏng.',
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn phân loại hư hỏng"
                  optionFilterProp="label"
                  options={damageTypes.map((x) => ({
                    value: x.id,
                    label: x.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Đơn vị phụ trách (PIC)"
                name="picUnitId"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn đơn vị phụ trách.',
                  },
                ]}
              >
                <Select
                  showSearch
                  allowClear
                  placeholder="Chọn đơn vị phụ trách"
                  optionFilterProp="label"
                  options={picUnits.map((x) => ({
                    value: x.id,
                    label: x.name,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Nguyên nhân"
                name="cause"
                rules={[
                  { required: true, message: 'Vui lòng nhập nguyên nhân.' },
                ]}
              >
                <Input.TextArea rows={2} placeholder="Nguyên nhân sự cố" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Giải pháp khắc phục"
                name="solution"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng nhập giải pháp khắc phục.',
                  },
                ]}
              >
                <Input.TextArea
                  rows={2}
                  placeholder="Giải pháp đã/kế hoạch xử lý"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
                label="Công việc tiếp theo"
                name="nextWork"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng nhập công việc tiếp theo.',
                  },
                ]}
              >
                <Input.TextArea rows={2} placeholder="Công việc cần làm tiếp" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Số lần Re-Open"
                name="reopenCount"
                rules={[
                  { required: true, message: 'Vui lòng nhập số lần Re-Open.' },
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item label="Ghi chú" name="notes">
                <Input.TextArea rows={2} placeholder="Ghi chú thêm về sự cố" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </BodyCard>

      {/* Card tiến độ: empty state khi chưa có dữ liệu */}
      <BodyCard title="Tiến độ công việc" style={{ marginBottom: 16 }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có cập nhật tiến độ"
        />
      </BodyCard>

      {/* Card lịch sử: timeline từ bảng work_status_histories */}
      <WorkHistoryTimeline workId={detail.id} />

      {/* Nút chat nổi góc phải */}
      <FloatButton
        icon={<MessageOutlined style={{ color: '#fff' }} />}
        tooltip="Chat nội bộ"
        onClick={() => message.info('Tính năng chat nội bộ sắp ra mắt')}
        style={{ right: 16, bottom: 16, background: '#075ac4' }}
      />

      {/* Modal tạo công việc liên quan từ sự cố */}
      <Modal
        title="Tạo công việc liên quan"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreateSave}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={createMutation.isPending}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="Tiêu đề"
            name="title"
            rules={[{ required: true, message: 'Nhập tiêu đề' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Độ ưu tiên" name="priority">
            <Select
              allowClear
              placeholder="Chọn độ ưu tiên"
              options={[
                { value: 'LOW', label: 'Thấp' },
                { value: 'MEDIUM', label: 'Trung bình' },
                { value: 'HIGH', label: 'Cao' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Dự án" name="siteId">
            <Select
              allowClear
              placeholder="Chọn dự án"
              options={sites.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item label="Vị trí" name="location">
            <Input />
          </Form.Item>
          <Form.Item label="Người xử lý" name="handlerIds">
            <Select
              mode="multiple"
              placeholder="Chọn người xử lý"
              optionFilterProp="label"
              options={directory.map((u) => ({
                value: u.id,
                label: u.fullName?.trim() || u.accountName,
              }))}
            />
          </Form.Item>
          <Form.Item label="Ngày bắt đầu" name="startDate">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Hạn hoàn thành" name="endDate">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
