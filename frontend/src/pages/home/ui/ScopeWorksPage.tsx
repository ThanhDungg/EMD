import { FilterOutlined } from '@ant-design/icons';
import { Badge, Button, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useWorksPage } from '@/entities/work';
import type { WorkItem } from '@/entities/work';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, Table } from '@/shared/ui';
import type { HomeOutletContext } from './HomeLayout';
import {
  EMPTY_WORK_FILTERS,
  WorkFilterDrawer,
  countActiveWorkFilters,
} from './WorkFilter';
import type { WorkFilters } from './WorkFilter';
import { buildEmployeeOptions, buildWorkColumns } from './workColumns';

const { Title, Text } = Typography;

export type ScopeKey = 'assigned' | 'handled';

const SCOPE_TITLE: Record<ScopeKey, string> = {
  assigned: 'Việc tôi giao',
  handled: 'Việc tôi thực hiện',
};

// pages/home — trang việc theo phạm vi (route /assigned, /handled).
export function ScopeWorksPage({ scope }: { scope: ScopeKey }) {
  const { me, sites, directory } = useOutletContext<HomeOutletContext>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<WorkFilters>(EMPTY_WORK_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Lọc + phân trang do server đảm nhiệm: trước đây chỉ lấy 100 việc rồi lọc ở
  // client nên người dùng không thấy hết việc của mình khi có > 100 việc.
  const listParams = useMemo(
    () => ({
      scope,
      page,
      limit: 20,
      ...(filters.siteId !== null ? { siteId: filters.siteId } : {}),
      ...(filters.userId !== null ? { userId: filters.userId } : {}),
      ...(filters.from !== null ? { from: filters.from } : {}),
      ...(filters.to !== null ? { to: filters.to } : {}),
    }),
    [scope, page, filters],
  );
  const {
    data: worksPage,
    isLoading: loading,
    isError,
    error,
  } = useWorksPage(listParams);
  const works = useMemo(() => worksPage?.items ?? [], [worksPage]);

  // Đổi tab thì reset filter + về trang 1
  useEffect(() => {
    setFilters(EMPTY_WORK_FILTERS);
    setPage(1);
  }, [scope]);

  // Đổi bộ lọc thì luôn về trang 1
  function handleApplyFilters(next: WorkFilters) {
    setFilters(next);
    setPage(1);
    setFilterOpen(false);
  }

  const columns = useMemo(
    () => buildWorkColumns(false, (w) => navigate(`/work/${w.id}`)),
    [navigate],
  );
  const employeeOptions = useMemo(
    () => buildEmployeeOptions(directory, works),
    [directory, works],
  );
  const activeFilterCount = countActiveWorkFilters(filters);

  const displayName = me?.fullName?.trim() || me?.accountName || 'Người dùng';

  return (
    <>
      <div className="home-main-header">
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {SCOPE_TITLE[scope]}
          </Title>
          <Text type="secondary">
            Xin chào, {displayName}
            {me ? ` · ${me.permissionCodes.join(', ') || 'chưa có quyền'}` : ''}
          </Text>
        </div>
      </div>
      <BodyCard
        title={SCOPE_TITLE[scope]}
        extra={
          <Space>
            {activeFilterCount > 0 && (
              <Button
                type="link"
                onClick={() => setFilters(EMPTY_WORK_FILTERS)}
              >
                Xóa lọc
              </Button>
            )}
            <Badge count={activeFilterCount} size="small">
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFilterOpen(true)}
              >
                Lọc
              </Button>
            </Badge>
          </Space>
        }
      >
        <Table<WorkItem>
          columns={columns}
          dataSource={works}
          rowKey="id"
          loading={loading}
          resizable
          striped
          tableLayout="fixed"
          locale={{
            emptyText: isError
              ? apiErrorMessage(error, 'Không tải được danh sách công việc.')
              : undefined,
          }}
          pagination={{
            current: worksPage?.page ?? 1,
            pageSize: worksPage?.limit ?? 20,
            total: worksPage?.total ?? 0,
            showSizeChanger: false,
            onChange: setPage,
          }}
        />
      </BodyCard>
      <WorkFilterDrawer
        open={filterOpen}
        initial={filters}
        sites={sites}
        users={employeeOptions}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
        onClear={() => handleApplyFilters(EMPTY_WORK_FILTERS)}
      />
    </>
  );
}
