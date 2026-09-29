// pages/home/ui/CreateWorkModal — modal Tạo công việc cho cả 5 loại việc.
// Khung chung bám file docs/cau-truc-giao-dien-tao-cong-viec.md:
// Header (Tạo công việc + X) | Body cuộn (Thông tin chung 2 cột + khối
// chi tiết theo loại + nút +) | Footer cố định (Đóng + Thêm).
// Field từng loại bám đúng backend DTO + trang detail hiện tại:
// - CHECKLIST: works + checklist_items nạp từ mẫu (bảng chỉ xem trước) + lịch lặp.
// - OFFICE_WORK: works thuần (không khối chi tiết).
// - ENERGY_CHECK: works + energy_checks (container ẩn) + energy_meters, chỉ
//   nhập mã đồng hồ / vị trí (khách hàng) / loại + lịch lặp.
// - MASTERPLAN: works + systems → categories → tasks (3 cấp).
// - INCIDENT: works + incidentTypeId + incident_detail (PUT upsert sau khi tạo).
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  TreeSelect,
  Typography,
  message,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { locationPath, useAssets, useSiteLocations } from '@/entities/asset';
import { useDroplist } from '@/entities/droplist';
import type { SiteLocationNode } from '@/entities/asset';
import {
  createChecklistItem,
  createEnergyCheck,
  createMasterplanCategory,
  createMasterplanSystem,
  createMasterplanTask,
  createWork,
  saveIncidentDetail,
  useDirectory,
  useIncidentTypes,
  useSites,
  workKeys,
} from '@/entities/work';
import type { ChecklistValueType, CreateWorkPayload } from '@/entities/work';
import { EllipsisText, Table } from '@/shared/ui';
import type { ColumnsType } from '@/shared/ui';
import type { CategoryItem } from '../model/home';
import { homeKeys } from '../api/homeQueries';
import { ChecklistTemplatePicker } from './ChecklistTemplatePicker';
import type { TemplateChecklistItem } from './ChecklistTemplatePicker';

const { Text, Title } = Typography;

const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
const DATE_FORMAT = 'DD/MM/YYYY';

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
];

const METER_TYPE_OPTIONS = [
  { value: 'ELECTRICITY', label: 'Điện' },
  { value: 'WATER', label: 'Nước' },
  { value: 'DO_OIL', label: 'Dầu DO' },
];

const PHASE_OPTIONS = [
  { value: 'NORMAL', label: 'Thường' },
  { value: 'PEAK', label: 'Cao điểm' },
  { value: 'OFF_PEAK', label: 'Thấp điểm' },
];

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Hàng tuần' },
  { value: 'MONTHLY', label: 'Hàng tháng' },
  { value: 'QUARTERLY', label: 'Hàng quý' },
  { value: 'YEARLY', label: 'Hàng năm' },
];

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

interface LocationTreeNode {
  title: string;
  value: number;
  key: number;
  children: LocationTreeNode[];
}

/** Cây vị trí (site) → treeData cho TreeSelect. */
function toLocationTreeData(nodes: SiteLocationNode[]): LocationTreeNode[] {
  return nodes.map((n) => ({
    title: n.name,
    value: n.id,
    key: n.id,
    children: toLocationTreeData(n.children ?? []),
  }));
}

function personLabel(p: {
  accountName: string;
  fullName?: string | null;
}): string {
  return p.fullName?.trim() || p.accountName;
}

// --- Draft dòng checklist trong modal (chưa có id DB).
// Bảng chỉ xem trước: mọi dòng đến từ mẫu nên không sửa được ở màn tạo việc.
// Chỉ Tên + Tiêu chuẩn kiểm tra + Loại giá trị có sẵn từ mẫu; Giá trị /
// Trạng thái (Đạt/Không đạt) / Ghi chú để rỗng, nhập lúc đi kiểm tra. ---
interface ChecklistDraft {
  uid: string;
  name: string;
  standard?: string;
  valueType?: ChecklistValueType;
  // uid của draft cha (khi nạp từ mẫu) — undefined = dòng gốc của work
  parentUid?: string | null;
}

// --- Draft 1 khung giờ (pha) của 1 đồng hồ: chỉ hiển thị ở màn tạo việc,
// chỉ số đầu/cuối nhập lúc đi kiểm tra nên lúc tạo để rỗng ---
type MeterPhase = 'NORMAL' | 'PEAK' | 'OFF_PEAK';

interface EnergyReadingDraft {
  phase: MeterPhase;
}

// --- Draft 1 đồng hồ đo trong modal năng lượng (1 đồng hồ = n khung giờ) ---
interface MeterDraft {
  uid: string;
  meterCode: string;
  meterType: 'ELECTRICITY' | 'WATER' | 'DO_OIL';
  /** Vị trí (khách hàng) đặt đồng hồ */
  location?: string;
  readings: EnergyReadingDraft[];
}

// Điện: 3 khung giờ (bình thường · thấp điểm · cao điểm).
// Nước & dầu DO: 1 khung giờ bình thường.
const ELECTRIC_3_PHASES: MeterPhase[] = ['NORMAL', 'OFF_PEAK', 'PEAK'];

function blankReading(phase: MeterPhase): EnergyReadingDraft {
  return { phase };
}

function blankReadings(
  meterType: MeterDraft['meterType'],
  phases?: MeterPhase[],
): EnergyReadingDraft[] {
  if (phases) return phases.map(blankReading);
  return meterType === 'ELECTRICITY'
    ? ELECTRIC_3_PHASES.map(blankReading)
    : [blankReading('NORMAL')];
}

interface MasterplanTaskDraft {
  title?: string;
  pic?: string;
  frequency?: string;
}

interface MasterplanCategoryDraft {
  vnName?: string;
  code?: string;
  tasks?: MasterplanTaskDraft[];
}

interface MasterplanSystemDraft {
  vnName?: string;
  code?: string;
  engName?: string;
  categories?: MasterplanCategoryDraft[];
}

interface CreateWorkFormValues {
  title: string;
  description?: string;
  siteId: number;
  handlerIds?: number[];
  followerIds?: number[];
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  // CHECKLIST bắt buộc; ENERGY_CHECK không có ô Vị trí riêng (vị trí nằm ở
  // từng dòng đồng hồ trong bảng bên dưới).
  location?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  // INCIDENT
  incidentTypeId?: number;
  phase?: string;
  rbfRbw?: string;
  unit?: string;
  // Flow sự cố: Dự án (siteId) → Vị trí (cây vị trí của site) → Tài sản
  incidentLocationId?: number;
  incidentAssetId?: number;
  repairTypeId?: number;
  damageTypeId?: number;
  cause?: string;
  picUnitId?: number;
  solution?: string;
  nextWork?: string;
  reopenCount?: number;
  incidentNotes?: string;
  // MASTERPLAN
  systems?: MasterplanSystemDraft[];
}

export interface CreateWorkModalProps {
  open: boolean;
  category: CategoryItem | null;
  onClose: () => void;
  onCreated?: (workId: number) => void;
}

