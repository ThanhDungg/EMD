// pages/work-detail/ui/EnergyDetailView — chi tiết kiểm tra năng lượng.
// Một bảng phẳng, mỗi dòng là 1 khung giờ của 1 đồng hồ:
// mã đồng hồ · vị trí (khách hàng) · loại · khung giờ ·
// chỉ số đầu · chỉ số cuối · tổng · ảnh đính kèm · ghi chú.
// Khối "đợt kiểm tra" đã bỏ: energy_checks chỉ còn làm container ẩn 1
// check/work nên gộp hết đồng hồ của các check vào chung 1 bảng.
import { Space, Spin, Typography } from 'antd';
import type { EnergyCheck, EnergyMeter, EnergyPhase } from '@/entities/work';
import { useEnergyChecks } from '@/entities/work';
import { BodyCard, ImageGallery, Table, Tag } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';

const { Text } = Typography;

export const ENERGY_PHASE_LABEL: Record<EnergyPhase, string> = {
  NORMAL: 'Bình thường',
  OFF_PEAK: 'Thấp điểm',
  PEAK: 'Cao điểm',
};

const METER_TYPE_LABEL: Record<string, string> = {
  ELECTRICITY: 'Điện',
  WATER: 'Nước',
  DO_OIL: 'Dầu DO',
};

// Điện 3 khung giờ; nước & dầu DO chỉ 1 khung giờ bình thường.
const DEFAULT_PHASES: Record<string, EnergyPhase[]> = {
  ELECTRICITY: ['NORMAL', 'OFF_PEAK', 'PEAK'],
  WATER: ['NORMAL'],
  DO_OIL: ['NORMAL'],
};

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function formatNum(v: number | string | null | undefined): string {
  const n = toNum(v);
  return n === null ? '—' : n.toLocaleString('vi-VN');
}

// Tổng = chỉ số cuối − chỉ số đầu (server đã tính sẵn, fallback tự tính).
function readingTotal(r: {
  total?: number | string | null;
  startIndex: number | string;
  endIndex: number | string;
}): number | null {
  const total = toNum(r.total);
  if (total !== null) return total;
  const s = toNum(r.startIndex);
  const e = toNum(r.endIndex);
  return s !== null && e !== null ? e - s : null;
}

interface FlatMeterRow {
  key: string;
  meter: EnergyMeter;
  /** Các khung giờ (pha) hiển thị trên dòng này. */
  phases: EnergyPhase[];
  startIndex: number | string | null;
  endIndex: number | string | null;
  total: number | null;
  isFirst: boolean;
  rowSpan: number;
}

// Dàn đồng hồ → các dòng. Đồng hồ đã có chỉ số thì 1 dòng cho mỗi pha
// (bình thường · thấp điểm · cao điểm); đồng hồ chưa nhập chỉ số thì 1 dòng
// duy nhất, cột Khung giờ hiện sẵn các pha mặc định theo loại.
function flattenMeters(checks: EnergyCheck[]): FlatMeterRow[] {
  const out: FlatMeterRow[] = [];
  for (const check of checks) {
    for (const meter of check.meters ?? []) {
      const readings = (meter.readings ?? []).slice();
      if (readings.length > 0) {
        readings.forEach((reading, i) => {
          out.push({
            key: `${meter.id}-${reading.phase}`,
            meter,
            phases: [reading.phase],
            startIndex: reading.startIndex,
            endIndex: reading.endIndex,
            total: readingTotal(reading),
            isFirst: i === 0,
            rowSpan: readings.length,
          });
        });
        continue;
      }
      out.push({
        key: `${meter.id}-plan`,
        meter,
        phases: DEFAULT_PHASES[meter.meterType] ?? ['NORMAL'],
        startIndex: null,
        endIndex: null,
        total: null,
        isFirst: true,
        rowSpan: 1,
      });
    }
  }
  return out;
}

