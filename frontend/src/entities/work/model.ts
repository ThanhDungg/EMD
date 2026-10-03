// entities/work/model — domain model công việc (bảng works), dùng chung ở 2+ page
// (danh sách ở pages/home + trang chi tiết ở pages/work-detail).

// Trạng thái thuộc 1 loại công việc (mỗi loại 1 list riêng).
export interface WorkStatus {
  id: number;
  code: string;
  name: string;
  color?: string | null;
  isDefault: boolean;
  isClosed: boolean;
}

export interface WorkHandler {
  id: number;
  accountName: string;
  fullName?: string | null;
}

// Lịch lặp sinh công việc tự động (checklist + kiểm tra năng lượng).
export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

// Thông tin lặp của work mẫu (bảng work_recurrence_schedules — chỉ thời gian).
export interface RecurrenceSchedule {
  id: number;
  frequency: RecurrenceFrequency;
  weekdays: number[];
  monthDays: number[];
  quarterlyMode?: 'START_OF_QUARTER' | 'END_OF_QUARTER' | null;
  yearMonth?: number | null;
  yearDay?: number | null;
  startDate?: string | null;
  endType: 'NEVER' | 'ON_DATE';
  endDate?: string | null;
  isActive: boolean;
  nextRunAt?: string | null;
}

// Công việc (bảng works): 1 người giao + nhiều người thực hiện.
// isRecurrence = true → dòng này là MẪU lặp, cron copy nó thành work con mỗi kỳ.
export interface WorkItem {
  id: number;
  title: string;
  progress?: number;
  status?: WorkStatus | null;
  categoryId?: number;
  category?: { id: number; code?: string | null; vnName: string } | null;
  assigner?: WorkHandler | null;
  handlers?: WorkHandler[];
  isRecurrence?: boolean;
  recurrenceSchedule?: RecurrenceSchedule | null;
  // Dự án / địa điểm (bảng sites) + vị trí tự do + độ ưu tiên.
  // Quản lý dự án suy ra từ site của công việc (sites.manager).
  site?: { id: number; name: string; manager?: WorkHandler | null } | null;
  location?: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  startDate?: string | null;
  endDate?: string | null;
  // Ngày đóng thực tế (list API cũng trả vì đọc full row works).
  completedAt?: string | null;
  // Chi tiết sự cố hư hỏng (chỉ có ở loại INCIDENT; API list cũng include sẵn).
  incidentDetail?: IncidentDetailInfo | null;
}

// Chi tiết 1 công việc (GET /workflow/works/:id) — backend include sẵn
// category/status/assigner/handlers/site/incidentType/incidentDetail.
export interface WorkDetail extends WorkItem {
  description?: string | null;
  incidentType?: { id: number; name: string } | null;
  createdAt?: string | null;
}

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
};

// Chi tiết sự cố hư hỏng (1-1 với work loại INCIDENT).
export interface IncidentDetailInfo {
  id: number;
  beforeImages: string[];
  afterImages: string[];
  phase?: string | null;
  rbfRbw?: string | null;
  unit?: string | null;
  // Vị trí sự cố: FK tới cây vị trí của dự án + tên đường dẫn denormalize
  locationId?: number | null;
  locationName?: string | null;
  location?: string | null;
  // Tài sản / thiết bị liên quan: FK + nhãn denormalize
  assetId?: number | null;
  relatedAsset?: string | null;
  // 3 field droplist + nhãn denormalize
  repairTypeId?: number | null;
  repairType?: string | null;
  damageTypeId?: number | null;
  damageType?: string | null;
  picUnitId?: number | null;
  cause?: string | null;
  picUnit?: string | null;
  solution?: string | null;
  nextWork?: string | null;
  reopenCount: number;
  notes?: string | null;
}

// Row checklist (bảng checklist_items). Quy ước hiển thị: row cha chỉ show
// tiêu đề, row con show full thông tin (tiêu chuẩn, giá trị, trạng thái...).
export type ChecklistRowStatus = 'TODO' | 'DOING' | 'DONE' | 'CANCELLED';

// Loại giá trị của nội dung con: boolean / text / number (null = chưa chốt).
export type ChecklistValueType = 'BOOLEAN' | 'TEXT' | 'NUMBER';

// Trạng thái đánh giá nội dung con: Đạt / Không đạt (null = chưa đánh giá).
export type ChecklistResult = 'PASS' | 'FAIL';

export interface ChecklistTreeNode {
  id: number;
  title: string;
  standard?: string | null;
  // Loại giá trị: quyết định cách hiển thị/nhập cột Giá trị
  valueType?: ChecklistValueType | string | null;
  // Kết quả đánh giá: PASS = Đạt, FAIL = Không đạt, null = chưa đánh giá
  result?: ChecklistResult | null;
  // Độ ưu tiên của dòng (source cũ: "Bình thường")
  itemPriority?: string | null;
  // Bắt buộc nhập giá trị / bắt buộc đính kèm ảnh
  required?: boolean;
  requiredImage?: boolean;
  quantity?: string | number | null;
  value?: string | number | boolean | null;
  attachments?: string[];
  // Ảnh chụp trên điện thoại: lat/long vị trí chụp + thời gian chụp
  photoLat?: string | number | null;
  photoLng?: string | number | null;
  photoTakenAt?: string | null;
  // Vị trí lat/long thiết bị gửi lên khi chụp ảnh
  checkpoint: boolean;
  status: ChecklistRowStatus;
  notes?: string | null;
  sortOrder: number;
  parentId: number | null;
  workId: number | null;
  children: ChecklistTreeNode[];
}

export const CHECKLIST_STATUS_LABEL: Record<ChecklistRowStatus, string> = {
  TODO: 'Chưa làm',
  DOING: 'Đang làm',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã huỷ',
};

export const CHECKLIST_VALUE_TYPE_LABEL: Record<ChecklistValueType, string> = {
  BOOLEAN: 'Đúng / Sai',
  TEXT: 'Chữ',
  NUMBER: 'Số',
};

export const CHECKLIST_RESULT_LABEL: Record<ChecklistResult, string> = {
  PASS: 'Đạt',
  FAIL: 'Không đạt',
};

// Chuẩn hoá giá trị gốc từ seed/mẫu cũ (vd 'Boolean' | 'boolean' | 'number')
// về 1 trong 3 loại chuẩn; trả về null nếu không nhận diện được.
export function normalizeValueType(
  valueType: string | null | undefined,
): ChecklistValueType | null {
  const v = (valueType ?? '').trim().toLowerCase();
  if (!v) return null;
  if (v === 'boolean' || v === 'bool' || v === 'checkbox') return 'BOOLEAN';
  if (v === 'number' || v === 'decimal' || v === 'numeric') return 'NUMBER';
  if (v === 'text' || v === 'string' || v === 'textarea') return 'TEXT';
  return null;
}

// 1 mốc lịch sử chuyển trạng thái (from null = lúc tạo work).
export interface WorkStatusHistory {
  id: number;
  fromStatus: {
    id: number;
    code: string;
    name: string;
    color?: string | null;
  } | null;
  toStatus: {
    id: number;
    code: string;
    name: string;
    color?: string | null;
  } | null;
  changedBy: { id: number; accountName: string; fullName?: string | null };
  note?: string | null;
  createdAt: string;
}