// pages/home — modal tạo công việc dùng chung 5 loại (mở từ nút
// "Tạo công việc" ở CategoryWorksPage).
export function CreateWorkModal({
  open,
  category,
  onClose,
  onCreated,
}: CreateWorkModalProps) {
  const [form] = Form.useForm<CreateWorkFormValues>();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Dialog xác nhận bỏ dữ liệu (controlled, render cùng modal chính để
  // không bị kẹt như Modal.confirm static).
  const [discardOpen, setDiscardOpen] = useState(false);
  const uidRef = useRef(0);
  const [checklistRows, setChecklistRows] = useState<ChecklistDraft[]>([]);
  const [meters, setMeters] = useState<MeterDraft[]>([]);
  // Dialog chọn mẫu checklist (mở bằng nút + ở khối Danh sách tiêu chí)
  const [pickerOpen, setPickerOpen] = useState(false);
  // Lịch lặp (chỉ loại supportsRecurrence: CHECKLIST + ENERGY_CHECK)
  const [recurrenceOn, setRecurrenceOn] = useState(false);
  const [frequency, setFrequency] = useState<
    'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  >('WEEKLY');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [quarterlyMode, setQuarterlyMode] = useState<
    'START_OF_QUARTER' | 'END_OF_QUARTER'
  >('START_OF_QUARTER');
  const [yearMonth, setYearMonth] = useState<number | undefined>(undefined);
  const [yearDay, setYearDay] = useState<number | undefined>(undefined);
  const [recEndType, setRecEndType] = useState<'NEVER' | 'ON_DATE'>('NEVER');
  const [recEndDate, setRecEndDate] = useState<Dayjs | null>(null);

  const { data: sites = [] } = useSites();
  const { data: directory = [] } = useDirectory();
  const categoryCode = category?.code ?? null;
  const isIncident = categoryCode === 'INCIDENT';
  const isChecklist = categoryCode === 'CHECKLIST';
  const isEnergy = categoryCode === 'ENERGY_CHECK';
  const isMasterplan = categoryCode === 'MASTERPLAN';
  const supportsRecurrence = category?.supportsRecurrence ?? false;
  const { data: incidentTypes = [] } = useIncidentTypes(open && isIncident);

  // --- Flow sự cố: vị trí theo dự án, tài sản theo vị trí ---
  // form bên dưới render trong <Form form={form}>, watch ở đây để lấy
  // siteId / locationId để gọi API tương ứng.
  const incidentSiteId = Form.useWatch('siteId', form);
  const incidentLocationId = Form.useWatch('incidentLocationId', form);
  const incidentAssetId = Form.useWatch('incidentAssetId', form);
  const { data: incidentLocations = [] } = useSiteLocations(
    incidentSiteId,
    open && isIncident,
  );
  // 3 field droplist của sự cố (module Ứng dụng)
  const { data: repairTypes = [] } = useDroplist(
    'repairType',
    open && isIncident,
  );
  const { data: damageTypes = [] } = useDroplist(
    'damageType',
    open && isIncident,
  );
  const { data: picUnits = [] } = useDroplist('picUnit', open && isIncident);
  const { data: incidentAssets = [] } = useAssets(
    { locationId: incidentLocationId },
    open && isIncident && incidentLocationId !== undefined,
  );
  const incidentLocationTree = useMemo(
    () => toLocationTreeData(incidentLocations),
    [incidentLocations],
  );
  // Tên vị trí / tài sản để gửi kèm denormalize (hiển thị nhanh ở list).
  const incidentLocationName = useMemo(
    () =>
      incidentLocationId === undefined
        ? undefined
        : (locationPath(incidentLocations, incidentLocationId) ?? undefined),
    [incidentLocations, incidentLocationId],
  );
  const incidentAssetLabel = useMemo(() => {
    const found = incidentAssets.find((a) => a.id === incidentAssetId);
    return found ? `${found.code} — ${found.name}` : undefined;
  }, [incidentAssets, incidentAssetId]);

  const siteOptions = useMemo(
    () => sites.map((s) => ({ value: s.id, label: s.name })),
    [sites],
  );
  const personOptions = useMemo(
    () =>
      directory.map((u) => ({
        value: u.id,
        label: personLabel(u),
      })),
    [directory],
  );

  function nextUid(prefix: string): string {
    uidRef.current += 1;
    return `${prefix}-${Date.now()}-${uidRef.current}`;
  }

  // Reset toàn bộ state mỗi lần mở modal khác loại.
  // Deps dùng categoryId (không dùng object category) để background refetch
  // danh mục không reset mất dữ liệu đang nhập.
  const categoryIdForReset = category?.id;
  useEffect(() => {
    if (open && categoryIdForReset) {
      form.resetFields();
      form.setFieldsValue({
        priority: 'MEDIUM',
        startDate: dayjs(),
        reopenCount: 0,
      });
      setChecklistRows([]);
      setMeters([]);
      setRecurrenceOn(false);
      setFrequency('WEEKLY');
      setWeekdays([]);
      setMonthDays([]);
      setQuarterlyMode('START_OF_QUARTER');
      setYearMonth(undefined);
      setYearDay(undefined);
      setRecEndType('NEVER');
      setRecEndDate(null);
      setDirty(false);
      setDiscardOpen(false);
      setPickerOpen(false);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryIdForReset, form]);

  // Đóng hẳn modal (sau khi đã xác nhận bỏ dữ liệu / submit xong).
  function handleClosed() {
    setDiscardOpen(false);
    setDirty(false);
    onClose();
  }

  // Nút X, nút Đóng, click mask, Escape: còn dữ liệu sửa thì hỏi trước.
  function requestClose() {
    if (submitting || discardOpen) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    handleClosed();
  }

  function patchMeter(uid: string, patch: Partial<MeterDraft>) {
    setMeters((rows) =>
      rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)),
    );
    setDirty(true);
  }

  // Thêm 1 đồng hồ. Điện chọn sẵn 1 pha hoặc 3 pha; nước/dầu DO chỉ 1 pha
  // bình thường. Sau đó có thể thêm/xoá pha ở cột Thao tác.
  function handleAddMeter(
    meterType: MeterDraft['meterType'],
    phases?: MeterPhase[],
  ) {
    setMeters((rows) => [
      ...rows,
      {
        uid: nextUid('meter'),
        meterCode: '',
        meterType,
        readings: blankReadings(meterType, phases),
      },
    ]);
    setDirty(true);
  }

  // Đổi loại đồng hồ: sang nước/dầu DO thì chỉ giữ 1 pha bình thường;
  // sang điện thì giữ nguyên các pha đang có.
  function handleMeterTypeChange(uid: string, v: MeterDraft['meterType']) {
    if (v === 'WATER' || v === 'DO_OIL') {
      patchMeter(uid, { meterType: v, readings: blankReadings(v) });
    } else {
      setMeters((rows) =>
        rows.map((r) =>
          r.uid === uid
            ? {
                ...r,
                meterType: v,
                readings: r.readings.length > 0 ? r.readings : blankReadings(v),
              }
            : r,
        ),
      );
      setDirty(true);
    }
  }

  // Nạp các node mẫu đã chọn vào bảng (giữ thứ tự + cấu trúc cha → con).
  // Chỉ mang field cấu trúc của mẫu: tên, tiêu chuẩn kiểm tra, loại giá trị.
  // Giá trị / trạng thái Đạt-Không đạt / ghi chú để rỗng, nhập lúc đi kiểm tra.
  function handleAppendTemplate(items: TemplateChecklistItem[]) {
    const uidByKey = new Map<string, string>();
    const drafts: ChecklistDraft[] = items.map((it) => {
      const uid = nextUid('checklist');
      uidByKey.set(it.key, uid);
      return {
        uid,
        name: it.name,
        standard: it.standard,
        valueType: it.valueType,
        parentUid: null,
      };
    });
    drafts.forEach((d, i) => {
      const parentKey = items[i].parentKey;
      d.parentUid = parentKey ? (uidByKey.get(parentKey) ?? null) : null;
    });
    setChecklistRows((rows) => [...rows, ...drafts]);
    setDirty(true);
    messageApi.success(`Đã nạp ${drafts.length} dòng từ mẫu.`);
  }

  // Dòng cha/con như trang chi tiết checklist: draft nào đang có con thì
  // merge full hàng chỉ show tiêu đề, dòng con show full thông tin.
  const CHECKLIST_PARENT_SPAN = 8;

  // Mẫu 2 cấp: hầu như mọi dòng đều là nội dung con, chỉ dòng nào được
  // dòng khác làm cha mới là dòng nhóm (merge full hàng, ẩn các cột sau).
  const groupUidSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of checklistRows) {
      if (r.parentUid) set.add(r.parentUid);
    }
    return set;
  }, [checklistRows]);

  const isGroupRow = (record: ChecklistDraft) => groupUidSet.has(record.uid);

  function groupCell(record: ChecklistDraft) {
    return isGroupRow(record) ? { colSpan: 0 } : {};
  }

  // Bảng chỉ xem trước — không sửa được ở màn tạo việc: mọi dòng đến từ mẫu.
  // Đủ 8 cột: Tên · Tiêu chuẩn kiểm tra · Số lượng · Giá trị · Đính kèm ·
  // Checkpoint · Trạng thái · Ghi chú.
  // Tên + Tiêu chuẩn kiểm tra + loại giá trị lấy từ mẫu; các cột còn lại để
  // rỗng, nhập lúc đi kiểm tra.
  const checklistColumns: ColumnsType<ChecklistDraft> = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (value: string, record: ChecklistDraft) =>
        isGroupRow(record) ? (
          <strong>{value}</strong>
        ) : (
          <EllipsisText text={value} />
        ),
      onCell: (record: ChecklistDraft) =>
        isGroupRow(record) ? { colSpan: CHECKLIST_PARENT_SPAN } : {},
    },
    {
      title: 'Tiêu chuẩn kiểm tra',
      dataIndex: 'standard',
      key: 'standard',
      width: 220,
      render: (value: string | undefined, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : <EllipsisText text={value ?? ''} />,
      onCell: groupCell,
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (_: unknown, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : emptyCell(),
      onCell: groupCell,
    },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      key: 'value',
      width: 130,
      // Rỗng lúc khởi tạo; kiểu nhập phụ thuộc Loại giá trị của mẫu
      // (BOOLEAN = Đúng/Sai · TEXT = chữ · NUMBER = số).
      render: (_: unknown, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : emptyCell(),
      onCell: groupCell,
    },
    {
      title: 'Đính kèm',
      dataIndex: 'attachments',
      key: 'attachments',
      width: 130,
      render: (_: unknown, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : emptyCell(),
      onCell: groupCell,
    },
    {
      title: 'Checkpoint',
      dataIndex: 'checkpoint',
      key: 'checkpoint',
      width: 130,
      // Vị trí lat/long thiết bị gửi lên lúc chụp ảnh.
      render: (_: unknown, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : emptyCell(),
      onCell: groupCell,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'result',
      key: 'result',
      width: 130,
      // Đạt / Không đạt — mặc định rỗng, nhập lúc đi kiểm tra.
      render: (_: unknown, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : emptyCell(),
      onCell: groupCell,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: 180,
      render: (_: unknown, record: ChecklistDraft) =>
        isGroupRow(record) ? '' : emptyCell(),
      onCell: groupCell,
    },
  ];

  const PHASE_LABEL: Record<MeterPhase, string> = {
    NORMAL: 'Bình thường',
    OFF_PEAK: 'Thấp điểm',
    PEAK: 'Cao điểm',
  };

  // 1 row phẳng = 1 pha (khung giờ) của 1 đồng hồ.
  // Đồng hồ điện: 1 pha hoặc 3 pha (bình thường · thấp điểm · cao điểm),
  // thêm/xoá pha ở cột Thao tác. Nước/dầu DO: chỉ 1 pha bình thường.
  interface FlatMeterRow {
    key: string;
    meterUid: string;
    phase: MeterPhase;
    isFirst: boolean;
    rowSpan: number;
  }

  const flatMeterRows = useMemo<FlatMeterRow[]>(() => {
    const out: FlatMeterRow[] = [];
    for (const m of meters) {
      m.readings.forEach((rd, i) => {
        out.push({
          key: `${m.uid}-${rd.phase}`,
          meterUid: m.uid,
          phase: rd.phase,
          isFirst: i === 0,
          rowSpan: m.readings.length,
        });
      });
    }
    return out;
  }, [meters]);

  function meterOf(uid: string): MeterDraft | undefined {
    return meters.find((m) => m.uid === uid);
  }

  // Ô thuộc đồng hồ (mã/loại/vị trí) chỉ vẽ ở row đầu, các row khung giờ
  // còn lại ẩn để gộp nhóm bằng rowSpan.
  function meterCell(row: FlatMeterRow) {
    return row.isFirst ? { rowSpan: row.rowSpan } : { rowSpan: 0 };
  }

  // Thêm 1 pha (khung giờ) cho đồng hồ điện — chỉ nhận pha chưa có.
  function handleAddReadingPhase(uid: string, phase: MeterPhase) {
    setMeters((rows) =>
      rows.map((x) =>
        x.uid === uid && !x.readings.some((rd) => rd.phase === phase)
          ? { ...x, readings: [...x.readings, blankReading(phase)] }
          : x,
      ),
    );
    setDirty(true);
  }

  // Xoá 1 pha — luôn giữ lại ít nhất 1 pha cho mỗi đồng hồ.
  function handleRemoveReadingPhase(uid: string, phase: MeterPhase) {
    setMeters((rows) =>
      rows.map((x) =>
        x.uid === uid && x.readings.length > 1
          ? { ...x, readings: x.readings.filter((rd) => rd.phase !== phase) }
          : x,
      ),
    );
    setDirty(true);
  }

  // Cột chỉ xem trước: khung giờ / chỉ số / ảnh / ghi chú nhập lúc đi kiểm tra.
  function readOnlyCell(text: string) {
    return <Text type="secondary">{text}</Text>;
  }

  // Ô chưa có dữ liệu ở màn tạo việc (mặc định rỗng theo yêu cầu nghiệp vụ).
  function emptyCell() {
    return <Text type="secondary">—</Text>;
  }

  const meterColumns: ColumnsType<FlatMeterRow> = [
    {
      title: 'Mã đồng hồ *',
      key: 'meterCode',
      width: 170,
      render: (_, r) => {
        const m = meterOf(r.meterUid);
        if (!m) return null;
        return (
          <Input
            value={m.meterCode}
            placeholder="VD: EM-01"
            onChange={(e) => patchMeter(m.uid, { meterCode: e.target.value })}
          />
        );
      },
      onCell: meterCell,
    },
    {
      title: 'Vị trí (khách hàng)',
      key: 'location',
      width: 190,
      render: (_, r) => {
        const m = meterOf(r.meterUid);
        if (!m) return null;
        return (
          <Input
            value={m.location ?? ''}
            placeholder="Khách hàng / vị trí đồng hồ"
            onChange={(e) => patchMeter(m.uid, { location: e.target.value })}
          />
        );
      },
      onCell: meterCell,
    },
    {
      title: 'Loại *',
      key: 'meterType',
      width: 130,
      render: (_, r) => {
        const m = meterOf(r.meterUid);
        if (!m) return null;
        return (
          <Select
            value={m.meterType}
            options={METER_TYPE_OPTIONS}
            style={{ width: '100%' }}
            onChange={(v) => handleMeterTypeChange(m.uid, v)}
          />
        );
      },
      onCell: meterCell,
    },
    {
      title: 'Pha / Khung giờ',
      key: 'phase',
      width: 190,
      render: (_, r) => {
        const m = meterOf(r.meterUid);
        const multi = (m?.readings.length ?? 1) > 1;
        return (
          <Space>
            <Tag style={{ borderRadius: 3 }}>
              {PHASE_LABEL[r.phase] ?? r.phase}
            </Tag>
            {multi && m && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                title={`Xoá pha ${PHASE_LABEL[r.phase]}`}
                aria-label={`Xoá pha ${PHASE_LABEL[r.phase]}`}
                onClick={() => handleRemoveReadingPhase(m.uid, r.phase)}
              />
            )}
          </Space>
        );
      },
    },
    {
      title: 'Chỉ số đầu',
      key: 'startIndex',
      width: 130,
      align: 'right',
      render: () => readOnlyCell('—'),
    },
    {
      title: 'Chỉ số cuối',
      key: 'endIndex',
      width: 130,
      align: 'right',
      render: () => readOnlyCell('—'),
    },
    {
      title: 'Tổng',
      key: 'total',
      width: 120,
      align: 'right',
      render: () => readOnlyCell('—'),
    },
    {
      title: 'Ảnh đính kèm',
      key: 'attachments',
      width: 130,
      render: () => readOnlyCell('—'),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      width: 170,
      render: () => readOnlyCell('—'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, r) => {
        const m = meterOf(r.meterUid);
        if (!m) return null;
        // Đồng hồ điện mới cho thêm pha còn thiếu; nước/dầu DO chỉ 1 pha.
        const missing =
          m.meterType === 'ELECTRICITY'
            ? PHASE_OPTIONS.filter(
                (o) => !m.readings.some((rd) => rd.phase === o.value),
              )
            : [];
        return (
          <Space direction="vertical" size={4}>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Xóa đồng hồ (cả các pha)"
              aria-label="Xóa đồng hồ"
              onClick={() => {
                setMeters((rows) => rows.filter((x) => x.uid !== m.uid));
                setDirty(true);
              }}
            />
            {missing.map((o) => (
              <Button
                key={o.value}
                size="small"
                icon={<PlusOutlined />}
                onClick={() =>
                  handleAddReadingPhase(m.uid, o.value as MeterPhase)
                }
              >
                {o.label}
              </Button>
            ))}
          </Space>
        );
      },
      onCell: meterCell,
    },
  ];

  function validateDrafts(): string | null {
    if (isChecklist) {
      for (let i = 0; i < checklistRows.length; i += 1) {
        if (!checklistRows[i].name.trim())
          return `Dòng ${i + 1}: vui lòng nhập Tên.`;
      }
    }
    if (isEnergy) {
      for (let i = 0; i < meters.length; i += 1) {
        const m = meters[i];
        if (!m.meterCode.trim())
          return `Đồng hồ ${i + 1}: vui lòng nhập Mã đồng hồ.`;
      }
    }
    if (supportsRecurrence && recurrenceOn) {
      if (frequency === 'WEEKLY' && weekdays.length === 0)
        return 'Lịch lặp: vui lòng chọn ít nhất 1 thứ.';
      if (frequency === 'MONTHLY' && monthDays.length === 0)
        return 'Lịch lặp: vui lòng chọn ít nhất 1 ngày trong tháng.';
      if (
        frequency === 'YEARLY' &&
        (yearMonth === undefined || yearDay === undefined)
      )
        return 'Lịch lặp: vui lòng chọn tháng và ngày.';
      if (recEndType === 'ON_DATE' && !recEndDate)
        return 'Lịch lặp: vui lòng chọn ngày kết thúc.';
    }
    return null;
  }

  async function handleSubmit() {
    if (!category) return;
    let values: CreateWorkFormValues;
    try {
      values = await form.validateFields();
    } catch {
      // antd đã highlight + cuộn tới lỗi đầu tiên (scrollToFirstError)
      return;
    }
    const draftError = validateDrafts();
    if (draftError) {
      messageApi.error(draftError);
      return;
    }
    if (
      values.startDate &&
      values.endDate &&
      values.endDate.isBefore(values.startDate)
    ) {
      messageApi.error('Hạn hoàn thành phải lớn hơn hoặc bằng ngày khởi tạo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateWorkPayload = {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        categoryId: category.id,
        priority: values.priority,
        siteId: values.siteId,
        location:
          values.location?.trim() ||
          (isIncident ? incidentLocationName : undefined),
        handlerIds:
          values.handlerIds && values.handlerIds.length > 0
            ? values.handlerIds
            : undefined,
        followerIds:
          values.followerIds && values.followerIds.length > 0
            ? values.followerIds
            : undefined,
        startDate: values.startDate?.format('YYYY-MM-DDTHH:mm:ss'),
        endDate: values.endDate?.format('YYYY-MM-DDTHH:mm:ss'),
      };
      if (isIncident && values.incidentTypeId)
        payload.incidentTypeId = values.incidentTypeId;
      if (supportsRecurrence && recurrenceOn) {
        const recurrence: CreateWorkPayload['recurrence'] = {
          frequency,
          endType: recEndType,
        };
        if (frequency === 'WEEKLY') recurrence.weekdays = weekdays;
        if (frequency === 'MONTHLY') recurrence.monthDays = monthDays;
        if (frequency === 'QUARTERLY') recurrence.quarterlyMode = quarterlyMode;
        if (frequency === 'YEARLY') {
          recurrence.yearMonth = yearMonth;
          recurrence.yearDay = yearDay;
        }
        if (recEndType === 'ON_DATE' && recEndDate)
          recurrence.endDate = recEndDate.format('YYYY-MM-DD');
        payload.isRecurrence = true;
        payload.recurrence = recurrence;
      }

      const created = await createWork(payload);

      // Chi tiết riêng từng loại (tạo sau khi đã có workId)
      if (isChecklist && checklistRows.length > 0) {
        // Tạo lần lượt theo thứ tự bảng (cha luôn đứng trước con)
        // để giữ liên kết parentId của mẫu. Chỉ mang field cấu trúc của
        // mẫu; giá trị / trạng thái Đạt-Không đạt / ghi chú để rỗng.
        const idByUid = new Map<string, number>();
        for (let i = 0; i < checklistRows.length; i += 1) {
          const r = checklistRows[i];
          const parentId = r.parentUid ? idByUid.get(r.parentUid) : undefined;
          const createdItem = await createChecklistItem({
            title: r.name.trim(),
            standard: r.standard?.trim() || undefined,
            valueType: r.valueType,
            sortOrder: i,
            parentId,
            workId: created.id,
          });
          idByUid.set(r.uid, createdItem.id);
        }
      }
      if (isEnergy && meters.length > 0) {
        // energy_checks giữ làm container ẩn 1 check/work (không nhập
        // "đợt kiểm tra" nữa): tiêu đề lấy luôn tên công việc.
        // Chỉ mã đồng hồ / vị trí / loại được nhập lúc tạo việc; khung giờ,
        // chỉ số, ảnh và ghi chú nhập lúc đi kiểm tra.
        await createEnergyCheck({
          title: payload.title,
          workId: created.id,
          meters: meters.map((m) => ({
            meterCode: m.meterCode.trim(),
            meterType: m.meterType,
            location: m.location?.trim() || undefined,
          })),
        });
      }
      if (isMasterplan && values.systems && values.systems.length > 0) {
        for (const s of values.systems) {
          if (!s?.vnName?.trim()) continue;
          const system = await createMasterplanSystem({
            vnName: s.vnName.trim(),
            code: s.code?.trim() || undefined,
            engName: s.engName?.trim() || undefined,
            workId: created.id,
          });
          for (const c of s.categories ?? []) {
            if (!c?.vnName?.trim()) continue;
            const cat = await createMasterplanCategory({
              vnName: c.vnName.trim(),
              code: c.code?.trim() || undefined,
              systemId: system.id,
            });
            for (const t of c.tasks ?? []) {
              if (!t?.title?.trim()) continue;
              await createMasterplanTask({
                title: t.title.trim(),
                categoryId: cat.id,
                pic: t.pic?.trim() || undefined,
                frequency: t.frequency?.trim() || undefined,
              });
            }
          }
        }
      }
      if (isIncident) {
        await saveIncidentDetail(created.id, {
          phase: values.phase?.trim() || undefined,
          rbfRbw: values.rbfRbw?.trim() || undefined,
          unit: values.unit?.trim() || undefined,
          locationId: values.incidentLocationId,
          locationName: incidentLocationName,
          assetId: values.incidentAssetId,
          relatedAsset: incidentAssetLabel,
          repairTypeId: values.repairTypeId,
          damageTypeId: values.damageTypeId,
          cause: values.cause?.trim() || undefined,
          picUnitId: values.picUnitId,
          solution: values.solution?.trim() || undefined,
          nextWork: values.nextWork?.trim() || undefined,
          reopenCount: values.reopenCount ?? 0,
          notes: values.incidentNotes?.trim() || undefined,
        });
      }

      queryClient.invalidateQueries({ queryKey: workKeys.all });
      if (supportsRecurrence)
        queryClient.invalidateQueries({
          queryKey: homeKeys.recurrences(category.id),
        });
      messageApi.success('Tạo công việc thành công.');
      onCreated?.(created.id);
      handleClosed();
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : 'Tạo công việc thất bại.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        title={`Tạo công việc${category ? ` — ${category.vnName}` : ''}`}
        open={open}
        onCancel={requestClose}
        maskClosable={!submitting}
        closable={!submitting}
        width={1150}
        centered
        destroyOnClose
        aria-label="Tạo công việc"
        styles={{
          body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 16 },
        }}
        footer={[
          <Button key="close" onClick={requestClose} disabled={submitting}>
            Đóng
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={handleSubmit}
          >
            Thêm
          </Button>,
        ]}
      >
        {contextHolder}
        <Form<CreateWorkFormValues>
          form={form}
          layout="vertical"
          scrollToFirstError
          onValuesChange={(changed) => {
            setDirty(true);
            // Flow sự cố: đổi Dự án thì xoá Vị trí, đổi Vị trí thì xoá Tài sản
            // (tài sản phải thuộc vị trí vừa chọn).
            if ('siteId' in changed) {
              form.setFieldValue('incidentLocationId', undefined);
              form.setFieldValue('incidentAssetId', undefined);
            }
            if ('incidentLocationId' in changed) {
              form.setFieldValue('incidentAssetId', undefined);
              // Vị trí của work (cột "Vị trí" ở danh sách) lấy theo đường dẫn
              // của vị trí sự cố vừa chọn.
              form.setFieldValue(
                'location',
                changed.incidentLocationId
                  ? (locationPath(
                      incidentLocations,
                      changed.incidentLocationId,
                    ) ?? undefined)
                  : undefined,
              );
            }
          }}
          preserve={false}
        >
          {/* Khối Thông tin chung — form 2 cột (desktop), 1 cột (mobile).
            CHECKLIST: Dự án → Tiêu đề → Người xử lý → Ngày khởi tạo →
            Hạn hoàn thành → Vị trí.
            ENERGY_CHECK: như checklist nhưng bỏ Vị trí (lấy Vị trí kiểm tra). */}
          {isChecklist ? (
            <>
              <Title level={5} style={{ marginTop: 0 }}>
                Thông tin chung
              </Title>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Dự án"
                    name="siteId"
                    rules={[
                      { required: true, message: 'Vui lòng chọn dự án.' },
                    ]}
                  >
                    <Select
                      showSearch
                      placeholder="Tìm kiếm và chọn dự án"
                      optionFilterProp="label"
                      options={siteOptions}
                      autoFocus
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tiêu đề"
                    name="title"
                    rules={[
                      { required: true, message: 'Vui lòng nhập mô tả.' },
                      { max: 255, message: 'Tối đa 255 ký tự.' },
                    ]}
                  >
                    <Input
                      placeholder="Nhập tiêu đề công việc"
                      maxLength={255}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Người xử lý" name="handlerIds">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Tìm kiếm và chọn người xử lý"
                      optionFilterProp="label"
                      options={personOptions}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Ngày khởi tạo"
                    name="startDate"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn ngày khởi tạo.',
                      },
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={DATE_TIME_FORMAT}
                      placeholder="Chọn ngày khởi tạo"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Hạn hoàn thành"
                    name="endDate"
                    dependencies={['startDate']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value: Dayjs | null | undefined) {
                          const start: Dayjs | null | undefined =
                            getFieldValue('startDate');
                          if (!value || !start || !value.isBefore(start))
                            return Promise.resolve();
                          return Promise.reject(
                            new Error(
                              'Hạn hoàn thành phải lớn hơn hoặc bằng ngày khởi tạo.',
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={DATE_TIME_FORMAT}
                      placeholder="Chọn hạn hoàn thành"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Vị trí"
                    name="location"
                    rules={[
                      { required: true, message: 'Vui lòng nhập vị trí.' },
                    ]}
                  >
                    <Input placeholder="VD: Tầng 1 - Khu A" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : isEnergy ? (
            <>
              <Title level={5} style={{ marginTop: 0 }}>
                Thông tin chung
              </Title>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Dự án"
                    name="siteId"
                    rules={[
                      { required: true, message: 'Vui lòng chọn dự án.' },
                    ]}
                  >
                    <Select
                      showSearch
                      placeholder="Tìm kiếm và chọn dự án"
                      optionFilterProp="label"
                      options={siteOptions}
                      autoFocus
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tiêu đề"
                    name="title"
                    rules={[
                      { required: true, message: 'Vui lòng nhập mô tả.' },
                      { max: 255, message: 'Tối đa 255 ký tự.' },
                    ]}
                  >
                    <Input
                      placeholder="Nhập tiêu đề công việc"
                      maxLength={255}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Người xử lý" name="handlerIds">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Tìm kiếm và chọn người xử lý"
                      optionFilterProp="label"
                      options={personOptions}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Ngày khởi tạo"
                    name="startDate"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn ngày khởi tạo.',
                      },
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={DATE_TIME_FORMAT}
                      placeholder="Chọn ngày khởi tạo"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Hạn hoàn thành"
                    name="endDate"
                    dependencies={['startDate']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value: Dayjs | null | undefined) {
                          const start: Dayjs | null | undefined =
                            getFieldValue('startDate');
                          if (!value || !start || !value.isBefore(start))
                            return Promise.resolve();
                          return Promise.reject(
                            new Error(
                              'Hạn hoàn thành phải lớn hơn hoặc bằng ngày khởi tạo.',
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={DATE_TIME_FORMAT}
                      placeholder="Chọn hạn hoàn thành"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          ) : (
            <>
              <Title level={5} style={{ marginTop: 0 }}>
                Thông tin chung
              </Title>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tiêu đề"
                    name="title"
                    rules={[
                      { required: true, message: 'Vui lòng nhập mô tả.' },
                      { max: 255, message: 'Tối đa 255 ký tự.' },
                    ]}
                  >
                    <Input
                      placeholder="Nhập tiêu đề công việc"
                      maxLength={255}
                      autoFocus
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Dự án"
                    name="siteId"
                    rules={[
                      { required: true, message: 'Vui lòng chọn dự án.' },
                    ]}
                  >
                    <Select
                      showSearch
                      placeholder="Tìm kiếm và chọn dự án"
                      optionFilterProp="label"
                      options={siteOptions}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Mô tả" name="description">
                    <Input.TextArea
                      rows={2}
                      placeholder="Mô tả chi tiết công việc"
                      maxLength={500}
                    />
                  </Form.Item>
                </Col>
                {/* Sự cố đã có ô "Vị trí sự cố" (cây vị trí theo dự án) ở
                    khối Thông tin sự cố → không lặp lại ô Vị trí ở đây. */}
                {!isIncident && (
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Vị trí"
                      name="location"
                      rules={[
                        { required: true, message: 'Vui lòng nhập vị trí.' },
                      ]}
                    >
                      <Input placeholder="VD: Tầng 1 - Khu A" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Người xử lý" name="handlerIds">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Tìm kiếm và chọn người xử lý"
                      optionFilterProp="label"
                      options={personOptions}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Người theo dõi" name="followerIds">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Chọn người theo dõi"
                      optionFilterProp="label"
                      options={personOptions}
                      maxTagCount="responsive"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Ngày khởi tạo"
                    name="startDate"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn ngày khởi tạo.',
                      },
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={DATE_TIME_FORMAT}
                      placeholder="Chọn ngày khởi tạo"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Hạn hoàn thành"
                    name="endDate"
                    dependencies={['startDate']}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value: Dayjs | null | undefined) {
                          const start: Dayjs | null | undefined =
                            getFieldValue('startDate');
                          if (!value || !start || !value.isBefore(start))
                            return Promise.resolve();
                          return Promise.reject(
                            new Error(
                              'Hạn hoàn thành phải lớn hơn hoặc bằng ngày khởi tạo.',
                            ),
                          );
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      showTime={{ format: 'HH:mm' }}
                      format={DATE_TIME_FORMAT}
                      placeholder="Chọn hạn hoàn thành"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Độ ưu tiên" name="priority">
                    <Select
                      placeholder="Chọn độ ưu tiên"
                      options={PRIORITY_OPTIONS}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Khối riêng loại Sự cố: phân loại + thông tin chi tiết */}
          {isIncident && (
            <>
              <Divider />
              <Title level={5}>Thông tin sự cố</Title>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Phân loại sự cố" name="incidentTypeId">
                    <Select
                      allowClear
                      showSearch
                      placeholder="Chọn phân loại sự cố"
                      optionFilterProp="label"
                      options={incidentTypes.map((t) => ({
                        value: t.id,
                        label: t.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              {/* Bộ field chi tiết sự cố — giống hệt form sửa ở trang chi tiết:
                  Phase · RBF/RBW · Unit · Vị trí sự cố · Tài sản/Thiết bị ·
                  Phân loại sửa chữa · Phân loại hư hỏng · Nguyên nhân ·
                  Đơn vị phụ trách · Giải pháp khắc phục · Công việc tiếp theo ·
                  Số lần Re-Open · Ghi chú. */}
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Phase"
                    name="phase"
                    rules={[
                      { required: true, message: 'Vui lòng nhập Phase.' },
                    ]}
                  >
                    <Input placeholder="VD: Phase 1" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="RBF/RBW"
                    name="rbfRbw"
                    rules={[
                      { required: true, message: 'Vui lòng nhập RBF/RBW.' },
                    ]}
                  >
                    <Input placeholder="VD: RBF" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Unit"
                    name="unit"
                    rules={[{ required: true, message: 'Vui lòng nhập Unit.' }]}
                  >
                    <Input placeholder="VD: Unit A" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Vị trí sự cố"
                    name="incidentLocationId"
                    help={
                      incidentSiteId
                        ? undefined
                        : 'Chọn Dự án ở phần Thông tin chung trước'
                    }
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn vị trí sự cố.',
                      },
                    ]}
                  >
                    <TreeSelect
                      showSearch
                      treeDefaultExpandAll
                      treeNodeFilterProp="title"
                      disabled={!incidentSiteId}
                      placeholder={
                        incidentSiteId
                          ? 'Chọn vị trí xảy ra sự cố'
                          : 'Chọn Dự án trước'
                      }
                      treeData={incidentLocationTree}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tài sản/Thiết bị liên quan"
                    name="incidentAssetId"
                    help={
                      incidentLocationId
                        ? undefined
                        : 'Chọn vị trí sự cố trước để lọc tài sản'
                    }
                  >
                    <Select
                      allowClear
                      showSearch
                      disabled={!incidentLocationId}
                      placeholder={
                        incidentLocationId
                          ? 'Chọn tài sản/thiết bị tại vị trí này'
                          : 'Chọn vị trí sự cố trước'
                      }
                      optionFilterProp="label"
                      options={incidentAssets.map((a) => ({
                        value: a.id,
                        label: `${a.code} — ${a.name}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Phân loại sửa chữa"
                    name="repairTypeId"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn phân loại sửa chữa.',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn phân loại sửa chữa"
                      optionFilterProp="label"
                      options={repairTypes.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Phân loại hư hỏng"
                    name="damageTypeId"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn phân loại hư hỏng.',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn phân loại hư hỏng"
                      optionFilterProp="label"
                      options={damageTypes.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Đơn vị phụ trách (PIC)"
                    name="picUnitId"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng chọn đơn vị phụ trách.',
                      },
                    ]}
                  >
                    <Select
                      showSearch
                      allowClear
                      placeholder="Chọn đơn vị phụ trách"
                      optionFilterProp="label"
                      options={picUnits.map((d) => ({
                        value: d.id,
                        label: d.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Nguyên nhân"
                    name="cause"
                    rules={[
                      { required: true, message: 'Vui lòng nhập nguyên nhân.' },
                    ]}
                  >
                    <Input.TextArea rows={2} placeholder="Nguyên nhân sự cố" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Giải pháp khắc phục"
                    name="solution"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng nhập giải pháp khắc phục.',
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Giải pháp đã/kế hoạch xử lý"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    label="Công việc tiếp theo"
                    name="nextWork"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng nhập công việc tiếp theo.',
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Công việc cần làm tiếp"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Số lần Re-Open"
                    name="reopenCount"
                    rules={[
                      {
                        required: true,
                        message: 'Vui lòng nhập số lần Re-Open.',
                      },
                    ]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Ghi chú" name="incidentNotes">
                <Input.TextArea rows={2} placeholder="Ghi chú thêm về sự cố" />
              </Form.Item>
            </>
          )}

          {/* Khối checklist: bảng xem trước (nạp từ mẫu, không sửa ở đây) */}
          {isChecklist && (
            <>
              <Divider />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  Danh sách tiêu chí
                </Title>
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  title="Chọn mẫu checklist"
                  aria-label="Chọn mẫu checklist"
                  onClick={() => setPickerOpen(true)}
                  style={{ minWidth: 44, minHeight: 44 }}
                />
              </div>
              <Table<ChecklistDraft>
                columns={checklistColumns}
                dataSource={checklistRows}
                rowKey="uid"
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: 1100 }}
                locale={{
                  emptyText:
                    'Chưa chọn mẫu — bấm nút + để nạp tiêu chí từ mẫu checklist',
                }}
                onRow={(record) =>
                  isGroupRow(record) ? { style: { background: '#f3f5f9' } } : {}
                }
              />
              <Text type="secondary">
                Mẫu mang sẵn Tên, Tiêu chuẩn kiểm tra và Loại giá trị (Đúng/Sai
                · Chữ · Số) quyết định kiểu của cột Giá trị. Số lượng, Giá trị,
                Đính kèm, Checkpoint, Trạng thái (Đạt/Không đạt) và Ghi chú để
                rỗng, nhập lúc đi kiểm tra.
              </Text>
            </>
          )}

          {/* Khối năng lượng: bảng đồng hồ (bỏ khối "đợt kiểm tra") */}
          {isEnergy && (
            <>
              <Divider />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  Đồng hồ đo
                </Title>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    handleAddMeter('ELECTRICITY', ELECTRIC_3_PHASES)
                  }
                  style={{ minHeight: 40 }}
                >
                  Điện 3 pha
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddMeter('ELECTRICITY', ['NORMAL'])}
                  style={{ minHeight: 40 }}
                >
                  Điện 1 pha
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddMeter('WATER')}
                  style={{ minHeight: 40 }}
                >
                  Nước
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddMeter('DO_OIL')}
                  style={{ minHeight: 40 }}
                >
                  Dầu DO
                </Button>
              </div>
              <Table<FlatMeterRow>
                columns={meterColumns}
                dataSource={flatMeterRows}
                rowKey="key"
                pagination={false}
                tableLayout="fixed"
                scroll={{ x: 1400 }}
                locale={{
                  emptyText:
                    'Trống — bấm “Điện 3 giờ” để thêm đồng hồ điện 3 pha',
                }}
                onRow={(record) =>
                  record.isFirst ? { style: { background: '#fafcff' } } : {}
                }
              />
              <Text type="secondary">
                Chỉ nhập Mã đồng hồ · Vị trí (khách hàng) · Loại. Mỗi dòng là 1
                pha (khung giờ) của đồng hồ: điện có 1 giờ hoặc 3 giờ (bình
                thường · thấp điểm · cao điểm), nước/dầu DO chỉ 1 giờ — thêm/xoá
                pha ở cột Thao tác. Chỉ số đầu · cuối · tổng, ảnh đính kèm và
                ghi chú nhập lúc đi kiểm tra (Tổng = Cuối − Đầu, server tự
                tính).
              </Text>
            </>
          )}

          {/* Khối masterplan 3 cấp: hệ thống → nhóm → đầu việc */}
          {isMasterplan && (
            <>
              <Divider />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Title level={5} style={{ margin: 0 }}>
                  Hệ thống Masterplan
                </Title>
                <Form.Item noStyle shouldUpdate>
                  {(formInstance) => {
                    const systems =
                      (formInstance.getFieldValue('systems') as
                        MasterplanSystemDraft[] | undefined) ?? [];
                    return (
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        title="Thêm hệ thống"
                        aria-label="Thêm hệ thống"
                        onClick={() => {
                          formInstance.setFieldValue('systems', [
                            ...systems,
                            { categories: [] },
                          ]);
                          setDirty(true);
                        }}
                        style={{ minWidth: 44, minHeight: 44 }}
                      />
                    );
                  }}
                </Form.Item>
              </div>
              <Form.List name="systems">
                {(systemFields, { remove: removeSystem }) => (
                  <Space
                    direction="vertical"
                    style={{ width: '100%' }}
                    size={12}
                  >
                    {systemFields.map((sf) => (
                      <Card
                        key={sf.key}
                        size="small"
                        title={`Hệ thống ${sf.name + 1}`}
                        extra={
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            title="Xóa hệ thống"
                            onClick={() => {
                              removeSystem(sf.name);
                              setDirty(true);
                            }}
                          />
                        }
                      >
                        <Row gutter={12}>
                          <Col xs={24} md={10}>
                            <Form.Item
                              label="Tên hệ thống"
                              name={[sf.name, 'vnName']}
                              rules={[
                                {
                                  required: true,
                                  message: 'Vui lòng nhập tên hệ thống.',
                                },
                              ]}
                            >
                              <Input placeholder="VD: Hệ thống điện" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={7}>
                            <Form.Item label="Mã" name={[sf.name, 'code']}>
                              <Input placeholder="VD: ELEC" />
                            </Form.Item>
                          </Col>
                          <Col xs={12} md={7}>
                            <Form.Item
                              label="Tên tiếng Anh"
                              name={[sf.name, 'engName']}
                            >
                              <Input placeholder="VD: Electrical" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Form.List name={[sf.name, 'categories']}>
                          {(
                            categoryFields,
                            { add: addCategory, remove: removeCategory },
                          ) => (
                            <>
                              {categoryFields.map((cf) => (
                                <Card
                                  key={cf.key}
                                  size="small"
                                  type="inner"
                                  title={`Nhóm ${cf.name + 1}`}
                                  style={{ marginBottom: 8 }}
                                  extra={
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      title="Xóa nhóm"
                                      onClick={() => {
                                        removeCategory(cf.name);
                                        setDirty(true);
                                      }}
                                    />
                                  }
                                >
                                  <Row gutter={12}>
                                    <Col xs={24} md={12}>
                                      <Form.Item
                                        label="Tên nhóm"
                                        name={[cf.name, 'vnName']}
                                        rules={[
                                          {
                                            required: true,
                                            message: 'Vui lòng nhập tên nhóm.',
                                          },
                                        ]}
                                      >
                                        <Input placeholder="VD: Trạm biến áp" />
                                      </Form.Item>
                                    </Col>
                                    <Col xs={24} md={12}>
                                      <Form.Item
                                        label="Mã nhóm"
                                        name={[cf.name, 'code']}
                                      >
                                        <Input placeholder="VD: SUB" />
                                      </Form.Item>
                                    </Col>
                                  </Row>
                                  <Form.List name={[cf.name, 'tasks']}>
                                    {(
                                      taskFields,
                                      { add: addTask, remove: removeTask },
                                    ) => (
                                      <>
                                        {taskFields.map((tf) => (
                                          <Row
                                            key={tf.key}
                                            gutter={8}
                                            align="middle"
                                          >
                                            <Col xs={24} md={10}>
                                              <Form.Item
                                                label={
                                                  tf.name === 0
                                                    ? 'Đầu việc'
                                                    : undefined
                                                }
                                                name={[tf.name, 'title']}
                                                rules={[
                                                  {
                                                    required: true,
                                                    message:
                                                      'Vui lòng nhập tên đầu việc.',
                                                  },
                                                ]}
                                              >
                                                <Input placeholder="Tên đầu việc" />
                                              </Form.Item>
                                            </Col>
                                            <Col xs={11} md={6}>
                                              <Form.Item
                                                label={
                                                  tf.name === 0
                                                    ? 'PIC'
                                                    : undefined
                                                }
                                                name={[tf.name, 'pic']}
                                              >
                                                <Input placeholder="Người phụ trách" />
                                              </Form.Item>
                                            </Col>
                                            <Col xs={11} md={6}>
                                              <Form.Item
                                                label={
                                                  tf.name === 0
                                                    ? 'Tần suất'
                                                    : undefined
                                                }
                                                name={[tf.name, 'frequency']}
                                              >
                                                <Input placeholder="VD: hàng tuần" />
                                              </Form.Item>
                                            </Col>
                                            <Col xs={2} md={2}>
                                              <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                title="Xóa đầu việc"
                                                onClick={() => {
                                                  removeTask(tf.name);
                                                  setDirty(true);
                                                }}
                                              />
                                            </Col>
                                          </Row>
                                        ))}
                                        <Button
                                          type="dashed"
                                          size="small"
                                          icon={<PlusOutlined />}
                                          onClick={() => {
                                            addTask({});
                                            setDirty(true);
                                          }}
                                        >
                                          Thêm đầu việc
                                        </Button>
                                      </>
                                    )}
                                  </Form.List>
                                </Card>
                              ))}
                              <Button
                                type="dashed"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  addCategory({ tasks: [] });
                                  setDirty(true);
                                }}
                              >
                                Thêm nhóm
                              </Button>
                            </>
                          )}
                        </Form.List>
                      </Card>
                    ))}
                  </Space>
                )}
              </Form.List>
            </>
          )}

          {/* Khối lịch lặp (CHECKLIST + ENERGY_CHECK) */}
          {supportsRecurrence && (
            <>
              <Divider />
              <Space align="center" style={{ marginBottom: 12 }}>
                <Switch checked={recurrenceOn} onChange={setRecurrenceOn} />
                <Title level={5} style={{ margin: 0 }}>
                  Tạo lịch lặp
                </Title>
              </Space>
              {recurrenceOn && (
                <>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Lặp theo *</Text>
                      </div>
                      <Select
                        value={frequency}
                        options={FREQUENCY_OPTIONS}
                        style={{ width: '100%', marginBottom: 16 }}
                        onChange={setFrequency}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Kết thúc lặp</Text>
                      </div>
                      <Radio.Group
                        value={recEndType}
                        options={[
                          { value: 'NEVER', label: 'Không kết thúc' },
                          { value: 'ON_DATE', label: 'Kết thúc vào ngày' },
                        ]}
                        onChange={(e) => setRecEndType(e.target.value)}
                      />
                      {recEndType === 'ON_DATE' && (
                        <DatePicker
                          value={recEndDate}
                          format={DATE_FORMAT}
                          placeholder="Chọn ngày kết thúc"
                          style={{ width: '100%', marginTop: 8 }}
                          onChange={setRecEndDate}
                        />
                      )}
                    </Col>
                  </Row>
                  {frequency === 'WEEKLY' && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Lặp vào các thứ *</Text>
                      </div>
                      <Checkbox.Group
                        value={weekdays}
                        options={WEEKDAY_LABELS.map((label, i) => ({
                          label,
                          value: i + 1,
                        }))}
                        onChange={(v) => setWeekdays(v as number[])}
                      />
                    </div>
                  )}
                  {frequency === 'MONTHLY' && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Lặp vào các ngày trong tháng *</Text>
                      </div>
                      <Select
                        mode="multiple"
                        value={monthDays}
                        placeholder="Chọn ngày 1-31 (tháng thiếu ngày thì bỏ qua)"
                        style={{ width: '100%' }}
                        options={Array.from({ length: 31 }, (_, i) => ({
                          value: i + 1,
                          label: `Ngày ${i + 1}`,
                        }))}
                        onChange={setMonthDays}
                      />
                    </div>
                  )}
                  {frequency === 'QUARTERLY' && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8 }}>
                        <Text strong>Lặp vào *</Text>
                      </div>
                      <Radio.Group
                        value={quarterlyMode}
                        options={[
                          {
                            value: 'START_OF_QUARTER',
                            label: 'Đầu quý (1/1, 1/4, 1/7, 1/10)',
                          },
                          { value: 'END_OF_QUARTER', label: 'Cuối quý' },
                        ]}
                        onChange={(e) => setQuarterlyMode(e.target.value)}
                      />
                    </div>
                  )}
                  {frequency === 'YEARLY' && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={12} md={6}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>Tháng *</Text>
                        </div>
                        <Select
                          value={yearMonth}
                          placeholder="Tháng"
                          style={{ width: '100%' }}
                          options={Array.from({ length: 12 }, (_, i) => ({
                            value: i + 1,
                            label: `Tháng ${i + 1}`,
                          }))}
                          onChange={setYearMonth}
                        />
                      </Col>
                      <Col xs={12} md={6}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>Ngày *</Text>
                        </div>
                        <Select
                          value={yearDay}
                          placeholder="Ngày"
                          style={{ width: '100%' }}
                          options={Array.from({ length: 31 }, (_, i) => ({
                            value: i + 1,
                            label: `Ngày ${i + 1}`,
                          }))}
                          onChange={setYearDay}
                        />
                      </Col>
                    </Row>
                  )}
                  <Text type="secondary">
                    Công việc này là Mẫu lặp — cron mỗi giờ tự copy thành công
                    việc con theo tần suất trên.
                  </Text>
                </>
              )}
            </>
          )}
        </Form>
      </Modal>
      {/* Dialog xác nhận bỏ dữ liệu khi form đã sửa (X / Đóng / mask / Escape) */}
      <Modal
        title="Bỏ dữ liệu đã nhập?"
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onOk={handleClosed}
        okText="Bỏ dữ liệu"
        cancelText="Tiếp tục nhập"
        okButtonProps={{ danger: true }}
        centered
        zIndex={1200}
        destroyOnClose
        aria-label="Xác nhận bỏ dữ liệu"
      >
        <p>Công việc chưa được tạo, dữ liệu nhập sẽ mất.</p>
      </Modal>
      {/* Dialog chọn mẫu checklist (2 select: danh mục + nội dung cha/con) */}
      <ChecklistTemplatePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAppend={handleAppendTemplate}
      />
    </>
  );
}