const METER_COLUMNS: ColumnsType<FlatMeterRow> = [
  {
    title: 'Mã đồng hồ',
    dataIndex: ['meter', 'meterCode'],
    key: 'meterCode',
    width: 160,
    render: (_, r) => <Text strong>{r.meter.meterCode}</Text>,
    onCell: (r) => (r.isFirst ? { rowSpan: r.rowSpan } : { rowSpan: 0 }),
  },
  {
    title: 'Vị trí (khách hàng)',
    dataIndex: ['meter', 'location'],
    key: 'location',
    width: 200,
    render: (_, r) => r.meter.location || '—',
    onCell: (r) => (r.isFirst ? { rowSpan: r.rowSpan } : { rowSpan: 0 }),
  },
  {
    title: 'Loại',
    dataIndex: ['meter', 'meterType'],
    key: 'meterType',
    width: 110,
    render: (_, r) => (
      <Tag style={{ borderRadius: 3 }}>
        {METER_TYPE_LABEL[r.meter.meterType] ?? r.meter.meterType}
      </Tag>
    ),
    onCell: (r) => (r.isFirst ? { rowSpan: r.rowSpan } : { rowSpan: 0 }),
  },
  {
    title: 'Khung giờ',
    dataIndex: 'phases',
    key: 'phases',
    width: 220,
    render: (phases: EnergyPhase[]) => (
      <Space size={4} wrap>
        {phases.map((phase) => (
          <Tag key={phase} style={{ borderRadius: 3 }}>
            {ENERGY_PHASE_LABEL[phase] ?? phase}
          </Tag>
        ))}
      </Space>
    ),
  },
  {
    title: 'Chỉ số đầu',
    dataIndex: 'startIndex',
    key: 'startIndex',
    width: 140,
    align: 'right',
    render: (v: FlatMeterRow['startIndex']) => formatNum(v),
  },
  {
    title: 'Chỉ số cuối',
    dataIndex: 'endIndex',
    key: 'endIndex',
    width: 140,
    align: 'right',
    render: (v: FlatMeterRow['endIndex']) => formatNum(v),
  },
  {
    title: 'Tổng',
    dataIndex: 'total',
    key: 'total',
    width: 150,
    align: 'right',
    render: (v: FlatMeterRow['total']) =>
      v === null ? '—' : <Text strong>{v.toLocaleString('vi-VN')}</Text>,
  },
  {
    title: 'Ảnh đính kèm',
    dataIndex: ['meter', 'attachments'],
    key: 'attachments',
    width: 160,
    render: (_, r) =>
      r.meter.attachments && r.meter.attachments.length > 0 ? (
        <ImageGallery files={r.meter.attachments} size={40} />
      ) : (
        '—'
      ),
    onCell: (r) => (r.isFirst ? { rowSpan: r.rowSpan } : { rowSpan: 0 }),
  },
  {
    title: 'Ghi chú',
    dataIndex: ['meter', 'notes'],
    key: 'notes',
    width: 200,
    render: (_, r) => r.meter.notes || '—',
    onCell: (r) => (r.isFirst ? { rowSpan: r.rowSpan } : { rowSpan: 0 }),
  },
];

export function EnergyDetailView({ workId }: { workId: number }) {
  const { data: checks = [], isLoading } = useEnergyChecks(workId, true);
  const rows = flattenMeters(checks);
  return (
    <BodyCard title="Chi tiết kiểm tra năng lượng">
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <Table<FlatMeterRow>
          columns={METER_COLUMNS}
          dataSource={rows}
          rowKey="key"
          pagination={false}
          size="small"
          tableLayout="fixed"
          scroll={{ x: 1500 }}
          locale={{ emptyText: 'Chưa có đồng hồ kiểm tra' }}
        />
      )}
      <Text type="secondary">
        Đồng hồ điện có 1 hoặc 3 khung giờ (bình thường · thấp điểm · cao điểm),
        nước/dầu DO chỉ 1 khung. Tổng từng khung = chỉ số cuối − chỉ số đầu
        (server tự tính).
      </Text>
    </BodyCard>
  );
}
