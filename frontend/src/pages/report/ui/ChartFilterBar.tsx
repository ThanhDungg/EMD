// pages/report/ui/ChartFilterBar — thanh bộ lọc riêng trên TỪNG biểu đồ, để
// người xem tự chỉnh lúc đang xem (không phải sửa cấu hình biểu đồ). Chọn xong
// biểu đồ tự tính lại; có nút Xoá để trở về bộ lọc gốc của biểu đồ.
import { ClearOutlined, FilterOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, Space, Tooltip, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useReportMeta } from '@/entities/report';
import type { ChartFilters, MetaFilter } from '@/entities/report';
import { ChartFilterField } from './ChartFilterField';
import { useReportFilterOptions } from './useReportFilterOptions';

const { Text } = Typography;

interface Props {
  dataset: string;
  /** Bộ lọc đã lưu cùng biểu đồ (giá trị gốc khi người dùng xoá lọc). */
  baseFilters: ChartFilters;
  /** Lọc người xem đang bật; undefined/null nghĩa là xoá lọc gốc ở ô đó. */
  overrides: ChartFilters;
  onOverridesChange: (next: ChartFilters) => void;
}

export function ChartFilterBar({
  dataset,
  baseFilters,
  overrides,
  onOverridesChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const { data: meta = [] } = useReportMeta();
  const datasetMeta = useMemo(
    () => meta.find((m) => m.dataset === dataset),
    [meta, dataset],
  );
  const filters: MetaFilter[] = useMemo(
    () => datasetMeta?.filters ?? [],
    [datasetMeta],
  );

  // Loại việc đang chọn quyết định danh sách trạng thái (trạng thái theo loại).
  const categoryId = (overrides.categoryId ?? baseFilters.categoryId) as
    | number
    | undefined;
  const options = useReportFilterOptions(categoryId);

  function handleChange(key: string, value: unknown) {
    const next: ChartFilters = { ...overrides };
    // undefined = xoá lọc ở ô này (ghi null để phân biệt với "chưa đụng").
    next[key] = value === undefined || value === null || value === ''
      ? null
      : value;
    onOverridesChange(next);
  }

  function resetAll() {
    onOverridesChange({});
    setExpanded(false);
  }

  // Số ô đang có giá trị (kể cả giá trị gốc của biểu đồ).
  const activeCount = useMemo(
    () =>
      filters.filter((f) => {
        const raw = overrides[f.value] !== undefined && overrides[f.value] !== null
          ? overrides[f.value]
          : baseFilters[f.value];
        return raw !== undefined && raw !== null && raw !== '';
      }).length,
    [filters, overrides, baseFilters],
  );

  const changedCount = useMemo(
    () =>
      Object.keys(overrides).filter((k) => overrides[k] !== null).length,
    [overrides],
  );

  if (filters.length === 0) return null;

  if (!expanded) {
    return (
      <div style={{ marginBottom: 8 }}>
        <Badge count={activeCount} size="small" offset={[-2, 2]}>
          <Button
            size="small"
            type="text"
            icon={<FilterOutlined />}
            onClick={() => setExpanded(true)}
          >
            Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ''}
          </Button>
        </Badge>
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 10,
        padding: 10,
        border: '1px solid #f0f0f0',
        borderRadius: 6,
        background: '#fafafa',
      }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong style={{ fontSize: 12 }}>
            Bộ lọc riêng của biểu đồ
          </Text>
          <Space size={4}>
            {changedCount > 0 && (
              <Tooltip title="Bỏ các lọc đang bật, về lại bộ lọc đã lưu">
                <Button size="small" type="text" icon={<ClearOutlined />} onClick={resetAll}>
                  Xoá lọc
                </Button>
              </Tooltip>
            )}
            <Button size="small" type="text" onClick={() => setExpanded(false)}>
              Ẩn
            </Button>
          </Space>
        </div>
        {filters.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Biểu đồ này không có bộ lọc"
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
            }}
          >
            {filters.map((f) => (
              <div key={f.value}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {f.label}
                </Text>
                <ChartFilterField
                  filter={f}
                  filters={{ ...baseFilters, ...overrides }}
                  options={options}
                  categoryId={categoryId}
                  onChange={handleChange}
                  size="small"
                />
              </div>
            ))}
          </div>
        )}
        {changedCount > 0 && (
          <Text type="warning" style={{ fontSize: 12 }}>
            Đang xem với bộ lọc khác với cấu hình đã lưu của biểu đồ (chỉ áp dụng
            tại máy này, không ảnh hưởng người khác).
          </Text>
        )}
      </Space>
    </div>
  );
}