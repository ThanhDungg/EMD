// pages/app/ui/ContractorListPage — khai báo master data: danh sách nhà thầu
// (có phân trang). Bấm vào 1 nhà thầu → trang chi tiết.
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
  CONTRACTOR_STATUS_LABEL,
  useContractors,
  useCreateContractor,
  useDeleteContractor,
} from '@/entities/contractor';
import type { Contractor, ContractorStatus } from '@/entities/contractor';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { toContractorPayload } from '../model/contractor';
import type { ContractorFormValues } from '../model/contractor';
import { ContractorProfileFields } from './ContractorProfileFields';

const { Text } = Typography;
const PAGE_SIZE = 20;

export function ContractorListPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<ContractorFormValues>();

  const { data: contractors = [], isLoading } = useContractors();
  const createMutation = useCreateContractor();
  const deleteMutation = useDeleteContractor();

  async function handleCreate() {
    let values: ContractorFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      const created = await createMutation.mutateAsync(
        toContractorPayload(values) as { code: string; name: string },
      );
      setCreateOpen(false);
      form.resetFields();
      navigate(`/app/contractors/${created.id}`);
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Thêm nhà thầu thất bại.'));
    }
  }

  async function handleDelete(contractor: Contractor) {
    try {
      await deleteMutation.mutateAsync(contractor.id);
      messageApi.success('Đã xoá nhà thầu.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá nhà thầu thất bại.'));
    }
  }

  const columns: ColumnsType<Contractor> = [
    {
      title: 'Mã nhà thầu',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (v: string | null) => <Text strong>{v ?? '—'}</Text>,
    },
    {
      title: 'Tên nhà thầu',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Loại nhà thầu',
      dataIndex: ['contractorType', 'name'],
      key: 'contractorType',
      width: 170,
      render: (v: string | undefined) => v ?? '—',
    },
    {
      title: 'Dịch vụ cung cấp',
      dataIndex: ['service', 'name'],
      key: 'service',
      width: 160,
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
      title: 'Hotline',
      dataIndex: 'hotline',
      key: 'hotline',
      width: 140,
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (v: ContractorStatus) => (
        <span>
          <Text
            type={v === 'ACTIVE' ? 'success' : 'secondary'}
          >
            {CONTRACTOR_STATUS_LABEL[v]}
          </Text>
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, contractor) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/app/contractors/${contractor.id}`)}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title={`Xoá nhà thầu "${contractor.name}"?`}
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(contractor)}
          >
            <Button type="text" danger size="small" aria-label="Xoá nhà thầu">
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
        title="Danh sách nhà thầu"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Thêm nhà thầu
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Nhà thầu dùng chung cho dự án — bấm vào 1 nhà thầu để xem và sửa thông
          tin chi tiết.
        </Text>
        <Table<Contractor>
          columns={columns}
          dataSource={contractors}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{ emptyText: 'Chưa có nhà thầu nào — bấm “Thêm nhà thầu”' }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} nhà thầu`,
            hideOnSinglePage: false,
          }}
          onRow={(contractor) => ({
            onClick: () => navigate(`/app/contractors/${contractor.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </BodyCard>

      <Modal
        title="Thêm nhà thầu"
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
          <ContractorProfileFields />
        </Form>
      </Modal>
    </>
  );
}
