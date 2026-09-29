// pages/shared/ui/DroplistCard — 1 card nhập dữ liệu cho 1 bảng droplist
// (dùng chung cho module Tài sản và module Ứng dụng).
// Mỗi card: tiêu đề + mô tả + bảng danh sách + nút Thêm / Sửa / Xoá.
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import {
  DROPLIST_META,
  useCreateDroplist,
  useDeleteDroplist,
  useDroplist,
  useUpdateDroplist,
} from '@/entities/droplist';
import type { DroplistItem, DroplistKey } from '@/entities/droplist';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';

const { Text } = Typography;

interface DroplistFormValues {
  code?: string;
  name: string;
}

export interface DroplistCardProps {
  droplistKey: DroplistKey;
}

export function DroplistCard({ droplistKey }: DroplistCardProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<DroplistFormValues>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DroplistItem | null>(null);

  const { data: items = [], isLoading } = useDroplist(droplistKey);
  const createMutation = useCreateDroplist(droplistKey);
  const updateMutation = useUpdateDroplist(droplistKey);
  const deleteMutation = useDeleteDroplist(droplistKey);
  const meta = DROPLIST_META[droplistKey];

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(item: DroplistItem) {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue({ name: item.name, code: item.code ?? undefined });
    setOpen(true);
  }

  async function handleSubmit() {
    let values: DroplistFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: values.name.trim(),
      code: values.code?.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success(`Đã cập nhật "${meta.label}".`);
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success(`Đã thêm vào "${meta.label}".`);
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu thất bại.'));
    }
  }

  async function handleDelete(item: DroplistItem) {
    try {
      await deleteMutation.mutateAsync(item.id);
      messageApi.success('Đã xoá (ẩn khỏi danh sách chọn).');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá thất bại.'));
    }
  }

  const columns: ColumnsType<DroplistItem> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (v: string | null) => (v ? <Text code>{v}</Text> : '—'),
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      render: (_, item) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="Sửa"
            aria-label={`Sửa ${item.name}`}
            onClick={() => openEdit(item)}
          />
          <Popconfirm
            title={`Xoá "${item.name}"?`}
            description="Dữ liệu đang dùng vẫn giữ nguyên, chỉ ẩn khỏi danh sách chọn."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(item)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá ${item.name}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title={meta.label}
      style={{ marginBottom: 16 }}
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          Thêm
        </Button>
      }
    >
      {contextHolder}
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        {meta.description}
      </Text>
      <Table<DroplistItem>
        columns={columns}
        dataSource={items}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: `Chưa có dòng nào trong "${meta.label}"` }}
      />
      <Modal
        title={editing ? `Sửa — ${meta.label}` : `Thêm — ${meta.label}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item label="Mã" name="code" help="Mã nội bộ, không bắt buộc">
            <Input placeholder="VD: SC_KHAN_CAP" />
          </Form.Item>
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
          >
            <Input placeholder="VD: Sửa chữa khẩn cấp" />
          </Form.Item>
        </Form>
      </Modal>
    </BodyCard>
  );
}
