// pages/assets/ui/AssetDetailPage — chi tiết tài sản: hồ sơ + vị trí lat/lng +
// tem QR + danh sách sự cố liên quan. Đây là trang mở ra khi quét tem QR dán
// ngoài thực tế (QR trỏ tới /assets/:id).
import {
  ArrowLeftOutlined,
  EditOutlined,
  QrcodeOutlined,
} from '@ant-design/icons';
import { Button, Descriptions, Result, Space, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAsset } from '@/entities/asset';
import { useWorksPage } from '@/entities/work';
import type { WorkItem } from '@/entities/work';
import { useMyPermissions } from '@/entities/user';
import { formatDate } from '@/shared/lib';
import { BodyCard, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { AssetLocationMap, buildIncidentColumns } from '@/pages/shared';
import { AssetFormModal } from './AssetFormModal';
import { AssetQrModal } from './AssetQrModal';

const { Title, Text } = Typography;

const PAGE_SIZE = 20;

function text(value?: string | null): string {
  const v = value?.trim();
  return v ? v : '—';
}

function day(value?: string | null): string {
  if (!value) return '—';
  try {
    return formatDate(value);
  } catch {
    return String(value).slice(0, 10);
  }
}

export function AssetDetailPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const id = Number(assetId);
  const valid = Number.isInteger(id) && id > 0;

  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const {
    data: asset,
    isLoading,
    isError,
    refetch,
  } = useAsset(valid ? id : undefined);
  const { data: permissions } = useMyPermissions();
  const isAdmin = (permissions ?? []).includes('ADMIN');

  const incidentParams = useMemo(
    () => ({ assetId: valid ? id : undefined, page, limit: PAGE_SIZE }),
    [valid, id, page],
  );
  const { data: incidentPage, isLoading: incidentsLoading } =
    useWorksPage(incidentParams);

  const incidentColumns: ColumnsType<WorkItem> = useMemo(
    () =>
      buildIncidentColumns((w: WorkItem) => {
        navigate(`/work/${w.id}`);
      }),
    [navigate],
  );

  if (!valid) {
    return (
      <Result
        status="404"
        title="Không tìm thấy tài sản"
        subTitle="Đường dẫn không hợp lệ."
        extra={
          <Button type="primary" onClick={() => navigate('/assets')}>
            Về danh sách tài sản
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Không tải được thông tin tài sản"
        extra={
          <Space>
            <Button onClick={() => refetch()}>Thử lại</Button>
            <Button type="primary" onClick={() => navigate('/assets')}>
              Về danh sách tài sản
            </Button>
          </Space>
        }
      />
    );
  }

  const incidents = incidentPage?.items ?? [];
  const incidentTotal = incidentPage?.total ?? 0;

  return (
    <>
      <div className="home-main-header">
        <Space style={{ marginBottom: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/assets')}
          >
            Về danh sách
          </Button>
        </Space>
        <Space
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Title level={4} style={{ margin: 0 }}>
            {asset ? `${asset.code} · ${asset.name}` : 'Chi tiết tài sản'}
          </Title>
          <Space>
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => setQrOpen(true)}
              disabled={!asset}
            >
              Tem QR
            </Button>
            {isAdmin && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
                disabled={!asset}
              >
                Sửa
              </Button>
            )}
          </Space>
        </Space>
      </div>

      {isLoading || !asset ? (
        <BodyCard title="Đang tải…">
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin />
          </div>
        </BodyCard>
      ) : (
        <>
          <BodyCard title="Thông tin tài sản" style={{ marginBottom: 12 }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Mã tài sản">
                {text(asset.code)}
              </Descriptions.Item>
              <Descriptions.Item label="Tên tài sản">
                {text(asset.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Danh mục tài sản">
                {text(asset.category?.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Tình trạng">
                {text(asset.condition?.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái dùng">
                {text(asset.usageStatus?.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng">
                {asset.quantity ?? '—'}
                {asset.unit ? ` ${asset.unit.name}` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="Dự án" span={2}>
                {text(asset.location?.site?.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Vị trí đặt" span={2}>
                {text(asset.location?.name)}
              </Descriptions.Item>
              <Descriptions.Item label="Toạ độ">
                {asset.latitude !== null && asset.latitude !== undefined
                  ? `${Number(asset.latitude).toFixed(6)}, ${Number(
                      asset.longitude ?? 0,
                    ).toFixed(6)}`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày đưa vào sử dụng">
                {day(asset.usageDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Hạn bảo hành">
                {day(asset.warrantyEnd)}
              </Descriptions.Item>
              <Descriptions.Item label="Nhà cung cấp">
                {text(asset.supplier)}
              </Descriptions.Item>
              <Descriptions.Item label="Xuất xứ">
                {text(asset.origin)}
              </Descriptions.Item>
              <Descriptions.Item label="Model">
                {text(asset.model)}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {text(asset.remarks)}
              </Descriptions.Item>
              <Descriptions.Item label="Thông tin chi tiết" span={2}>
                <span style={{ whiteSpace: 'pre-wrap' }}>
                  {text(asset.detail)}
                </span>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12 }}>
              <Text type="secondary">
                Toạ độ được chọn trên bản đồ lúc tạo/sửa tài sản (để định vị
                nhanh khi xử lý sự cố).
              </Text>
            </div>
            <div style={{ marginTop: 8 }}>
              <AssetLocationMap
                latitude={asset.latitude}
                longitude={asset.longitude}
                height={280}
              />
            </div>
          </BodyCard>

          <BodyCard title={`Sự cố liên quan (${incidentTotal})`}>
            <Table<WorkItem>
              columns={incidentColumns}
              dataSource={incidents}
              rowKey="id"
              loading={incidentsLoading}
              resizable
              striped
              tableLayout="fixed"
              locale={{
                emptyText: 'Tài sản này chưa có sự cố nào.',
              }}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total: incidentTotal,
                showSizeChanger: false,
              }}
              onChange={(pagination) => {
                const next = pagination.current ?? 1;
                if (next !== page) setPage(next);
              }}
            />
          </BodyCard>
        </>
      )}

      <AssetQrModal
        assets={asset ? [asset] : []}
        open={qrOpen && !!asset}
        onClose={() => setQrOpen(false)}
      />
      {isAdmin && (
        <AssetFormModal
          open={editOpen}
          asset={asset ?? null}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
