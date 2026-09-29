// pages/app/ui/CustomerListPage — danh mục kiểm tra năng lượng: danh sách khách
// hàng (có phân trang). Bấm vào 1 khách hàng → trang chi tiết.
import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CUSTOMER_STATUS_LABEL, useCustomers, useDeleteCustomer } from '@/entities/customer';
import type { Customer, CustomerStatus } from '@/entities/customer';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { CreateCustomerModal } from './CreateCustomerModal';

const { Text } = Typography;
const PAGE_SIZE = 20;

function siteLabel(customer: Customer): string {
  const names = customer.siteLinks
    .map((l) => l.site?.name)
    .filter((n): n is string => !!n);
  if (names.length === 0) return '—';
  return names.length > 2
    ? `${names.slice(0, 2).join(', ')} +${names.length - 2}`
    : names.join(', ');
}

export function CustomerListPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: customers = [], isLoading } = useCustomers();
  const deleteMutation = useDeleteCustomer();

  async function handleDelete(customer: Customer) {
    try {
      await deleteMutation.mutateAsync(customer.id);
      messageApi.success('Đã xoá khách hàng.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá khách hàng thất bại.'));
    }
  }

  const columns: ColumnsType<Customer> = [
    {
      title: 'Mã khách hàng',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: 'Tên khách hàng',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Tên viết tắt',
      dataIndex: 'shortName',
      key: 'shortName',
      width: 150,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      width: 130,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Hotline',
      dataIndex: 'hotline',
      key: 'hotline',
      width: 130,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Dự án',
      key: 'sites',
      width: 240,
      render: (_, c) => (
        <EllipsisText text={siteLabel(c)} />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: CustomerStatus) => (
        <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>
          {CUSTOMER_STATUS_LABEL[v]}
        </Tag>
      ),
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
            onClick={() => navigate(`/app/customers/${c.id}`)}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title={`Xoá khách hàng "${c.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(c)}
          >
            <Button type="text" danger size="small" aria-label="Xoá khách hàng">
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
        title="Danh sách khách hàng"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Thêm khách hàng
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Khách hàng thuộc nhiều dự án — bấm vào 1 khách hàng để xem và sửa thông
          tin chi tiết.
        </Text>
        <Table<Customer>
          columns={columns}
          dataSource={customers}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{ emptyText: 'Chưa có khách hàng nào — bấm “Thêm khách hàng”' }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} khách hàng`,
            hideOnSinglePage: false,
          }}
          onRow={(c) => ({
            onClick: () => navigate(`/app/customers/${c.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </BodyCard>

      <CreateCustomerModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          navigate(`/app/customers/${created.id}`);
        }}
      />
    </>
  );
}
