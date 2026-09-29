// pages/placeholder/ui/ModulePlaceholderPage — màn mặc định cho module chưa
// có màn hình. Dùng chung cho /report · /admin · /config · /chat · /portal.
import { ToolOutlined } from '@ant-design/icons';
import { Button, Empty, Space, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BodyCard } from '@/shared/ui';

const { Text, Title } = Typography;

export interface ModulePlaceholderPageProps {
  /** Tên module hiển thị, VD "Báo cáo". */
  moduleName: string;
  /** Mô tả ngắn module dùng để làm đúng. */
  description?: string;
}

export function ModulePlaceholderPage({
  moduleName,
  description,
}: ModulePlaceholderPageProps) {
  const navigate = useNavigate();
  return (
    <BodyCard title={moduleName}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <Empty
          image={<ToolOutlined style={{ fontSize: 48, color: '#c6ccd6' }} />}
          imageStyle={{ height: 64 }}
          description={
            <Space direction="vertical" size={4}>
              <Title level={4} style={{ margin: 0 }}>
                Module này chưa được phát triển
              </Title>
              <Text type="secondary">
                {description ?? `${moduleName} đang được phát triển.`}
              </Text>
            </Space>
          }
        >
          <Space>
            <Button type="primary" onClick={() => navigate('/work')}>
              Về Quy trình
            </Button>
          </Space>
        </Empty>
      </div>
    </BodyCard>
  );
}
