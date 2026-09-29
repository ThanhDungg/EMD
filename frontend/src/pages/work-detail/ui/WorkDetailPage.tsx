import {
  ArrowLeftOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CHECKLIST_RESULT_LABEL,
  normalizeValueType,
  useChecklistTree,
  useDeleteWork,
  useDirectory,
  useSites,
  useStatusesByCategory,
  useUpdateWork,
  useWorkDetail,
} from '@/entities/work';
import type { ChecklistTreeNode } from '@/entities/work';
import { apiErrorMessage, formatDateTime } from '@/shared/lib';
import { BodyCard, EllipsisText, ImageGallery, Table, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { IncidentDetailView } from './IncidentDetailView';
import { EnergyDetailView } from './EnergyDetailView';
import { WorkHistoryTimeline } from './WorkHistoryTimeline';
import { WorkSummaryCard } from './WorkSummaryCard';

const { Text } = Typography;

function formatTakenAt(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return formatDateTime(value);
  } catch {
    return String(value);
  }
}

// Bảng checklist phẳng (luôn mở, không nút sổ đóng): row cha merge full hàng
// chỉ show tiêu đề, row con show full thông tin.
// Đủ 8 cột theo thứ tự: Tiêu đề (tên), Tiêu chuẩn kiểm tra, Số lượng, Giá trị,
// Đính kèm, Checkpoint (lat/long thiết bị gửi lên), Trạng thái (Đạt/Không đạt),
// Ghi chú. Kiểu của cột Giá trị do Loại giá trị của mẫu quyết định
// (BOOLEAN = Đúng/Sai · TEXT = chữ · NUMBER = số).
const PARENT_COL_SPAN = 9;

// Mẫu 2 cấp: dòng nhóm là dòng CÓ nội dung con, không phải dòng không có
// parentId (mọi nội dung nạp từ mẫu đều không có cha).
interface FlatChecklistNode extends ChecklistTreeNode {
  hasChildren: boolean;
}

function parentCell(record: FlatChecklistNode) {
  return record.hasChildren ? { colSpan: 0 } : {};
}

// Giá trị hiển thị theo loại giá trị của dòng (Đúng/Sai · Chữ · Số).
function renderChecklistValue(record: FlatChecklistNode) {
  if (record.hasChildren) return '';
  const v = record.value;
  if (v === null || v === undefined || v === '') return '—';
  const kind = normalizeValueType(record.valueType);
  if (kind === 'BOOLEAN') {
    const truthy = v === true || v === 'true' || v === 1 || v === '1';
    return (
      <Tag status={truthy ? 'success' : 'default'}>
        {truthy ? 'Đúng' : 'Sai'}
      </Tag>
    );
  }
  if (kind === 'NUMBER') return Number(v).toLocaleString('vi-VN');
  return <EllipsisText text={String(v)} />;
}

