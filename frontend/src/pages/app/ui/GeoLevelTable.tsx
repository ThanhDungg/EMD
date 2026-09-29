// pages/app/ui/GeoLevelTable — bảng nhập liệu 1 tầng địa lý (dùng chung cho
// trang "Dữ liệu input": quốc gia, tỉnh thành, phường xã). Tầng con hiện sau
// khi chọn tầng trên; thêm/sửa/xoá tại chỗ.
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import {
  useCreateGeoItem,
  useDeleteGeoItem,
  useGeoList,
  useUpdateGeoItem,
} from '@/entities/geo';
import type { GeoItem, GeoKey } from '@/entities/geo';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';

const { Text } = Typography;

export interface GeoLevelTableProps {
  level: GeoKey;
  title: string;
  /** Tầng trên (VD tỉnh thành lấy theo miền, phường xã lấy theo tỉnh). */
  parentKey?: GeoKey;
  parentLabel?: string;
}

export function GeoLevelTable({
  level,
  title,
  parentKey,
  parentLabel,
}: GeoLevelTableProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [parentId, setParentId] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState<GeoItem | null>(null);
  const [form] = Form.useForm<{ name?: string; code?: string }>();

  const { data: parents = [] } = useGeoList(
    (parentKey ?? 'country') as GeoKey,
    parentId,
    !!parentKey,
  );
  const { data: rows = [], isLoading } = useGeoList(
    level,
    parentId,
    !parentKey || !!parentId,
  );
  const createMutation = useCreateGeoItem(level);
  const updateMutation = useUpdateGeoItem(level);
  const deleteMutation = useDeleteGeoItem(level);

  function openEdit(row: GeoItem) {
    setEditing(row);
    form.setFieldsValue({ name: row.name, code: row.code ?? undefined });
  }

  async function handleSubmit() {
    let values: { name?: string; code?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: values.name?.trim() ?? '',
      code: values.code?.trim() || undefined,
      ...(parentKey ? { parentId } : {}),
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success(`Đã cập nhật ${title.toLowerCase()}.`);
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success(`Đã thêm ${title.toLowerCase()}.`);
      }
      setEditing(null);
      form.resetFields();
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu thất bại.'));
    }
  }

  async function handleDelete(row: GeoItem) {
    try {
      await deleteMutation.mutateAsync(row.id);
      messageApi.success('Đã xoá.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá thất bại.'));
    }
  }

  const columns: ColumnsType<GeoItem> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (v: string | null) => v ?? '—',
    },
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, row) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label={`Sửa ${row.name}`}
            onClick={() => openEdit(row)}
          />
          <Popconfirm
            title={`Xoá "${row.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(row)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xoá ${row.name}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard title={title} style={{ marginBottom: 16 }}>
      {contextHolder}
      {parentKey && (
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            style={{ width: 260 }}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={`Chọn ${parentLabel?.toLowerCase()}`}
            value={parentId}
            options={parents.map((p) => ({ value: p.id, label: p.name }))}
            onChange={(v) => {
              setParentId(v);
              setEditing(null);
              form.resetFields();
            }}
          />
        </Space>
      )}
      <Table<GeoItem>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{
          emptyText: parentKey
            ? `Chọn ${parentLabel?.toLowerCase()} trước`
            : `Chưa có ${title.toLowerCase()}`,
        }}
      />
      <Form
        form={form}
        layout="inline"
        style={{ marginTop: 12, rowGap: 8 }}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          rules={[{ required: true, message: `Nhập tên ${title.toLowerCase()}.` }]}
        >
          <Input style={{ width: 240 }} placeholder={`Tên ${title.toLowerCase()}`} />
        </Form.Item>
        <Form.Item name="code">
          <Input style={{ width: 140 }} placeholder="Mã (không bắt buộc)" />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!!parentKey && !parentId}
              onClick={handleSubmit}
            >
              {editing ? 'Lưu' : 'Thêm'}
            </Button>
            {editing && (
              <Button
                onClick={() => {
                  setEditing(null);
                  form.resetFields();
                }}
              >
                Huỷ
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
      {parentKey && (
        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          Chỉ hiện dữ liệu thuộc {parentLabel?.toLowerCase()} đang chọn.
        </Text>
      )}
    </BodyCard>
  );
}
