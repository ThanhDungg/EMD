// pages/report/ui/ReportListPage — danh sách bảng báo cáo: của tôi + được
// chia sẻ. Mỗi bảng đi theo người dùng: tự tạo, tự xem, chia sẻ khi cần.
import { DeleteOutlined, EditOutlined, PlusOutlined, ShareAltOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentUserId,
  useCreateDashboard,
  useDashboards,
  useDeleteDashboard,
  useUpdateDashboard,
} from '@/entities/report';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import type { ReportDashboard } from '@/entities/report';
import { ReportShareModal } from './ReportShareModal';

const { Text } = Typography;

export function ReportListPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [tab, setTab] = useState<'all' | 'mine' | 'shared'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReportDashboard | null>(null);
  const [sharing, setSharing] = useState<ReportDashboard | null>(null);
  const [form] = Form.useForm<{ title: string; description?: string }>();

  const { data: dashboards = [], isLoading } = useDashboards(tab);
  const createMutation = useCreateDashboard();
  const updateMutation = useUpdateDashboard();
  const deleteMutation = useDeleteDashboard();
  const saving = createMutation.isPending || updateMutation.isPending;
  const meId = getCurrentUserId();

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(d: ReportDashboard) {
    setEditing(d);
    form.resetFields();
    form.setFieldsValue({
      title: d.title,
      description: d.description ?? undefined,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    let values: { title: string; description?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: {
            title: values.title.trim(),
            description: values.description?.trim() || undefined,
          },
        });
        messageApi.success('Đã cập nhật bảng báo cáo.');
      } else {
        const created = await createMutation.mutateAsync({
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
        });
        messageApi.success('Đã tạo bảng báo cáo.');
        setModalOpen(false);
        // Sang màn xem để thêm biểu đồ ngay (route xem là /report/view/:id).
        navigate(`/report/view/${created.id}`);
        return;
      }
      setModalOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu bảng báo cáo thất bại.'));
    }
  }

  async function handleDelete(d: ReportDashboard) {
    try {
      await deleteMutation.mutateAsync(d.id);
      messageApi.success('Đã xoá bảng báo cáo.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá bảng báo cáo thất bại.'));
    }
  }

  const columns: ColumnsType<ReportDashboard> = [
    {
      title: 'Tên bảng',
      dataIndex: 'title',
      key: 'title',
      render: (v: string, d) => (
        <Button
          type="link"
          style={{ padding: 0, fontWeight: 600 }}
          onClick={() => navigate(`/report/view/${d.id}`)}
        >
          {v}
        </Button>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Chủ sở hữu',
      key: 'owner',
      width: 200,
      render: (_, d) => (
        <Space>
          <EllipsisText
            text={d.owner?.fullName || d.owner?.accountName || `#${d.ownerId}`}
          />
          {meId !== null && d.ownerId === meId && (
            <Tag color="blue">Của tôi</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Số biểu đồ',
      key: 'charts',
      width: 110,
      align: 'right',
      render: (_, d) => d._count?.charts ?? d.charts?.length ?? 0,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 130,
      render: (_, d) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label={`Sửa ${d.title}`}
            onClick={() => openEdit(d)}
          />
          <Button
            type="text"
            size="small"
            icon={<ShareAltOutlined />}
            aria-label={`Chia sẻ ${d.title}`}
            onClick={() => setSharing(d)}
          />
          <Popconfirm
            title={`Xoá bảng "${d.title}"?`}
            description="Toàn bộ biểu đồ trong bảng cũng bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(d)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá ${d.title}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <BodyCard
        title="Bảng báo cáo"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={openCreate}
          >
            Tạo bảng mới
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Mỗi bảng đi theo người dùng: bạn tự tạo biểu đồ của mình, chia sẻ cho
          người khác hoặc nhóm khi cần.
        </Text>
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as typeof tab)}
          items={[
            { key: 'all', label: 'Tất cả' },
            { key: 'mine', label: 'Của tôi' },
            { key: 'shared', label: 'Được chia sẻ' },
          ]}
        />
        <Table<ReportDashboard>
          columns={columns}
          dataSource={dashboards}
          rowKey="id"
          size="small"
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: 'Chưa có bảng nào — bấm “Tạo bảng mới”' }}
        />
      </BodyCard>

      <Modal
        title={editing ? 'Sửa bảng báo cáo' : 'Tạo bảng báo cáo'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        okText={editing ? 'Lưu' : 'Tạo'}
        cancelText="Huỷ"
        confirmLoading={saving}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Tên bảng"
            name="title"
            rules={[{ required: true, message: 'Vui lòng nhập tên bảng.' }]}
          >
            <Input placeholder="VD: Báo cáo tuần dự án A" />
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} placeholder="Bảng này theo dõi gì..." />
          </Form.Item>
        </Form>
      </Modal>

      <ReportShareModal
        open={sharing !== null}
        dashboard={sharing}
        onClose={() => setSharing(null)}
      />
    </>
  );
}
