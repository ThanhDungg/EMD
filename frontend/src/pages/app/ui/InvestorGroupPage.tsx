// pages/app/ui/InvestorGroupPage — danh mục chủ đầu tư cha: mã, tên, tên viết
// tắt. Là droplist (key `investorGroup`) nhưng có thêm ô tên viết tắt.
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
import type { DroplistItem } from '@/entities/droplist';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';

const { Text } = Typography;
const KEY = 'investorGroup' as const;

interface GroupFormValues {
  code?: string;
  name?: string;
  shortName?: string;
}

export function InvestorGroupPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DroplistItem | null>(null);
  const [form] = Form.useForm<GroupFormValues>();

  const { data: groups = [], isLoading } = useDroplist(KEY);
  const createMutation = useCreateDroplist(KEY);
  const updateMutation = useUpdateDroplist(KEY);
  const deleteMutation = useDeleteDroplist(KEY);
  const meta = DROPLIST_META[KEY];

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(item: DroplistItem) {
    setEditing(item);
    form.resetFields();
    form.setFieldsValue({
      code: item.code ?? undefined,
      name: item.name,
      shortName: item.shortName ?? undefined,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    let values: GroupFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code?.trim() || undefined,
      name: values.name?.trim() ?? '',
      shortName: values.shortName?.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật chủ đầu tư cha.');
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success('Đã thêm chủ đầu tư cha.');
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu chủ đầu tư cha thất bại.'));
    }
  }

  async function handleDelete(item: DroplistItem) {
    try {
      await deleteMutation.mutateAsync(item.id);
      messageApi.success('Đã xoá chủ đầu tư cha.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá chủ đầu tư cha thất bại.'));
    }
  }

  const columns: ColumnsType<DroplistItem> = [
    {
      title: 'Mã chủ đầu tư cha',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (v: string | null) => <Text strong>{v ?? '—'}</Text>,
    },
    {
      title: 'Tên chủ đầu tư cha',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => v,
    },
    {
      title: 'Tên viết tắt',
      dataIndex: 'shortName',
      key: 'shortName',
      width: 160,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, item) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label="Sửa chủ đầu tư cha"
            onClick={() => openEdit(item)}
          />
          <Popconfirm
            title={`Xoá "${item.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(item)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá chủ đầu tư cha"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title="Danh mục chủ đầu tư cha"
      extra={
        <Button
          size="small"
          type="primary"
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
        dataSource={groups}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: 'Chưa có chủ đầu tư cha nào' }}
      />

      <Modal
        title={editing ? 'Sửa chủ đầu tư cha' : 'Thêm chủ đầu tư cha'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item label="Mã chủ đầu tư cha" name="code">
            <Input placeholder="VD: GDLT" />
          </Form.Item>
          <Form.Item
            label="Tên chủ đầu tư cha"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
          >
            <Input placeholder="VD: Tập đoàn Đầu tư & Phát triển" />
          </Form.Item>
          <Form.Item label="Tên viết tắt" name="shortName">
            <Input placeholder="VD: TĐT" />
          </Form.Item>
        </Form>
      </Modal>
    </BodyCard>
  );
}
