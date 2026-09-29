import { Button, DatePicker, Drawer, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const { RangePicker } = DatePicker;
const { Text } = Typography;

export interface SiteOption {
  id: number;
  name: string;
}

export interface UserOption {
  id: number;
  accountName: string;
  fullName?: string | null;
}

// Bộ lọc danh sách công việc. Mặc định 3 filter: Dự án, Nhân viên, Từ ngày → Đến ngày.
export interface WorkFilters {
  siteId: number | null;
  userId: number | null;
  from: string | null; // YYYY-MM-DD
  to: string | null; // YYYY-MM-DD
}

export const EMPTY_WORK_FILTERS: WorkFilters = {
  siteId: null,
  userId: null,
  from: null,
  to: null,
};

export function countActiveWorkFilters(f: WorkFilters): number {
  let n = 0;
  if (f.siteId !== null) n += 1;
  if (f.userId !== null) n += 1;
  if (f.from !== null || f.to !== null) n += 1;
  return n;
}

// Lọc client-side trên list đã tải: Dự án theo site, Nhân viên theo
// người giao HOẶC người thực hiện, ngày theo khoảng Từ → Đến
// (việc thiếu ngày thì giữ lại, không loại).
export function userLabel(u: UserOption): string {
  return u.fullName?.trim() || u.accountName;
}

export interface WorkFilterDrawerProps {
  open: boolean;
  initial: WorkFilters;
  sites: SiteOption[];
  users: UserOption[];
  onClose: () => void;
  onApply: (filters: WorkFilters) => void;
  onClear: () => void;
}

// Drawer filter bên phải màn hình danh sách công việc.
export function WorkFilterDrawer({
  open,
  initial,
  sites,
  users,
  onClose,
  onApply,
  onClear,
}: WorkFilterDrawerProps) {
  const [draft, setDraft] = useState<WorkFilters>(initial);

  // Mở drawer thì nạp lại giá trị đang áp dụng.
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  return (
    <Drawer title="Bộ lọc công việc" open={open} onClose={onClose} width={340}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Text strong>Dự án</Text>
          <Select
            allowClear
            placeholder="Tất cả dự án"
            value={draft.siteId}
            onChange={(v) => setDraft((d) => ({ ...d, siteId: v ?? null }))}
            options={sites.map((s) => ({ value: s.id, label: s.name }))}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
        <div>
          <Text strong>Nhân viên</Text>
          <Select
            allowClear
            showSearch
            placeholder="Tất cả nhân viên"
            value={draft.userId}
            onChange={(v) => setDraft((d) => ({ ...d, userId: v ?? null }))}
            optionFilterProp="label"
            options={users.map((u) => ({ value: u.id, label: userLabel(u) }))}
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
        <div>
          <Text strong>Từ ngày → Đến ngày</Text>
          <RangePicker
            value={[
              draft.from ? dayjs(draft.from) : null,
              draft.to ? dayjs(draft.to) : null,
            ]}
            onChange={(dates) =>
              setDraft((d) => ({
                ...d,
                from: dates?.[0]?.format('YYYY-MM-DD') ?? null,
                to: dates?.[1]?.format('YYYY-MM-DD') ?? null,
              }))
            }
            format="DD/MM/YYYY"
            style={{ width: '100%', marginTop: 8 }}
          />
        </div>
        <Space style={{ marginTop: 8 }}>
          <Button type="primary" onClick={() => onApply(draft)}>
            Áp dụng
          </Button>
          <Button
            onClick={() => {
              setDraft(EMPTY_WORK_FILTERS);
              onClear();
            }}
          >
            Xóa lọc
          </Button>
        </Space>
      </Space>
    </Drawer>
  );
}
