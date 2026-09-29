// pages/app/ui/ContractListPage — khai báo master data: danh sách hợp đồng (có
// phân trang). Bấm vào 1 hợp đồng → trang chi tiết.
import { PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CONTRACT_TERM_LABEL,
  CONTRACT_TYPE_LABEL,
  useContracts,
  useDeleteContract,
} from '@/entities/contract';
import type {
  Contract,
  ContractTermType,
  ContractType,
} from '@/entities/contract';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { CreateContractModal } from './CreateContractModal';

const { Text } = Typography;
const PAGE_SIZE = 20;

function siteLabel(contract: Contract): string {
  const names = contract.siteLinks
    .map((l) => l.site?.name)
    .filter((n): n is string => !!n);
  if (names.length === 0) return '—';
  return names.length > 2
    ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
    : names.join(', ');
}

function formatDate(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('vi-VN');
}

export function ContractListPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: contracts = [], isLoading } = useContracts();
  const deleteMutation = useDeleteContract();

  async function handleDelete(contract: Contract) {
    try {
      await deleteMutation.mutateAsync(contract.id);
      messageApi.success('Đã xoá hợp đồng.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá hợp đồng thất bại.'));
    }
  }

  const columns: ColumnsType<Contract> = [
    {
      title: 'Mã hợp đồng',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Tên công ty',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 220,
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Tên loại hợp đồng',
      dataIndex: 'typeName',
      key: 'typeName',
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Loại hợp đồng',
      dataIndex: 'contractType',
      key: 'contractType',
      width: 170,
      render: (v: ContractType) => (
        <Tag color={v === 'INPUT' ? 'blue' : 'green'}>
          {CONTRACT_TYPE_LABEL[v]}
        </Tag>
      ),
    },
    {
      title: 'Loại hình dịch vụ',
      dataIndex: ['serviceType', 'name'],
      key: 'serviceType',
      width: 150,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Dự án',
      key: 'sites',
      width: 220,
      render: (_, c) => <EllipsisText text={siteLabel(c)} />,
    },
    {
      title: 'Thời gian',
      key: 'dates',
      width: 200,
      render: (_, c) => (
        <span>
          {formatDate(c.startDate)} →{' '}
          {c.termType === 'OPEN_ENDED' ? '…' : formatDate(c.endDate)}
        </span>
      ),
    },
    {
      title: 'Loại thời gian',
      dataIndex: 'termType',
      key: 'termType',
      width: 150,
      render: (v: ContractTermType) => CONTRACT_TERM_LABEL[v],
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, c) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/app/contracts/${c.id}`)}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title={`Xoá hợp đồng "${c.code}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(c)}
          >
            <Button type="text" danger size="small" aria-label="Xoá hợp đồng">
              Xoá
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <BodyCard
        title="Danh sách hợp đồng"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Thêm hợp đồng
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Hợp đồng thuộc nhiều dự án — bấm vào 1 hợp đồng để xem thông tin chi
          tiết và đường dẫn tài liệu.
        </Text>
        <Table<Contract>
          columns={columns}
          dataSource={contracts}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{ emptyText: 'Chưa có hợp đồng nào — bấm “Thêm hợp đồng”' }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} hợp đồng`,
            hideOnSinglePage: false,
          }}
          onRow={(c) => ({
            onClick: () => navigate(`/app/contracts/${c.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </BodyCard>

      <CreateContractModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          navigate(`/app/contracts/${created.id}`);
        }}
      />
    </>
  );
}
