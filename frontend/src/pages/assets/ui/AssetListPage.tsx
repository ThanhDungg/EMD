// pages/assets/ui/AssetListPage — màn danh sách tài sản / thiết bị của module
// Tài sản. Lọc theo dự án (site) → vị trí → danh mục / trạng thái / tình trạng.
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  Popconfirm,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import {
  downloadAssetExport,
  useAssets,
  useDeleteAsset,
  useSiteLocations,
} from '@/entities/asset';
import type {
  AssetFilters,
  AssetItem,
  SiteLocationNode,
} from '@/entities/asset';
import { useDroplist } from '@/entities/droplist';
import { useSites } from '@/entities/work';
import { apiErrorMessage, downloadBlob, formatDate } from '@/shared/lib';
import { BodyCard, EllipsisText, Table, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { AssetFormModal } from './AssetFormModal';
import { AssetImportModal } from './AssetImportModal';

const { Text } = Typography;

// Màu tag theo code của tình trạng (droplist) — code lạ thì để mặc định.
const CONDITION_STATUS: Record<
  string,
  'success' | 'warning' | 'danger' | 'default'
> = {
  TOT: 'success',
  KHA: 'warning',
  CAN_BT: 'warning',
  HU: 'danger',
  NGUNG: 'default',
};

export function AssetListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [keyword, setKeyword] = useState('');
  const [siteId, setSiteId] = useState<number | undefined>(undefined);
  const [locationId, setLocationId] = useState<number | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [usageStatusId, setUsageStatusId] = useState<number | undefined>(
    undefined,
  );
  const [conditionId, setConditionId] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState<AssetItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: sites = [] } = useSites();
  const { data: locations = [] } = useSiteLocations(siteId);
  const { data: categories = [] } = useDroplist('category');
  const { data: usageStatuses = [] } = useDroplist('usageStatus');
  const { data: conditions = [] } = useDroplist('condition');

  // params phải memo để không đổi queryKey mỗi render
  const filters: AssetFilters = useMemo(
    () => ({
      keyword: keyword.trim() || undefined,
      siteId,
      locationId,
      categoryId,
      usageStatusId,
      conditionId,
    }),
    [keyword, siteId, locationId, categoryId, usageStatusId, conditionId],
  );
  const { data: assets = [], isLoading, refetch } = useAssets(filters);
  const deleteMutation = useDeleteAsset();

  // Đường dẫn đầy đủ của vị trí (VD "Tầng 1 / Hành chính / Phòng kế toán").
  // Vị trí thuộc site khác với site đang lọc thì không có trong cây → dùng tên node.
  const pathById = useMemo(
    () =>
      new Map(locationPathOptions(locations).map((o) => [o.value, o.label])),
    [locations],
  );

  const locationLabel = (asset: AssetItem) => {
    if (!asset.locationId) return '—';
    return pathById.get(asset.locationId) ?? asset.location?.name ?? '—';
  };

  async function handleDelete(asset: AssetItem) {
    try {
      await deleteMutation.mutateAsync(asset.id);
      messageApi.success('Đã xoá tài sản.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá tài sản thất bại.'));
    }
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(asset: AssetItem) {
    setEditing(asset);
    setFormOpen(true);
  }

  const columns: ColumnsType<AssetItem> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      fixed: 'left',
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Tên tài sản',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Danh mục tài sản',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 170,
      render: (_: unknown, a: AssetItem) => a.category?.name ?? '—',
    },
    {
      title: 'Dự án',
      dataIndex: ['location', 'site', 'name'],
      key: 'site',
      width: 150,
      render: (_: unknown, a: AssetItem) => a.location?.site?.name ?? '—',
    },
    {
      title: 'Vị trí',
      dataIndex: 'locationId',
      key: 'location',
      width: 240,
      render: (_: unknown, a: AssetItem) => (
        <EllipsisText text={locationLabel(a)} />
      ),
    },
    {
      title: 'Ngày sử dụng',
      dataIndex: 'usageDate',
      key: 'usageDate',
      width: 130,
      render: (v: string | null) => (v ? formatDate(v) : '—'),
    },
    {
      title: 'Trạng thái dùng',
      dataIndex: ['usageStatus', 'name'],
      key: 'usageStatus',
      width: 140,
      render: (_: unknown, a: AssetItem) =>
        a.usageStatus ? (
          <Tag style={{ borderRadius: 3 }}>{a.usageStatus.name}</Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Tình trạng',
      dataIndex: ['condition', 'name'],
      key: 'condition',
      width: 150,
      render: (_: unknown, a: AssetItem) =>
        a.condition ? (
          <Tag
            style={{ borderRadius: 3 }}
            status={CONDITION_STATUS[a.condition.code ?? ''] ?? 'default'}
          >
            {a.condition.name}
          </Tag>
        ) : (
          '—'
        ),
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 150,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Xuất xứ',
      dataIndex: 'origin',
      key: 'origin',
      width: 120,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Model',
      dataIndex: 'model',
      key: 'model',
      width: 140,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (v: string | number | null, a: AssetItem) => {
        if (v === null || v === undefined) return '—';
        return `${Number(v).toLocaleString('vi-VN')}${
          a.unit ? ` ${a.unit.name}` : ''
        }`;
      },
    },
    {
      title: 'Hạn bảo hành',
      dataIndex: 'warrantyEnd',
      key: 'warrantyEnd',
      width: 130,
      render: (v: string | null) => (v ? formatDate(v) : '—'),
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 200,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Thông tin chi tiết',
      dataIndex: 'detail',
      key: 'detail',
      width: 240,
      render: (v: string | null) => <EllipsisText text={v ?? '—'} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, a) => (
        <Space>
          <Tooltip title="Sửa tài sản">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(a)}
              aria-label="Sửa tài sản"
            />
          </Tooltip>
          <Popconfirm
            title="Xoá tài sản này?"
            description="Bản ghi bị xoá mềm, có thể khôi phục."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(a)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label="Xoá tài sản"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <BodyCard
      title="Danh sách tài sản"
      extra={
        <Space>
          <Tooltip title="Tải lại">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              aria-label="Tải lại"
            />
          </Tooltip>
          <Button
            icon={<CloudUploadOutlined />}
            onClick={() => setImportOpen(true)}
          >
            Nhập từ Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const blob = await downloadAssetExport(filters);
                downloadBlob(blob, 'danh-sach-tai-san.xlsx');
              } catch (err) {
                messageApi.error(apiErrorMessage(err, 'Xuất Excel thất bại.'));
              } finally {
                setExporting(false);
              }
            }}
          >
            Xuất Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm tài sản
          </Button>
        </Space>
      }
    >
      {contextHolder}
      <Space wrap style={{ marginBottom: 12 }}>
        <Input.Search
          allowClear
          placeholder="Tìm mã / tên / model / nhà cung cấp"
          style={{ width: 280 }}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Select
          allowClear
          showSearch
          placeholder="Dự án"
          style={{ width: 180 }}
          optionFilterProp="label"
          value={siteId}
          options={sites.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(v) => {
            setSiteId(v);
            setLocationId(undefined);
          }}
        />
        <Select
          allowClear
          showSearch
          disabled={!siteId}
          placeholder="Vị trí"
          style={{ width: 200 }}
          optionFilterProp="label"
          value={locationId}
          options={locationPathOptions(locations)}
          onChange={setLocationId}
        />
        <Select
          allowClear
          showSearch
          placeholder="Danh mục"
          style={{ width: 180 }}
          optionFilterProp="label"
          value={categoryId}
          options={categories.map((d) => ({ value: d.id, label: d.name }))}
          onChange={setCategoryId}
        />
        <Select
          allowClear
          placeholder="Trạng thái dùng"
          style={{ width: 160 }}
          value={usageStatusId}
          options={usageStatuses.map((d) => ({ value: d.id, label: d.name }))}
          onChange={setUsageStatusId}
        />
        <Select
          allowClear
          placeholder="Tình trạng"
          style={{ width: 160 }}
          value={conditionId}
          options={conditions.map((d) => ({ value: d.id, label: d.name }))}
          onChange={setConditionId}
        />
      </Space>
      <Table<AssetItem>
        columns={columns}
        dataSource={assets}
        rowKey="id"
        loading={isLoading}
        resizable
        striped
        scroll={{ x: 2900 }}
        locale={{ emptyText: 'Chưa có tài sản' }}
        pagination={{ pageSize: 20, showTotal: (t) => `${t} tài sản` }}
      />
      <AssetFormModal
        open={formOpen}
        asset={editing}
        onClose={() => setFormOpen(false)}
      />
      <AssetImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </BodyCard>
  );
}

/** Options vị trí dạng phẳng, nhãn là đường dẫn đầy đủ. */
function locationPathOptions(
  nodes: SiteLocationNode[],
): { value: number; label: string }[] {
  const out: { value: number; label: string }[] = [];
  const walk = (list: SiteLocationNode[], trail: string[]) => {
    for (const n of list) {
      const next = [...trail, n.name];
      out.push({ value: n.id, label: next.join(' / ') });
      walk(n.children ?? [], next);
    }
  };
  walk(nodes, []);
  return out;
}