const CHECKLIST_COLUMNS: ColumnsType<FlatChecklistNode> = [
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    key: 'title',
    width: 220,
    render: (value: string, record: FlatChecklistNode) =>
      record.hasChildren ? (
        <strong>{value}</strong>
      ) : (
        <EllipsisText text={value} />
      ),
    onCell: (record: FlatChecklistNode) =>
      record.hasChildren ? { colSpan: PARENT_COL_SPAN } : {},
  },
  {
    title: 'Tiêu chuẩn kiểm tra',
    dataIndex: 'standard',
    key: 'standard',
    width: 220,
    render: (
      value: ChecklistTreeNode['standard'],
      record: FlatChecklistNode,
    ) => (record.hasChildren ? '' : <EllipsisText text={value ?? ''} />),
    onCell: parentCell,
  },
  {
    title: 'Số lượng',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 100,
    align: 'right',
    render: (
      value: ChecklistTreeNode['quantity'],
      record: FlatChecklistNode,
    ) =>
      record.hasChildren
        ? ''
        : value === null || value === undefined || value === ''
          ? '—'
          : Number(value).toLocaleString('vi-VN'),
    onCell: parentCell,
  },
  {
    title: 'Giá trị',
    dataIndex: 'value',
    key: 'value',
    width: 130,
    render: (_: ChecklistTreeNode['value'], record: FlatChecklistNode) =>
      renderChecklistValue(record),
    onCell: parentCell,
  },
  {
    title: 'Đính kèm',
    dataIndex: 'attachments',
    key: 'attachments',
    width: 150,
    render: (
      value: ChecklistTreeNode['attachments'],
      record: FlatChecklistNode,
    ) =>
      record.hasChildren ? (
        ''
      ) : value && value.length > 0 ? (
        <ImageGallery files={value} size={40} />
      ) : (
        '—'
      ),
    onCell: parentCell,
  },
  {
    title: 'Checkpoint',
    dataIndex: 'photoLat',
    key: 'photoLat',
    width: 150,
    render: (_: unknown, record: FlatChecklistNode) => {
      if (record.hasChildren) return '';
      if (record.photoLat === null && record.photoLng === null) return '—';
      return (
        <EllipsisText
          text={`${record.photoLat ?? '—'} , ${record.photoLng ?? '—'}`}
        />
      );
    },
    onCell: parentCell,
  },
  {
    title: 'Trạng thái',
    dataIndex: 'result',
    key: 'result',
    width: 140,
    render: (value: ChecklistTreeNode['result'], record: FlatChecklistNode) => {
      if (record.hasChildren) return '';
      if (value === 'PASS')
        return <Tag status="success">{CHECKLIST_RESULT_LABEL.PASS}</Tag>;
      if (value === 'FAIL')
        return <Tag status="danger">{CHECKLIST_RESULT_LABEL.FAIL}</Tag>;
      return <Tag style={{ borderRadius: 3 }}>Chưa đánh giá</Tag>;
    },
    onCell: parentCell,
  },
  {
    title: 'Ghi chú',
    dataIndex: 'notes',
    key: 'notes',
    width: 190,
    render: (value: ChecklistTreeNode['notes'], record: FlatChecklistNode) =>
      record.hasChildren ? '' : <EllipsisText text={value ?? ''} />,
    onCell: parentCell,
  },
];

// Nhãn trạng thái Đạt/Không đạt cho bản export CSV.
function resultLabel(record: FlatChecklistNode): string | null {
  if (record.result === 'PASS') return CHECKLIST_RESULT_LABEL.PASS;
  if (record.result === 'FAIL') return CHECKLIST_RESULT_LABEL.FAIL;
  return null;
}

// Dàn cây cha-con thành list phẳng cha → con (không expand/collapse).
// Xóa hẳn key children ở row đã dàn để antd không sinh nút +/- và hàng nested.
function flattenChecklist(nodes: ChecklistTreeNode[]): FlatChecklistNode[] {
  const out: FlatChecklistNode[] = [];
  for (const n of nodes) {
    const { children, ...rest } = n;
    out.push({
      ...(rest as ChecklistTreeNode),
      hasChildren: (children?.length ?? 0) > 0,
    });
    if (children && children.length > 0) {
      out.push(...flattenChecklist(children));
    }
  }
  return out;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
] as const;

function personLabel(p: {
  accountName: string;
  fullName?: string | null;
}): string {
  return p.fullName?.trim() || p.accountName;
}

