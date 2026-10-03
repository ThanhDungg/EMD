import { FilterOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Popconfirm,
  Segmented,
  Space,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useRestoreWork, useWorksPage } from '@/entities/work';
import type { WorkItem } from '@/entities/work';
import { apiErrorMessage } from '@/shared/lib';
import { BodyCard, Table, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import { CreateWorkModal } from './CreateWorkModal';
import { RecurrencePanel } from './RecurrencePanel';
import type { HomeOutletContext } from './HomeLayout';
import {
  EMPTY_WORK_FILTERS,
  WorkFilterDrawer,
  countActiveWorkFilters,
} from './WorkFilter';
import type { WorkFilters } from './WorkFilter';
import {
  buildEmployeeOptions,
  buildIncidentColumns,
  buildWorkColumns,
  statusTag,
} from './workColumns';

const { Title, Text } = Typography;
const PAGE_SIZE = 20;

// pages/home — trang 1 loại việc (route /categories/:categoryId).
export function CategoryWorksPage() {
  const { categoryId } = useParams();
  const id = Number(categoryId);
  const { categories, sites, directory, me } =
    useOutletContext<HomeOutletContext>();
  const navigate = useNavigate();
  // Chỉ ADMIN thấy thùng rác (chip Đã xóa) và nút Khôi phục —
  // backend cũng ép bỏ qua 2 cờ này nếu không phải ADMIN.
  const isAdmin = me?.permissionCodes?.includes('ADMIN') ?? false;
  const restoreMutation = useRestoreWork();

  const activeCategory = categories.find((c) => c.id === id);
  const isChecklist = activeCategory?.code === 'CHECKLIST';
  // Sự cố hư hỏng có bộ cột riêng (loại tài sản / phân loại sửa chữa / Phase...).
  const isIncident = activeCategory?.code === 'INCIDENT';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  // Thùng rác: chỉ bản đã xoá mềm (ADMIN)
  const [showDeleted, setShowDeleted] = useState(false);
  const [filters, setFilters] = useState<WorkFilters>(EMPTY_WORK_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState<'works' | 'recurring'>(
    'works',
  );

  // Đổi loại/filter thì tự về trang 1 (so key điều kiện).
  const listKey = `${id}|${statusFilter}|${overdueOnly}|${showDeleted}|${filters.siteId}|${filters.userId}|${filters.from}|${filters.to}|${categoryTab}`;
  const prevListKey = useRef(listKey);
  useEffect(() => {
    if (prevListKey.current !== listKey) {
      prevListKey.current = listKey;
      setPage(1);
    }
  }, [listKey]);

  const pageParams = useMemo(
    () => ({
      categoryId: id,
      statusId: statusFilter ?? undefined,
      overdue: overdueOnly || undefined,
      deletedOnly: showDeleted || undefined,
      page,
      limit: PAGE_SIZE,
      siteId: filters.siteId ?? undefined,
      userId: filters.userId ?? undefined,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
    }),
    [id, statusFilter, overdueOnly, showDeleted, filters, page],
  );
  const { data: pageData, isLoading: worksLoading } = useWorksPage(
    pageParams,
    !!activeCategory && categoryTab === 'works',
  );
  const works = useMemo(() => pageData?.items ?? [], [pageData]);
  const total = pageData?.total ?? 0;

  const columns: ColumnsType<WorkItem> = useMemo(() => {
    const openDetail = (w: WorkItem) => {
      // Bản đã xoá không mở được trang chi tiết (API chặn) → báo + khôi phục
      if (showDeleted) {
        message.info('Công việc đã xóa — bấm Khôi phục để mở lại.');
        return;
      }
      navigate(`/work/${w.id}`);
    };
    const base: ColumnsType<WorkItem> = isIncident
      ? buildIncidentColumns(openDetail)
      : buildWorkColumns(isChecklist, openDetail);
    // Thùng rác (ADMIN): thêm cột Khôi phục mở lại công việc đã xoá mềm
    if (showDeleted && isAdmin) {
      base.push({
        title: 'Thao tác',
        key: 'actions',
        width: 130,
        render: (_: unknown, w: WorkItem) => (
          <Popconfirm
            title="Khôi phục công việc này?"
            description="Công việc sẽ hiện lại trong danh sách."
            okText="Khôi phục"
            cancelText="Hủy"
            onConfirm={() => {
              restoreMutation.mutate(w.id, {
                onSuccess: () => message.success('Đã khôi phục công việc.'),
                onError: (err) =>
                  message.error(apiErrorMessage(err, 'Khôi phục thất bại.')),
              });
            }}
          >
            <Button size="small" icon={<UndoOutlined />}>
              Khôi phục
            </Button>
          </Popconfirm>
        ),
      });
    }
    return base;
  }, [
    isChecklist,
    isIncident,
    navigate,
    showDeleted,
    isAdmin,
    restoreMutation,
  ]);
  const employeeOptions = useMemo(
    () => buildEmployeeOptions(directory, works),
    [directory, works],
  );
  const activeFilterCount = countActiveWorkFilters(filters);

  if (!activeCategory) {
    return (
      <>
        <div className="home-main-header">
          <Title level={4} style={{ margin: 0 }}>
            Công việc
          </Title>
        </div>
        <BodyCard title="Không tìm thấy">
          <Text type="secondary">
            Loại công việc #{categoryId} không tồn tại.
          </Text>
        </BodyCard>
      </>
    );
  }

  return (
    <>
      {activeCategory.supportsRecurrence && (
        <div style={{ marginBottom: 12 }}>
          <Segmented
            options={[
              { value: 'works', label: 'Công việc' },
              { value: 'recurring', label: 'Việc lặp' },
            ]}
            value={categoryTab}
            onChange={(v) => setCategoryTab(v as 'works' | 'recurring')}
          />
        </div>
      )}
      {activeCategory.supportsRecurrence && categoryTab === 'recurring' ? (
        <RecurrencePanel
          key={activeCategory.id}
          categoryId={activeCategory.id}
          categoryName={activeCategory.vnName}
        />
      ) : (
        <>
          <BodyCard
            title={
              showDeleted ? (
                <Space>
                  {activeCategory.vnName}
                  <Tag status="danger">Đã xóa</Tag>
                </Space>
              ) : (
                activeCategory.vnName
              )
            }
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
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateOpen(true)}
                >
                  Tạo công việc
                </Button>
              </Space>
            }
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Space wrap style={{ flex: 1 }}>
                <Tag
                  status={
                    !overdueOnly && !showDeleted && statusFilter === null
                      ? 'info'
                      : 'default'
                  }
                  onClick={() => {
                    setStatusFilter(null);
                    setOverdueOnly(false);
                    setShowDeleted(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Tất cả
                </Tag>
                <Tag
                  status={overdueOnly ? 'danger' : 'default'}
                  onClick={() => {
                    setOverdueOnly(!overdueOnly);
                    setStatusFilter(null);
                    setShowDeleted(false);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  Trễ hạn
                </Tag>
                {isAdmin && (
                  <Tag
                    status={showDeleted ? 'danger' : 'default'}
                    onClick={() => {
                      setShowDeleted(!showDeleted);
                      setStatusFilter(null);
                      setOverdueOnly(false);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    Đã xóa
                  </Tag>
                )}
                {(activeCategory.statuses ?? []).map((s) => (
                  <span
                    key={s.id}
                    onClick={() => {
                      setStatusFilter(s.id === statusFilter ? null : s.id);
                      setOverdueOnly(false);
                      setShowDeleted(false);
                    }}
                    style={{
                      cursor: 'pointer',
                      opacity:
                        !overdueOnly &&
                        statusFilter !== null &&
                        statusFilter !== s.id
                          ? 0.55
                          : 1,
                      outline:
                        !overdueOnly && statusFilter === s.id
                          ? '2px solid #2174cd'
                          : 'none',
                      borderRadius: 6,
                    }}
                  >
                    {statusTag(s)}
                  </span>
                ))}
              </Space>
            </div>
            <Table<WorkItem>
              columns={columns}
              dataSource={works}
              rowKey="id"
              loading={worksLoading}
              resizable
              striped
              tableLayout="fixed"
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total,
                showSizeChanger: false,
              }}
              onChange={(pagination) => {
                const next = pagination.current ?? 1;
                if (next !== page) setPage(next);
              }}
            />
          </BodyCard>
          <WorkFilterDrawer
            open={filterOpen}
            initial={filters}
            sites={sites}
            users={employeeOptions}
            onClose={() => setFilterOpen(false)}
            onApply={(f) => {
              setFilters(f);
              setFilterOpen(false);
            }}
            onClear={() => setFilters(EMPTY_WORK_FILTERS)}
          />
          <CreateWorkModal
            open={createOpen}
            category={activeCategory}
            onClose={() => setCreateOpen(false)}
          />
        </>
      )}
    </>
  );
}
