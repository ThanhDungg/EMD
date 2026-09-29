// pages/app/ui/SiteDetailTables — 5 bảng con theo dự án, mỗi bảng 1 card:
// 1. Nhân viên của dự án  2. Nhà cung cấp dịch vụ  3. Nhà thầu
// 4. Thông tin liên lạc đối tác  5. Unit
// Mọi bảng đều thêm/sửa/xoá được ngay tại chỗ (modal nhỏ), cột STT đánh
// số thứ tự.
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { useDirectory } from '@/entities/work';
import type { DirectoryUser } from '@/entities/work';
import {
  useCreateSiteDetail,
  useDeleteSiteDetail,
  useSiteDetails,
  useUpdateSiteDetail,
} from '@/entities/site';
import type {
  SiteMemberRow,
  SitePartnerRow,
  SiteUnitRow,
} from '@/entities/site';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType, ColumnType } from '@/shared/ui';

const { Text } = Typography;

/** Cột STT — đánh số thứ tự theo dataSource. */
function sttColumn<T>(): ColumnType<T> {
  return {
    title: 'STT',
    key: 'stt',
    width: 60,
    align: 'right',
    render: (_: unknown, __: unknown, index: number) => index + 1,
  };
}

function personName(u: {
  accountName: string;
  fullName?: string | null;
}): string {
  return u.fullName?.trim() || u.accountName;
}

function phoneOf(u: { phone?: string | null; internalPhone?: string | null }) {
  return u.phone?.trim() || u.internalPhone?.trim() || '';
}

export interface SiteDetailTablesProps {
  siteId: number;
}

export function SiteDetailTables({ siteId }: SiteDetailTablesProps) {
  return (
    <>
      <MemberTable siteId={siteId} />
      <PartnerTable siteId={siteId} kind="serviceProviders" />
      <PartnerTable siteId={siteId} kind="contractors" />
      <PartnerTable siteId={siteId} kind="partnerContacts" />
      <UnitTable siteId={siteId} />
    </>
  );
}

// ---------------- 1. Nhân viên của dự án ----------------