// pages/work-detail — trang chi tiết 1 công việc (route /works/:id).
// Mở từ link cột Tiêu đề ở bảng danh sách, nút quay lại về trang trước.
// Work loại Checklist thì hiện thêm cây nội dung cha-con bên dưới.
export function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workId = Number(id);
  const { data: detail, isLoading: loading, isError } = useWorkDetail(workId);
  const isChecklist = detail?.category?.code === 'CHECKLIST';
  const isIncident = detail?.category?.code === 'INCIDENT';
  const isEnergy = detail?.category?.code === 'ENERGY_CHECK';
  const { data: tree = [], isLoading: treeLoading } = useChecklistTree(
    detail?.id,
    isChecklist,
  );
  // Dữ liệu cho form sửa + select trạng thái
  const { data: sites = [] } = useSites();
  const { data: directory = [] } = useDirectory();
  const { data: statuses = [] } = useStatusesByCategory(detail?.categoryId);
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm();
  // Modal xác nhận chuyển trạng thái: chọn status mới + nhập ghi chú lưu lịch sử
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const updateMutation = useUpdateWork();
  const deleteMutation = useDeleteWork();

  function handleBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate('/work', { replace: true });
  }

  const failed = isError || (!loading && !detail);
  const flatRows = useMemo(() => flattenChecklist(tree), [tree]);

  // Options người xử lý: danh bạ + người đang gắn trên việc.
  const handlerOptions = useMemo(() => {
    const map = new Map<
      number,
      { id: number; accountName: string; fullName?: string | null }
    >();
    for (const u of directory) map.set(u.id, u);
    if (detail?.assigner && !map.has(detail.assigner.id))
      map.set(detail.assigner.id, detail.assigner);
    for (const h of detail?.handlers ?? []) {
      if (!map.has(h.id)) map.set(h.id, h);
    }
    return [...map.values()];
  }, [directory, detail]);

  // Chọn status mới → mở box xác nhận + nhập ghi chú lưu lịch sử.
  function handleStatusChange(statusId: number) {
    if (!detail || statusId === detail.status?.id) return;
    setPendingStatusId(statusId);
    setStatusNote('');
  }

  function closeStatusConfirm() {
    setPendingStatusId(null);
    setStatusNote('');
  }

  // Xác nhận chuyển trạng thái (kèm ghi chú lưu vào lịch sử).
  function confirmStatusChange() {
    if (!detail || pendingStatusId === null) return;
    const note = statusNote.trim() || undefined;
    updateMutation.mutate(
      {
        id: detail.id,
        payload: { statusId: pendingStatusId, statusNote: note },
      },
      {
        onSuccess: () => {
          closeStatusConfirm();
          message.success('Đã chuyển trạng thái');
        },
        onError: (error) =>
          message.error(apiErrorMessage(error, 'Chuyển trạng thái thất bại.')),
      },
    );
  }

  // Xoá mềm công việc rồi về trang chủ.
  function handleDelete() {
    if (!detail) return;
    deleteMutation.mutate(detail.id, {
      onSuccess: () => {
        message.success('Đã xóa công việc');
        navigate('/work', { replace: true });
      },
      onError: (error) =>
        message.error(apiErrorMessage(error, 'Xóa thất bại.')),
    });
  }

  // Export CSV (mở được bằng Excel): thông tin việc + cây checklist.
  function handleExport() {
    if (!detail) return;
    const rows: string[][] = [
      ['Công việc', detail.title],
      ['Trạng thái', detail.status?.name ?? ''],
      ['Tiến độ', `${detail.progress ?? 0}%`],
      ['Dự án', detail.site?.name ?? ''],
      ['Vị trí', detail.location ?? ''],
      ['Từ ngày', (detail.startDate ?? '').slice(0, 10)],
      ['Đến ngày', (detail.endDate ?? '').slice(0, 10)],
      [],
      [
        'Tiêu đề',
        'Tiêu chuẩn kiểm tra',
        'Số lượng',
        'Giá trị',
        'Đính kèm',
        'Checkpoint',
        'Thời gian chụp',
        'Trạng thái',
        'Ghi chú',
      ],
      ...flatRows.map((n) => [
        n.title,
        n.hasChildren ? '' : (n.standard ?? ''),
        n.hasChildren ? '' : (n.quantity?.toString() ?? ''),
        n.hasChildren ? '' : (n.value?.toString() ?? ''),
        n.hasChildren ? '' : (n.attachments ?? []).join(' '),
        n.hasChildren ? '' : `${n.photoLat ?? '—'} , ${n.photoLng ?? '—'}`,
        n.hasChildren ? '' : formatTakenAt(n.photoTakenAt),
        n.hasChildren ? '' : (resultLabel(n) ?? 'Chưa đánh giá'),
        n.hasChildren ? '' : (n.notes ?? ''),
      ]),
    ];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-${detail.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Mở modal sửa với giá trị hiện tại.
  function openEdit() {
    if (!detail) return;
    form.setFieldsValue({
      title: detail.title,
      description: detail.description ?? undefined,
      priority: detail.priority ?? undefined,
      siteId: detail.site?.id ?? undefined,
      location: detail.location ?? undefined,
      progress: detail.progress ?? 0,
      handlerIds: (detail.handlers ?? []).map((h) => h.id),
      startDate: detail.startDate ? dayjs(detail.startDate) : undefined,
      endDate: detail.endDate ? dayjs(detail.endDate) : undefined,
      completedAt: detail.completedAt ? dayjs(detail.completedAt) : undefined,
    });
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!detail) return;
    try {
      const values = await form.validateFields();
      updateMutation.mutate(
        {
          id: detail.id,
          payload: {
            title: values.title,
            description: values.description || undefined,
            priority: values.priority,
            siteId: values.siteId,
            location: values.location || undefined,
            progress: values.progress,
            handlerIds: values.handlerIds,
            startDate: values.startDate?.format('YYYY-MM-DD'),
            endDate: values.endDate?.format('YYYY-MM-DD'),
            completedAt: values.completedAt?.format('YYYY-MM-DD'),
          },
        },
        {
          onSuccess: () => {
            setEditOpen(false);
            message.success('Đã lưu thay đổi');
          },
          onError: (error) =>
            message.error(apiErrorMessage(error, 'Lưu thất bại.')),
        },
      );
    } catch (err) {
      // Lỗi validate form thì antd đã highlight sẵn; còn lại bỏ qua ở đây
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('Lưu thất bại, kiểm tra lại các trường.');
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
          gap: 12,
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Quay lại
        </Button>
        {detail && !loading && (
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
            <Button icon={<EditOutlined />} onClick={openEdit}>
              Chỉnh sửa
            </Button>
            <Select
              placeholder="Chuyển trạng thái"
              value={detail.status?.id}
              loading={updateMutation.isPending}
              onChange={handleStatusChange}
              options={statuses.map((s) => ({ value: s.id, label: s.name }))}
              style={{ width: 180 }}
            />
            <Popconfirm
              title="Xóa công việc này?"
              description="Công việc bị xoá mềm, khôi phục được."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={handleDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        )}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : failed || !detail ? (
        <BodyCard title="Chi tiết công việc">
          <Text type="secondary">Không tải được công việc #{id}.</Text>
        </BodyCard>
      ) : (
        <>
          {isIncident ? (
            <IncidentDetailView detail={detail} />
          ) : (
            <WorkSummaryCard detail={detail} />
          )}
          {isChecklist && (
            <BodyCard title="Nội dung checklist">
              <Table<FlatChecklistNode>
                columns={CHECKLIST_COLUMNS}
                dataSource={flatRows}
                rowKey="id"
                loading={treeLoading}
                pagination={false}
                resizable
                striped
                tableLayout="fixed"
                expandable={{ showExpandColumn: false }}
                onRow={(record) =>
                  record.parentId === null
                    ? { style: { background: '#f3f5f9', fontWeight: 600 } }
                    : {}
                }
              />
            </BodyCard>
          )}
          {isEnergy && (
            <div style={{ marginTop: 16 }}>
              <EnergyDetailView workId={detail.id} />
            </div>
          )}
          {!isIncident && (
            <div style={{ marginTop: 16 }}>
              <WorkHistoryTimeline workId={detail.id} />
            </div>
          )}
        </>
      )}
      {/* Modal chỉnh sửa công việc */}
      <Modal
        title="Chỉnh sửa công việc"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleEditSave}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={updateMutation.isPending}
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
              options={PRIORITY_OPTIONS.map((o) => ({ ...o }))}
            />
          </Form.Item>
          <Form.Item label="Dự án" name="siteId">
            <Select
              allowClear
              placeholder="Chọn dự án"
              options={sites.map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          {/* Sự cố lấy Vị trí từ cây "Vị trí sự cố" (card Thông tin chi tiết)
              nên không sửa Vị trí của work ở đây. */}
          {!isIncident && (
            <Form.Item label="Vị trí" name="location">
              <Input placeholder="VD: Tầng 1 - 3" />
            </Form.Item>
          )}
          <Form.Item label="Tiến độ (%)" name="progress">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Người xử lý" name="handlerIds">
            <Select
              mode="multiple"
              placeholder="Chọn người xử lý"
              optionFilterProp="label"
              options={handlerOptions.map((u) => ({
                value: u.id,
                label: personLabel(u),
              }))}
            />
          </Form.Item>
          <Form.Item label="Ngày bắt đầu" name="startDate">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Hạn hoàn thành" name="endDate">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ngày hoàn thành thực tế" name="completedAt">
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      {/* Box xác nhận chuyển trạng thái + nhập ghi chú lưu lịch sử */}
      <Modal
        title="Xác nhận chuyển trạng thái"
        open={pendingStatusId !== null}
        onCancel={closeStatusConfirm}
        onOk={confirmStatusChange}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={updateMutation.isPending}
        destroyOnClose
      >
        <p>
          Chuyển từ <strong>{detail?.status?.name ?? 'Chưa đặt'}</strong> sang{' '}
          <strong>
            {statuses.find((s) => s.id === pendingStatusId)?.name ?? ''}
          </strong>
          ?
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Nhập thông tin chuyển trạng thái (lưu vào lịch sử)..."
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
        />
      </Modal>
    </div>
  );
}
