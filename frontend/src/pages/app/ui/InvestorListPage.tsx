// pages/app/ui/InvestorListPage — khai báo master data: danh sách chủ đầu tư
// (có phân trang). Bấm vào 1 chủ đầu tư → trang chi tiết.
import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Form,
  Modal,
  Popconfirm,
  Space,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateInvestor,
  useDeleteInvestor,
  useInvestors,
} from '@/entities/investor';
import type { Investor } from '@/entities/investor';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { toInvestorPayload } from '../model/investor';
import type { InvestorFormValues } from '../model/investor';
import { InvestorProfileFields } from './InvestorProfileFields';

const { Text } = Typography;
const PAGE_SIZE = 20;

export function InvestorListPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<InvestorFormValues>();

  const { data: investors = [], isLoading } = useInvestors();
  const createMutation = useCreateInvestor();
  const deleteMutation = useDeleteInvestor();

  async function handleCreate() {
    let values: InvestorFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      const created = await createMutation.mutateAsync(
        toInvestorPayload(values) as { code: string; name: string },
      );
      setCreateOpen(false);
      form.resetFields();
      navigate(`/app/investors/${created.id}`);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Thêm chủ đầu tư thất bại.'));
    }
  }

  async function handleDelete(investor: Investor) {
    try {
      await deleteMutation.mutateAsync(investor.id);
      messageApi.success('Đã xoá chủ đầu tư.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá chủ đầu tư thất bại.'));
    }
  }

  const columns: ColumnsType<Investor> = [
    {
      title: 'Mã chủ đầu tư',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (v: string | null) => <Text strong>{v ?? '—'}</Text>,
    },
    {
      title: 'Tên chủ đầu tư',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Chủ đầu tư cha',
      dataIndex: ['investorGroup', 'name'],
      key: 'investorGroup',
      width: 200,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Mã số thuế',
      dataIndex: 'taxCode',
      key: 'taxCode',
      width: 130,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Đại diện pháp nhân',
      dataIndex: 'legalRepresentative',
      key: 'legalRepresentative',
      width: 170,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Hotline',
      dataIndex: 'hotline',
      key: 'hotline',
      width: 140,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, investor) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/app/investors/${investor.id}`)}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title={`Xoá chủ đầu tư "${investor.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(investor)}
          >
            <Button type="text" danger size="small" aria-label="Xoá chủ đầu tư">
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
        title="Danh sách chủ đầu tư"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Thêm chủ đầu tư
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Chủ đầu tư được dùng cho hồ sơ dự án (ô “Chủ đầu tư”) — bấm vào 1 chủ
          đầu tư để xem và sửa thông tin chi tiết.
        </Text>
        <Table<Investor>
          columns={columns}
          dataSource={investors}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{
            emptyText: 'Chưa có chủ đầu tư nào — bấm “Thêm chủ đầu tư”',
          }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} chủ đầu tư`,
            hideOnSinglePage: false,
          }}
          onRow={(investor) => ({
            onClick: () => navigate(`/app/investors/${investor.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </BodyCard>

      <Modal
        title="Thêm chủ đầu tư"
        open={createOpen}
        onCancel={() => {
          form.resetFields();
          setCreateOpen(false);
        }}
        onOk={handleCreate}
        okText="Thêm"
        cancelText="Huỷ"
        confirmLoading={createMutation.isPending}
        width={1000}
        styles={{ body: { maxHeight: '68vh', overflowY: 'auto' } }}
        destroyOnClose
        zIndex={1200}
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <InvestorProfileFields />
        </Form>
      </Modal>
    </>
  );
}
