import { Table as AntTable } from 'antd';
import type { ColumnType, TableProps as AntTableProps, ColumnsType } from 'antd/es/table';
import { useMemo, useRef, useState } from 'react';

export type TableSize = 'small' | 'medium' | 'large';

export interface TableProps<T> extends Omit<
  AntTableProps<T>,
  'size' | 'columns'
> {
  columns: ColumnsType<T>;
  size?: TableSize;
  // Bật kéo chỉnh độ rộng từng cột (drag ở mép phải tiêu đề).
  resizable?: boolean;
  // Nền xen kẽ trắng / xanh xám cực nhạt cho dòng dữ liệu (theo đặc tả).
  striped?: boolean;
}

const sizeMap: Record<TableSize, 'small' | 'middle' | 'large'> = {
  small: 'small',
  medium: 'middle',
  large: 'large',
};

const MIN_COL_WIDTH = 60;

// Table mặc định: bordered + pagination nhỏ gọn, theo phong cách admin beca-ui
export function Table<T extends object>({
  size = 'medium',
  pagination,
  bordered = true,
  resizable = false,
  striped = false,
  columns,
  scroll,
  onRow,
  ...rest
}: TableProps<T>) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const drag = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  function onResizeStart(
    e: React.MouseEvent,
    key: string,
    currentWidth: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { key, startX: e.clientX, startWidth: currentWidth };
    const onMove = (ev: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      const next = Math.max(
        MIN_COL_WIDTH,
        d.startWidth + ev.clientX - d.startX,
      );
      setWidths((prev) =>
        prev[d.key] === next ? prev : { ...prev, [d.key]: next },
      );
    };
    const onUp = () => {
      drag.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const mergedColumns = useMemo<ColumnsType<T>>(() => {
    if (!resizable) return columns;
    return columns.map((col) => {
      // Bỏ qua cột nhóm (ColumnGroupType không có dataIndex/width riêng).
      if (!('dataIndex' in col)) return col;
      const rawIndex = col.dataIndex;
      const key = String(
        col.key ??
          (Array.isArray(rawIndex) ? rawIndex.join('.') : rawIndex) ??
          '',
      );
      if (!key) return col;
      const width =
        widths[key] ??
        (typeof col.width === 'number' ? col.width : undefined) ??
        150;
      const title = col.title as React.ReactNode;
      return {
        ...col,
        width,
        title: (
          <div
            style={{
              position: 'relative',
              paddingRight: 10,
              userSelect: 'none',
            }}
          >
            <span>{title}</span>
            <span
              role="separator"
              aria-orientation="vertical"
              title="Kéo để chỉnh độ rộng"
              onMouseDown={(e) => onResizeStart(e, key, width)}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: -8,
                bottom: -8,
                right: -4,
                width: 10,
                cursor: 'col-resize',
                zIndex: 1,
              }}
            />
          </div>
        ),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, widths, resizable]);

  return (
    <AntTable<T>
      size={sizeMap[size]}
      bordered={bordered}
      columns={mergedColumns}
      scroll={{ x: resizable ? 'max-content' : undefined, ...scroll }}
      pagination={
        pagination === false
          ? false
          : { size: 'small', showSizeChanger: true, ...pagination }
      }
      onRow={(record, index) => {
        const extra = onRow?.(record, index ?? 0) ?? {};
        // Dòng lẻ nền xanh xám cực nhạt (đặc tả --table-alt-row).
        const stripedStyle =
          striped && (index ?? 0) % 2 === 1 ? { background: '#f8faff' } : {};
        return { ...extra, style: { ...stripedStyle, ...extra.style } };
      }}
      {...rest}
    />
  );
}

export type { ColumnType, ColumnsType };
