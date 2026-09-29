import { Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useWorks } from '@/entities/work';
import type { WorkItem } from '@/entities/work';
import { BodyCard, Table } from '@/shared/ui';
import type { HomeOutletContext } from './HomeLayout';
import { buildWorkColumns } from './workColumns';

const { Title, Text, Paragraph } = Typography;

// pages/home — trang chủ (route /): thống kê + việc mới nhất + giới thiệu.
export function HomeDashboard() {
  const { me, modules, categories, profile, assignedTotal, handledTotal } =
    useOutletContext<HomeOutletContext>();
  const navigate = useNavigate();
  const recentParams = useMemo(() => ({ limit: 8 }), []);
  const { data: recent = [] } = useWorks(recentParams);

  const columns = useMemo(
    () => buildWorkColumns(false, (w) => navigate(`/work/${w.id}`)),
    [navigate],
  );

  const displayName = me?.fullName?.trim() || me?.accountName || 'Người dùng';

  return (
    <>
      <div className="home-main-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Trang chủ
          </Title>
          <Text type="secondary">
            Xin chào, {displayName}
            {me ? ` · ${me.permissionCodes.join(', ') || 'chưa có quyền'}` : ''}
          </Text>
        </div>
      </div>
      <div className="home-stat-grid">
        <BodyCard title="Việc tôi giao">
          <div className="home-stat-value">{assignedTotal}</div>
        </BodyCard>
        <BodyCard title="Việc tôi thực hiện">
          <div className="home-stat-value">{handledTotal}</div>
        </BodyCard>
        <BodyCard title="Loại việc">
          <div className="home-stat-value">{categories.length}</div>
        </BodyCard>
        <BodyCard title="Phân hệ">
          <div className="home-stat-value">{modules.length}</div>
        </BodyCard>
      </div>
      <BodyCard title="Công việc mới nhất" style={{ marginBottom: 16 }}>
        <Table<WorkItem>
          columns={columns}
          dataSource={recent}
          rowKey="id"
          pagination={false}
          resizable
          striped
          tableLayout="fixed"
        />
      </BodyCard>
      <BodyCard title="Giới thiệu công ty" style={{ marginBottom: 16 }}>
        {profile ? (
          <>
            <Title level={4} style={{ marginTop: 0 }}>
              {profile.companyName}
            </Title>
            {[profile.address, profile.phone, profile.email, profile.website]
              .filter(Boolean)
              .join(' · ') && (
              <Paragraph type="secondary">
                {[
                  profile.address,
                  profile.phone,
                  profile.email,
                  profile.website,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Paragraph>
            )}
            {profile.description && (
              <Paragraph>{profile.description}</Paragraph>
            )}
          </>
        ) : (
          <Text type="secondary">
            Chưa có thông tin công ty. Tài khoản ADMIN cập nhật ở API PUT
            /workflow/company-profile.
          </Text>
        )}
      </BodyCard>
      <BodyCard title="Giới thiệu phần mềm">
        {profile?.appIntro ? (
          <Paragraph>{profile.appIntro}</Paragraph>
        ) : (
          <Text type="secondary">Chưa có giới thiệu phần mềm.</Text>
        )}
      </BodyCard>
    </>
  );
}