function MemberTable({ siteId }: { siteId: number }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SiteMemberRow | null>(null);
  const [form] = Form.useForm<{ userId?: number }>();
  const { data: directory = [] } = useDirectory();
  const { data: rows = [], isLoading } = useSiteDetails<SiteMemberRow>(
    'members',
    siteId,
  );
  const createMutation = useCreateSiteDetail('members');
  const updateMutation = useUpdateSiteDetail('members');
  const deleteMutation = useDeleteSiteDetail('members');

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(row: SiteMemberRow) {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({ userId: row.user.id });
    setOpen(true);
  }

  async function handleSubmit() {
    let values: { userId?: number };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!values.userId) {
      messageApi.error('Vui lòng chọn nhân viên.');
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload: { userId: values.userId },
        });
        messageApi.success('Đã cập nhật nhân viên.');
      } else {
        await createMutation.mutateAsync({ siteId, userId: values.userId });
        messageApi.success('Đã thêm nhân viên vào dự án.');
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu nhân viên thất bại.'));
    }
  }

  async function handleDelete(row: SiteMemberRow) {
    try {
      await deleteMutation.mutateAsync(row.id);
      messageApi.success('Đã xoá nhân viên khỏi dự án.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá nhân viên thất bại.'));
    }
  }

  const columns: ColumnsType<SiteMemberRow> = [
    sttColumn<SiteMemberRow>(),
    {
      title: 'Tên nhân viên',
      key: 'name',
      width: 200,
      render: (_, r) => <Text strong>{personName(r.user)}</Text>,
    },
    {
      title: 'Email',
      dataIndex: ['user', 'email'],
      key: 'email',
      width: 220,
      render: (v: string) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Số điện thoại',
      key: 'phone',
      width: 150,
      render: (_, r) => phoneOf(r.user) || '—',
    },
    {
      title: 'Vị trí công việc',
      key: 'position',
      width: 180,
      render: (_, r) => r.user.position?.name ?? '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label="Sửa nhân viên"
            onClick={() => openEdit(r)}
          />
          <Popconfirm
            title="Xoá nhân viên khỏi dự án?"
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(r)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá nhân viên"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title="Nhân viên của dự án"
      style={{ marginBottom: 16 }}
      extra={
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm
        </Button>
      }
    >
      {contextHolder}
      <Table<SiteMemberRow>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: 'Chưa có nhân viên trong dự án' }}
      />
      <Modal
        title={editing ? 'Đổi nhân viên' : 'Thêm nhân viên'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Nhân viên"
            name="userId"
            help="Tên, email, số điện thoại và vị trí công việc lấy theo hồ sơ nhân viên"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên.' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn nhân viên"
              options={directory.map((u: DirectoryUser) => ({
                value: u.id,
                label: personName(u),
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </BodyCard>
  );
}

// ---------------- 2/3/4. Nhà cung cấp dịch vụ · Nhà thầu · Liên lạc đối tác ----------------

const PARTNER_LABEL: Record<
  'serviceProviders' | 'contractors' | 'partnerContacts',
  { title: string; nameLabel: string; namePlaceholder: string }
> = {
  serviceProviders: {
    title: 'Nhà cung cấp dịch vụ',
    nameLabel: 'Tên nhà cung cấp',
    namePlaceholder: 'VD: Cty PCCC Hùng Vũ',
  },
  contractors: {
    title: 'Nhà thầu',
    nameLabel: 'Tên nhà thầu',
    namePlaceholder: 'VD: Cty xây dựng An Phú',
  },
  partnerContacts: {
    title: 'Thông tin liên lạc đối tác',
    nameLabel: 'Thông tin liên lạc',
    namePlaceholder: 'VD: Anh Nguyễn Văn A — phòng kỹ thuật',
  },
};

function PartnerTable({
  siteId,
  kind,
}: {
  siteId: number;
  kind: 'serviceProviders' | 'contractors' | 'partnerContacts';
}) {
  const meta = PARTNER_LABEL[kind];
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SitePartnerRow | null>(null);
  const [form] = Form.useForm<{ name?: string; email?: string; phone?: string }>();
  const { data: rows = [], isLoading } = useSiteDetails<SitePartnerRow>(
    kind,
    siteId,
  );
  const createMutation = useCreateSiteDetail(kind);
  const updateMutation = useUpdateSiteDetail(kind);
  const deleteMutation = useDeleteSiteDetail(kind);

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(row: SitePartnerRow) {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({ name: row.name, email: row.email ?? undefined, phone: row.phone ?? undefined });
    setOpen(true);
  }

  async function handleSubmit() {
    let values: { name?: string; email?: string; phone?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      name: values.name?.trim() || undefined,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật.');
      } else {
        await createMutation.mutateAsync({ siteId, ...payload });
        messageApi.success('Đã thêm.');
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu thất bại.'));
    }
  }

  async function handleDelete(row: SitePartnerRow) {
    try {
      await deleteMutation.mutateAsync(row.id);
      messageApi.success('Đã xoá.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá thất bại.'));
    }
  }

  const columns: ColumnsType<SitePartnerRow> = [
    sttColumn<SitePartnerRow>(),
    {
      title: meta.nameLabel,
      dataIndex: 'name',
      key: 'name',
      width: 260,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 240,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label="Sửa"
            onClick={() => openEdit(r)}
          />
          <Popconfirm
            title={`Xoá "${r.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(r)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title={meta.title}
      style={{ marginBottom: 16 }}
      extra={
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm
        </Button>
      }
    >
      {contextHolder}
      <Table<SitePartnerRow>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: `Chưa có dữ liệu — ${meta.title}` }}
      />
      <Modal
        title={`${editing ? 'Sửa' : 'Thêm'} — ${meta.title}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label={meta.nameLabel}
            name="name"
            rules={[{ required: true, message: `Vui lòng nhập ${meta.nameLabel.toLowerCase()}.` }]}
          >
            <Input placeholder={meta.namePlaceholder} />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input placeholder="VD: lienhe@congty.com" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input placeholder="VD: 090 123 4567" />
          </Form.Item>
        </Form>
      </Modal>
    </BodyCard>
  );
}

// ---------------- 5. Unit ----------------

function UnitTable({ siteId }: { siteId: number }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SiteUnitRow | null>(null);
  const [form] = Form.useForm<{
    code?: string;
    name?: string;
    area?: number;
    status?: string;
    notes?: string;
  }>();
  const { data: rows = [], isLoading } = useSiteDetails<SiteUnitRow>(
    'units',
    siteId,
  );
  const createMutation = useCreateSiteDetail('units');
  const updateMutation = useUpdateSiteDetail('units');
  const deleteMutation = useDeleteSiteDetail('units');

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(row: SiteUnitRow) {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      code: row.code,
      name: row.name,
      area: row.area === null || row.area === undefined ? undefined : Number(row.area),
      status: row.status ?? undefined,
      notes: row.notes ?? undefined,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    let values: {
      code?: string;
      name?: string;
      area?: number;
      status?: string;
      notes?: string;
    };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      code: values.code?.trim() || undefined,
      name: values.name?.trim() || undefined,
      area: values.area ?? null,
      status: values.status?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật Unit.');
      } else {
        await createMutation.mutateAsync({ siteId, ...payload });
        messageApi.success('Đã thêm Unit.');
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu Unit thất bại.'));
    }
  }

  async function handleDelete(row: SiteUnitRow) {
    try {
      await deleteMutation.mutateAsync(row.id);
      messageApi.success('Đã xoá Unit.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá Unit thất bại.'));
    }
  }

  const columns: ColumnsType<SiteUnitRow> = [
    sttColumn<SiteUnitRow>(),
    {
      title: 'Mã nhà kho/xương/văn phòng',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Tên công ty/khách thuê',
      dataIndex: 'name',
      key: 'name',
      width: 240,
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Diện tích (m²)',
      dataIndex: 'area',
      key: 'area',
      width: 130,
      align: 'right',
      render: (v: string | number | null) =>
        v === null || v === undefined ? '—' : Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Tình trạng',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (v: string | null) =>
        v ? <Tag>{v}</Tag> : '—',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 220,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 90,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            aria-label="Sửa Unit"
            onClick={() => openEdit(r)}
          />
          <Popconfirm
            title={`Xoá "${r.code}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(r)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá Unit"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title="Unit"
      style={{ marginBottom: 16 }}
      extra={
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm
        </Button>
      }
    >
      {contextHolder}
      <Table<SiteUnitRow>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        locale={{ emptyText: 'Chưa có Unit' }}
      />
      <Modal
        title={editing ? 'Sửa Unit' : 'Thêm Unit'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Lưu' : 'Thêm'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            label="Mã nhà kho/xương/văn phòng"
            name="code"
            rules={[{ required: true, message: 'Vui lòng nhập mã.' }]}
          >
            <Input placeholder="VD: KHO-01" />
          </Form.Item>
          <Form.Item
            label="Tên công ty/khách thuê"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên.' }]}
          >
            <Input placeholder="VD: Cty CP ABC" />
          </Form.Item>
          <Form.Item label="Diện tích (m²)" name="area">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Tình trạng" name="status">
            <Input placeholder="VD: Đang cho thuê" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </BodyCard>
  );
}
