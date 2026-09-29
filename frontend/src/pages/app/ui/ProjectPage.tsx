// pages/app/ui/ProjectPage — module Ứng dụng: danh sách dự án (có phân trang).
// Bấm vào 1 dự án → mở trang chi tiết /app/projects/:projectId.
import { PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SITE_MANAGEMENT_STATUS_LABEL,
  SITE_OPERATION_STATUS_LABEL,
  SITE_RENTAL_STATUS_LABEL,
  useDeleteSite,
  useSiteProfiles,
} from '@/entities/site';
import type { SiteProfile } from '@/entities/site';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { CreateProjectModal } from './CreateProjectModal';

const { Text } = Typography;
const PAGE_SIZE = 20;

export function ProjectPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: sites = [], isLoading } = useSiteProfiles();
  const deleteMutation = useDeleteSite();

  async function handleDelete(site: SiteProfile) {
    try {
      await deleteMutation.mutateAsync(site.id);
      messageApi.success('Đã xoá dự án.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá dự án thất bại.'));
    }
  }

  const columns: ColumnsType<SiteProfile> = [
    {
      title: 'Mã dự án',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (v: string | null) => <Text strong>{v ?? '—'}</Text>,
    },
    {
      title: 'Tên dự án',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <EllipsisText text={v} />,
    },
    {
      title: 'Số tầng',
      dataIndex: 'floors',
      key: 'floors',
      width: 90,
      align: 'right',
      render: (v: number | null) => v ?? '—',
    },
    {
      title: 'Tổng GFA (m²)',
      dataIndex: 'gfaArea',
      key: 'gfaArea',
      width: 130,
      align: 'right',
      render: (v: string | number | null) =>
        v === null || v === undefined ? '—' : Number(v).toLocaleString('vi-VN'),
    },
    {
      title: 'Tình trạng dự án',
      dataIndex: 'operationStatus',
      key: 'operationStatus',
      width: 150,
      render: (v: keyof typeof SITE_OPERATION_STATUS_LABEL | null) =>
        v ? <Tag>{SITE_OPERATION_STATUS_LABEL[v]}</Tag> : '—',
    },
    {
      title: 'Trạng thái cho thuê',
      dataIndex: 'rentalStatus',
      key: 'rentalStatus',
      width: 160,
      render: (v: keyof typeof SITE_RENTAL_STATUS_LABEL | null) =>
        v ? <Tag color="green">{SITE_RENTAL_STATUS_LABEL[v]}</Tag> : '—',
    },
    {
      title: 'Trạng thái quản lý',
      dataIndex: 'managementStatus',
      key: 'managementStatus',
      width: 160,
      render: (v: keyof typeof SITE_MANAGEMENT_STATUS_LABEL | null) =>
        v ? <Tag color="blue">{SITE_MANAGEMENT_STATUS_LABEL[v]}</Tag> : '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, site) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/app/projects/${site.id}`)}
          >
            Chi tiết
          </Button>
          <Popconfirm
            title={`Xoá dự án "${site.name}"?`}
            description="Kèm toàn bộ vị trí, tài sản và các bảng con của dự án."
            okText="Xoá"
            cancelText="Huỷ"
            onConfirm={() => handleDelete(site)}
          >
            <Button type="text" danger size="small" aria-label="Xoá dự án">
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
        title="Danh sách dự án"
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            Thêm dự án
          </Button>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Bấm vào 1 dự án để xem hồ sơ chi tiết và các bảng thông tin bên trong.
        </Text>
        <Table<SiteProfile>
          columns={columns}
          dataSource={sites}
          rowKey="id"
          size="small"
          loading={isLoading}
          locale={{ emptyText: 'Chưa có dự án nào — bấm “Thêm dự án”' }}
          pagination={{
            pageSize: PAGE_SIZE,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} dự án`,
            hideOnSinglePage: false,
          }}
          onRow={(site) => ({
            onClick: () => navigate(`/app/projects/${site.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </BodyCard>

      <CreateProjectModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreated={(created) => {
          setCreateOpen(false);
          // Tạo xong mở thẳng trang chi tiết để nhập tiếp bảng con.
          navigate(`/app/projects/${created.id}`);
        }}
      />
    </>
  );
}
