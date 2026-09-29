// pages/app/ui/ProjectDetailPage — module Ứng dụng: trang chi tiết dự án
// (/app/projects/:projectId). Gồm hồ sơ dự án (lưới 2 cột title: nội dung) và
// 5 bảng thông tin bên dưới.
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Result, Space, Spin, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useSiteProfile } from '@/entities/site';
import { ProjectProfileForm } from './ProjectProfileForm';
import { SiteDetailTables } from './SiteDetailTables';

const { Title, Text } = Typography;

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const id = Number(projectId);
  const valid = Number.isInteger(id) && id > 0;
  const { data: site, isLoading, isError, refetch } = useSiteProfile(
    valid ? id : undefined,
  );

  if (!valid) {
    return (
      <Result
        status="404"
        title="Không tìm thấy dự án"
        subTitle="Đường dẫn không hợp lệ."
        extra={
          <Button type="primary" onClick={() => navigate('/app/projects')}>
            Về danh sách dự án
          </Button>
        }
      />
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Không tải được hồ sơ dự án"
        extra={
          <Space>
            <Button onClick={() => refetch()}>Thử lại</Button>
            <Button type="primary" onClick={() => navigate('/app/projects')}>
              Về danh sách dự án
            </Button>
          </Space>
        }
      />
    );
  }

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app/projects')}
        >
          Về danh sách
        </Button>
      </Space>

      {isLoading || !site ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Đang tải hồ sơ dự án…</Text>
          </div>
        </div>
      ) : (
        <>
          <Title level={4} style={{ marginTop: 0 }}>
            {site.code ? `${site.code} · ` : ''}
            {site.name}
          </Title>
          <ProjectProfileForm site={site} />
          <SiteDetailTables siteId={site.id} />
        </>
      )}
    </>
  );
}
