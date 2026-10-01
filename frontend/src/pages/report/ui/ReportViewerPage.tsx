// pages/report/ui/ReportViewerPage — màn Báo cáo: chọn bản báo cáo (của tôi
// hoặc được chia sẻ) ở cột trái, bên phải hiển thị các biểu đồ của bảng đó.
// Đây là màn dùng để XEM; màn "Danh mục bản báo cáo" (/report) để tạo/sửa.
import { PlusOutlined, ShareAltOutlined } from '@ant-design/icons';
import {
  Button,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeleteChart, useDashboard, useDashboards } from '@/entities/report';
import type { ReportChart } from '@/entities/report';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard } from '@/shared/ui';
import { ChartBuilderModal } from './ChartBuilderModal';
import { ChartCard } from './ChartCard';
import { ReportShareModal } from './ReportShareModal';

const { Text } = Typography;

export function ReportViewerPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [messageApi, contextHolder] = message.useMessage();
  const [keyword, setKeyword] = useState('');
  const [scope, setScope] = useState<'mine' | 'shared'>('mine');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<ReportChart | null>(null);
  const [sharing, setSharing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteMutation = useDeleteChart();

  const {
    data: mine = [],
    isLoading: mineLoading,
  } = useDashboards('mine');
  const {
    data: shared = [],
    isLoading: sharedLoading,
  } = useDashboards('shared');

  const loading = scope === 'mine' ? mineLoading : sharedLoading;
  const source = scope === 'mine' ? mine : shared;

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return source;
    return source.filter((d) => d.title.toLowerCase().includes(kw));
  }, [source, keyword]);

  const selectedId = id !== undefined ? Number(id) : undefined;
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(
    Number.isFinite(selectedId) ? selectedId : undefined,
  );

  // Mở màn mà chưa chọn bảng nào → chọn bảng đầu tiên của tab hiện tại.
  useEffect(() => {
    if (selectedId !== undefined) return;
    if (loading || filtered.length === 0) return;
    navigate(`/report/view/${filtered[0].id}`, { replace: true });
  }, [selectedId, loading, filtered, navigate]);

  // Đổi tab thì bảng đang mở có thể không thuộc tab mới → chọn lại bảng đầu.
  useEffect(() => {
    if (loading || source.length === 0) return;
    if (selectedId !== undefined && source.some((d) => d.id === selectedId)) {
      return;
    }
    navigate(`/report/view/${source[0].id}`, { replace: true });
  }, [scope, loading, source, selectedId, navigate]);

  // Chủ bảng (bản nằm trong tab "Của tôi") được thêm/sửa/xoá biểu đồ.
  const editable = !!dashboard && mine.some((d) => d.id === dashboard.id);

  async function handleDelete(chart: ReportChart) {
    setDeletingId(chart.id);
    try {
      await deleteMutation.mutateAsync(chart.id);
      messageApi.success('Đã xoá biểu đồ.');
    } catch (err) {
      messageApi.error(apiErrorMessage(err, 'Xoá biểu đồ thất bại.'));
    } finally {
      setDeletingId(null);
    }
  }

  const charts = dashboard?.charts ?? [];

  return (
    <>
      {contextHolder}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 300, flexShrink: 0 }}>
          <BodyCard title="Bản báo cáo">
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Input.Search
                allowClear
                placeholder="Tìm theo tên bảng"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <Space.Compact block>
                <Button
                  block
                  type={scope === 'mine' ? 'primary' : 'default'}
                  onClick={() => setScope('mine')}
                >
                  Của tôi
                </Button>
                <Button
                  block
                  type={scope === 'shared' ? 'primary' : 'default'}
                  onClick={() => setScope('shared')}
                >
                  Được chia sẻ
                </Button>
              </Space.Compact>
            </Space>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : (
              <List
                size="small"
                style={{ marginTop: 8 }}
                dataSource={filtered}
                locale={{ emptyText: 'Chưa có bản báo cáo' }}
                renderItem={(item) => {
                  const active = item.id === selectedId;
                  return (
                    <List.Item
                      onClick={() =>
                        navigate(`/report/view/${item.id}`)
                      }
                      style={{
                        cursor: 'pointer',
                        borderRadius: 4,
                        padding: '8px 10px',
                        background: active ? '#e6f4ff' : undefined,
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <Space
                        direction="vertical"
                        size={2}
                        style={{ width: '100%' }}
                      >
                        <Text ellipsis style={{ maxWidth: 250 }}>
                          {item.title}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item._count?.charts ?? 0} biểu đồ
                        </Text>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            )}
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              block
              style={{ marginTop: 8 }}
              onClick={() => navigate('/report')}
            >
              Quản lý bản báo cáo
            </Button>
          </BodyCard>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {dashboardLoading ? (
            <BodyCard title="Báo cáo">
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin />
              </div>
            </BodyCard>
          ) : !dashboard ? (
            <BodyCard title="Báo cáo">
              <Empty description="Chọn bản báo cáo ở cột trái để xem biểu đồ." />
            </BodyCard>
          ) : (
            <BodyCard
              title={dashboard.title}
              extra={
                editable ? (
                  <Space>
                    <Button
                      size="small"
                      icon={<ShareAltOutlined />}
                      onClick={() => setSharing(true)}
                    >
                      Chia sẻ
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditing(null);
                        setBuilderOpen(true);
                      }}
                    >
                      Thêm biểu đồ
                    </Button>
                  </Space>
                ) : undefined
              }
            >
              <Space
                direction="vertical"
                size={12}
                style={{ width: '100%' }}
              >
                {dashboard.description && (
                  <Text type="secondary">{dashboard.description}</Text>
                )}
                {charts.length === 0 ? (
                  <Empty description="Bản báo cáo này chưa có biểu đồ nào.">
                    {editable && (
                      <Button
                        type="primary"
                        onClick={() => {
                          setEditing(null);
                          setBuilderOpen(true);
                        }}
                      >
                        Thêm biểu đồ đầu tiên
                      </Button>
                    )}
                  </Empty>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fill, minmax(380px, 1fr))',
                      gap: 16,
                    }}
                  >
                    {charts.map((chart) => (
                      <div
                        key={chart.id}
                        style={
                          chart.chartType === 'MAP' ||
                          chart.chartType === 'TABLE'
                            ? { gridColumn: '1 / -1' }
                            : undefined
                        }
                      >
                        <ChartCard
                          chart={chart}
                          canEdit={editable}
                          onEdit={(c) => {
                            setEditing(c);
                            setBuilderOpen(true);
                          }}
                          onDelete={handleDelete}
                          deletingId={deletingId}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Space>
            </BodyCard>
          )}
        </div>
      </div>

      <ChartBuilderModal
        open={builderOpen}
        dashboardId={dashboard?.id ?? 0}
        editing={editing}
        onClose={() => {
          setBuilderOpen(false);
          setEditing(null);
        }}
      />
      <ReportShareModal
        open={sharing}
        dashboard={dashboard ?? null}
        onClose={() => setSharing(false)}
      />
    </>
  );
}