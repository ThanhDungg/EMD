// pages/report/ui/DrillDrawer — danh sách chi tiết sau khi click 1 chỉ số trên
// biểu đồ (drill-through kiểu Power BI). Hiện đúng bản ghi gốc tạo ra chỉ số đó,
// bấm vào dòng để mở thẳng trang chi tiết của bản ghi.
import { DownloadOutlined } from '@ant-design/icons';
import { Button, Drawer, Space, Spin, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadCsv, useReportDrill } from '@/entities/report';
import type { DrillRequest } from '@/entities/report';
import { apiErrorMessage } from '@/shared/lib';

const { Text } = Typography;

const DATASET_LABELS: Record<string, string> = {
  works: 'công việc',
  incidents: 'sự cố',
  energy: 'lượt ghi năng lượng',
  assets: 'tài sản',
  checklist: 'dòng checklist',
  contracts: 'hợp đồng',
  personnel: 'nhân sự',
  sites: 'dự án',
};

const DIM_LABELS: Record<string, string> = {
  category: 'Loại việc',
  status: 'Trạng thái',
  priority: 'Ưu tiên',
  site: 'Dự án',
  assigner: 'Người giao',
  handler: 'Người thực hiện',
  month: 'Tháng',
  quarter: 'Quý',
  damageType: 'Loại hư hỏng',
  repairType: 'Loại sửa chữa',
  picUnit: 'Đơn vị phụ trách',
  meterType: 'Loại đồng hồ',
  phase: 'Pha',
  meterCode: 'Mã đồng hồ',
  condition: 'Tình trạng',
  usageStatus: 'Trạng thái dùng',
  result: 'Kết quả',
  contractType: 'Loại hợp đồng',
  serviceType: 'Loại dịch vụ',
  termType: 'Thời hạn',
  company: 'Công ty',
  expiry: 'Thời hạn còn lại',
  investor: 'Chủ đầu tư',
  department: 'Đơn vị',
  position: 'Chức vụ',
  level: 'Cấp bậc',
  gender: 'Giới tính',
  role: 'Vai trò',
  hireYear: 'Năm vào làm',
  province: 'Tỉnh thành',
  operationStatus: 'Vận hành',
  rentalStatus: 'Cho thuê',
  managementStatus: 'Quản lý',
  service: 'Dịch vụ',
};

export interface DrillDrawerProps {
  request: DrillRequest | null;
  onClose: () => void;
}

export function DrillDrawer({ request, onClose }: DrillDrawerProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, error } = useReportDrill(
    request ? { ...request, page, limit: pageSize } : null,
  );

  const columns: ColumnsType<Record<string, string | number>> = useMemo(() => {
    const cols = (data?.columns ?? []).filter((c) => c.key !== 'link');
    return [
      ...cols.map((c) => ({
        title: c.label,
        dataIndex: c.key,
        key: c.key,
        ellipsis: true,
        render: (v: string | number) => (v === '' || v === null ? '—' : String(v)),
      })),
      {
        title: '',
        key: 'open',
        width: 110,
        fixed: 'right' as const,
        render: (_: unknown, row: Record<string, string | number>) => {
          const link = String(row.link ?? '');
          if (!link) return null;
          return (
            <Button type="link" size="small" onClick={() => navigate(link)}>
              Mở
            </Button>
          );
        },
      },
    ];
  }, [data, navigate]);

  const title = request
    ? `Chi tiết · ${DIM_LABELS[request.slice.dim] ?? request.slice.dim}: ${request.slice.value}`
    : 'Chi tiết';

  return (
    <Drawer
      open={!!request}
      onClose={onClose}
      width="min(1100px, 96vw)"
      title={
        <Space direction="vertical" size={0}>
          <span>{title}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {request?.chartTitle ? `${request.chartTitle} · ` : ''}
            danh sách {(DATASET_LABELS[request?.dataset ?? ''] ?? '')} tạo ra chỉ số này
          </Text>
        </Space>
      }
      extra={
        <Button
          icon={<DownloadOutlined />}
          disabled={!data || data.rows.length === 0}
          onClick={() =>
            downloadCsv(
              `drill-${request?.dataset ?? ''}-${request?.slice.dim ?? ''}.csv`,
              data?.rows ?? [],
            )
          }
        >
          Xuất CSV
        </Button>
      }
    >
      <Spin spinning={isLoading}>
        {error ? (
          <Text type="danger">{apiErrorMessage(error, 'Không tải được danh sách chi tiết.')}</Text>
        ) : (
          <Table
            size="small"
            columns={columns}
            dataSource={data?.rows ?? []}
            rowKey={(r, i) => String(r.id ?? i)}
            scroll={{ x: 'max-content' }}
            onRow={(row) => ({
              onClick: () => {
                const link = String(row.link ?? '');
                if (link) navigate(link);
              },
              style: row.link ? { cursor: 'pointer' } : undefined,
            })}
            pagination={{
              current: data?.page ?? 1,
              pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              pageSizeOptions: [20, 50, 100],
              showTotal: (t) => `${t} bản ghi`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        )}
      </Spin>
    </Drawer>
  );
}
