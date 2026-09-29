// pages/assets/ui/SiteLocationManager — quản lý cây vị trí theo dự án.
// Dùng chung cho 2 nơi: trang sidebar "Vị trí" (/assets/locations) và card
// "Vị trí" trong trang "Danh mục dữ liệu" (/assets/droplists) — nhờ vậy
// không có 2 chỗ sửa cùng 1 bảng.
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  downloadLocationExport,
  flattenLocations,
  useCreateSiteLocation,
  useDeleteSiteLocation,
  useSiteLocations,
  useUpdateSiteLocation,
} from '@/entities/asset';
import type { SiteLocationFlat } from '@/entities/asset';
import { useSites } from '@/entities/work';
import { apiErrorMessage, downloadBlob } from '@/shared/lib';
import { BodyCard, Table, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { SiteLocationImportModal } from './SiteLocationImportModal';

const { Text } = Typography;

interface LocationFormValues {
  name: string;
  code?: string;
  parentId?: number;
  sortOrder?: number;
}

export interface SiteLocationManagerProps {
  /** Dòng mô tả hiển thị dưới tiêu đề card (giống các card danh mục khác). */
  description?: string;
}

export function SiteLocationManager({ description }: SiteLocationManagerProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [form] = Form.useForm<LocationFormValues>();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState<SiteLocationFlat | null>(null);

  const { data: sites = [] } = useSites();
  const { data: tree = [], isLoading } = useSiteLocations(siteId, !!siteId);
  const createMutation = useCreateSiteLocation();
  const updateMutation = useUpdateSiteLocation();
  const deleteMutation = useDeleteSiteLocation();

  useEffect(() => {
    if (siteId === undefined && sites.length > 0) setSiteId(sites[0].id);
  }, [siteId, sites]);

  const rows = useMemo(() => flattenLocations(tree), [tree]);

  function openCreate(parent?: SiteLocationFlat) {
    setEditing(null);
    form.resetFields();
    // Thêm vị trí con: mặc định cha là vị trí đang chọn
    form.setFieldsValue(
      parent
        ? { parentId: parent.id, sortOrder: 0 }
        : { parentId: undefined, sortOrder: rows.length },
    );
    setOpen(true);
  }

  function openEdit(row: SiteLocationFlat) {
    setEditing(row);
    form.resetFields();
    form.setFieldsValue({
      name: row.name,
      code: row.code ?? undefined,
      parentId: row.parentId ?? undefined,
      sortOrder: row.sortOrder,
    });
    setOpen(true);
  }

  async function handleSubmit() {
    if (!siteId) return;
    let values: LocationFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload = {
      siteId,
      name: values.name.trim(),
      code: values.code?.trim() || undefined,
      parentId: values.parentId ?? undefined,
      sortOrder: values.sortOrder ?? 0,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        messageApi.success('Đã cập nhật vị trí.');
      } else {
        await createMutation.mutateAsync(payload);
        messageApi.success('Đã thêm vị trí.');
      }
      setOpen(false);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Lưu vị trí thất bại.'));
    }
  }

  async function handleDelete(row: SiteLocationFlat) {
    try {
      await deleteMutation.mutateAsync(row.id);
      messageApi.success('Đã xoá vị trí (kèm vị trí con).');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá vị trí thất bại.'));
    }
  }

  // Không cho chọn chính nó / hậu duệ làm cha (backend cũng có chặn)
  const parentOptions = useMemo(
    () =>
      rows
        .filter((r) => !editing || r.id !== editing.id)
        .map((r) => ({
          value: r.id,
          label: `${'— '.repeat(r.depth)}${r.name}`,
        })),
    [rows, editing],
  );

  const columns: ColumnsType<SiteLocationFlat> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v: string | null) => (v ? <Text code>{v}</Text> : '—'),
    },
    {
      title: 'Tên vị trí',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, row) => (
        <span style={{ paddingLeft: row.depth * 18 }}>
          {row.depth > 0 && <span style={{ color: '#9aa4b2' }}>└ </span>}
          <Text strong={row.depth === 0}>{v}</Text>
        </span>
      ),
    },
    {
      title: 'Cấp',
      dataIndex: 'depth',
      key: 'depth',
      width: 90,
      align: 'right',
      render: (d: number) => <Tag style={{ borderRadius: 3 }}>Cấp {d + 1}</Tag>,
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 90,
      align: 'right',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            title="Thêm vị trí con"
            aria-label="Thêm vị trí con"
            onClick={() => openCreate(row)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="Sửa vị trí"
            aria-label="Sửa vị trí"
            onClick={() => openEdit(row)}
          />
          <Popconfirm
            title="Xoá vị trí này?"
            description="Toàn bộ vị trí con bên dưới cũng bị xoá."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(row)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá vị trí"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title="Vị trí theo dự án"
      extra={
        <Space>
          <Select
            showSearch
            style={{ width: 220 }}
            placeholder="Chọn dự án"
            optionFilterProp="label"
            value={siteId}
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
            onChange={setSiteId}
          />
          <Button
            icon={<CloudUploadOutlined />}
            onClick={() => setImportOpen(true)}
          >
            Nhập từ Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            disabled={!siteId}
            onClick={async () => {
              setExporting(true);
              try {
                const blob = await downloadLocationExport(siteId);
                downloadBlob(blob, 'danh-sach-vi-tri.xlsx');
              } catch (err) {
                messageApi.error(apiErrorMessage(err, 'Xuất Excel thất bại.'));
              } finally {
                setExporting(false);
              }
            }}
          >
            Xuất Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!siteId}
            onClick={() => openCreate()}
          >
            Thêm vị trí gốc
          </Button>
        </Space>
      }
    >
      {contextHolder}
      {description && (
        <Text
          type="secondary"
          style={{ display: 'block', marginBottom: 8 }}
        >
          {description}
        </Text>
      )}
      <Table<SiteLocationFlat>
        columns={columns}
        dataSource={rows}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 700 }}
        locale={{
          emptyText: siteId
            ? 'Dự án này chưa có vị trí — bấm “Thêm vị trí gốc” hoặc nhập từ Excel'
            : 'Chọn dự án trước',
        }}
      />
      <Modal
        title={editing ? 'Sửa vị trí' : 'Thêm vị trí'}
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
            label="Tên vị trí"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên vị trí.' }]}
          >
            <Input placeholder="VD: Phòng kế toán" />
          </Form.Item>
          <Form.Item label="Mã" name="code">
            <Input placeholder="VD: T1-HD-PKT" />
          </Form.Item>
          <Form.Item
            label="Vị trí cha"
            name="parentId"
            help="Bỏ trống = vị trí gốc của dự án"
          >
            <Select
              allowClear
              showSearch
              placeholder="Vị trí gốc"
              optionFilterProp="label"
              options={parentOptions}
            />
          </Form.Item>
          <Form.Item label="Thứ tự" name="sortOrder">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
      <SiteLocationImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </BodyCard>
  );
}
