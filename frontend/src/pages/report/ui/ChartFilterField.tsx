// pages/report/ui/ChartFilterField — render 1 ô lọc theo kiểu meta của dataset
// (ngày / dự án / loại việc / trạng thái / danh mục tài sản / số / text).
// Dùng chung cho modal dựng biểu đồ và thanh filter trên từng thẻ biểu đồ.
import { DatePicker, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import type { ChartFilters, MetaFilter } from '@/entities/report';
import type { ReportFilterOptions } from './useReportFilterOptions';

// Giá trị text cố định theo mã backend (đồng bộ DATASET_META).
const TEXT_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  meterType: [
    { value: 'ELECTRICITY', label: 'Điện' },
    { value: 'WATER', label: 'Nước' },
    { value: 'DO_OIL', label: 'Dầu DO' },
  ],
  operationStatus: [
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'SUSPENDED', label: 'Ngưng hoạt động' },
  ],
  rentalStatus: [
    { value: 'RENTED', label: 'Đang cho thuê' },
    { value: 'VACANT', label: 'Trống' },
    { value: 'PREPARING', label: 'Chuẩn bị cho thuê' },
  ],
  managementStatus: [
    { value: 'MANAGED', label: 'Đang quản lý' },
    { value: 'NOT_MANAGED', label: 'Chưa quản lý' },
    { value: 'SUSPENDED', label: 'Ngưng quản lý' },
  ],
  contractType: [
    { value: 'INPUT', label: 'Đầu vào' },
    { value: 'OUTPUT', label: 'Đầu ra' },
  ],
};

interface Props {
  filter: MetaFilter;
  filters: ChartFilters;
  options: ReportFilterOptions;
  /** Đang chờ loại việc để nạp trạng thái (chỉ dùng cho workStatus). */
  categoryId: number | undefined;
  onChange: (key: string, value: unknown) => void;
  size?: 'small' | 'middle';
}

export function ChartFilterField({
  filter,
  filters,
  options,
  categoryId,
  onChange,
  size = 'middle',
}: Props) {
  const value = filters[filter.value];

  if (filter.type === 'date') {
    return (
      <DatePicker
        size={size}
        style={{ width: '100%' }}
        format="DD/MM/YYYY"
        placeholder={filter.label}
        value={typeof value === 'string' ? dayjs(value) : null}
        onChange={(d) =>
          onChange(filter.value, d ? d.format('YYYY-MM-DD') : undefined)
        }
        allowClear
      />
    );
  }

  if (filter.type === 'site') {
    return (
      <Select
        size={size}
        allowClear
        placeholder={`Tất cả ${filter.label.toLowerCase()}`}
        value={(value as number | undefined) ?? undefined}
        options={options.sites}
        onChange={(v) => onChange(filter.value, v)}
      />
    );
  }

  if (filter.type === 'workCategory') {
    return (
      <Select
        size={size}
        allowClear
        placeholder="Tất cả loại việc"
        value={(value as number | undefined) ?? undefined}
        options={options.workCategories}
        onChange={(v) => onChange(filter.value, v)}
      />
    );
  }

  if (filter.type === 'workStatus') {
    return (
      <Select
        size={size}
        allowClear
        placeholder={categoryId === undefined ? 'Chọn loại việc trước' : 'Tất cả trạng thái'}
        disabled={categoryId === undefined}
        value={(value as number | undefined) ?? undefined}
        options={options.workStatuses}
        onChange={(v) => onChange(filter.value, v)}
      />
    );
  }

  if (filter.type === 'assetCategory') {
    return (
      <Select
        size={size}
        allowClear
        placeholder="Tất cả danh mục"
        value={(value as number | undefined) ?? undefined}
        options={options.assetCategories}
        onChange={(v) => onChange(filter.value, v)}
      />
    );
  }

  if (filter.type === 'number') {
    return (
      <InputNumber
        size={size}
        style={{ width: '100%' }}
        placeholder={filter.label}
        value={(value as number | undefined) ?? undefined}
        onChange={(v) => onChange(filter.value, v ?? undefined)}
      />
    );
  }

  const textOptions = TEXT_OPTIONS[filter.value];
  if (textOptions) {
    return (
      <Select
        size={size}
        allowClear
        placeholder="Tất cả"
        value={(value as string | undefined) ?? undefined}
        options={textOptions}
        onChange={(v) => onChange(filter.value, v)}
      />
    );
  }

  return (
    <Input
      size={size}
      allowClear
      placeholder={filter.label}
      value={(value as string | undefined) ?? ''}
      onChange={(e) => onChange(filter.value, e.target.value || undefined)}
    />
  );
}