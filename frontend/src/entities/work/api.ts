// entities/work/api — API công việc dùng chung (list + detail).
import { apiClient } from '@/shared/api';
import { getToken } from '@/shared/auth';
import type {
  ChecklistResult,
  ChecklistTreeNode,
  WorkDetail,
  WorkItem,
  WorkStatus,
  WorkStatusHistory,
} from './model';

function token(): string | undefined {
  return getToken() ?? undefined;
}

export interface FetchWorksParams {
  scope?: 'assigned' | 'handled' | 'followed';
  categoryId?: number;
  statusId?: number;
  // Trễ hạn: quá endDate mà chưa đóng
  overdue?: boolean;
  // true = chỉ work mẫu lặp, false = chỉ work thường/con
  isRecurrence?: boolean;
  // Thùng rác: chỉ ADMIN (backend ép bỏ qua nếu không phải ADMIN)
  includeDeleted?: boolean;
  deletedOnly?: boolean;
  limit?: number;
  page?: number;
  // Lọc nâng cao drawer filter: dự án + nhân viên + khoảng Từ → Đến
  siteId?: number;
  userId?: number;
  from?: string;
  to?: string;
  // Chỉ sự cố gắn với tài sản đó — trang chi tiết tài sản mở từ tem QR.
  assetId?: number;
}

// Envelope phân trang kiểu source cũ: { data, total, page, limit, totalPages }.
export interface WorksPage {
  items: WorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function buildQuery(params: FetchWorksParams): string {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.categoryId !== undefined)
    query.set('categoryId', String(params.categoryId));
  if (params.statusId !== undefined)
    query.set('statusId', String(params.statusId));
  if (params.overdue) query.set('overdue', 'true');
  if (params.isRecurrence !== undefined)
    query.set('isRecurrence', String(params.isRecurrence));
  if (params.includeDeleted) query.set('includeDeleted', 'true');
  if (params.deletedOnly) query.set('deletedOnly', 'true');
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.siteId !== undefined) query.set('siteId', String(params.siteId));
  if (params.userId !== undefined) query.set('userId', String(params.userId));
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.assetId !== undefined)
    query.set('assetId', String(params.assetId));
  query.set('limit', String(params.limit ?? 100));
  return query.toString();
}

interface WorksEnvelope {
  data: WorkItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function toPage(
  res: WorksEnvelope | WorkItem[],
  fallbackLimit: number,
): WorksPage {
  if (Array.isArray(res)) {
    return {
      items: res,
      total: res.length,
      page: 1,
      limit: fallbackLimit,
      totalPages: 1,
    };
  }
  return {
    items: res.data ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    limit: res.limit ?? fallbackLimit,
    totalPages: res.totalPages ?? 1,
  };
}

// Danh sách công việc dạng trang (bảng theo loại việc): scope=tôi giao /
// tôi thực hiện / theo dõi, hoặc lọc theo loại + status + filter nâng cao.
export async function fetchWorksPage(
  params: FetchWorksParams = {},
): Promise<WorksPage> {
  // Không nuốt lỗi: trả list rỗng khi API hỏng làm người dùng tưởng không có
  // việc. Lỗi đi lên React Query để UI hiển thị đúng nguyên nhân.
  const suffix = buildQuery(params);
  const res = await apiClient.get<WorksEnvelope | WorkItem[]>(
    `/workflow/works${suffix ? `?${suffix}` : ''}`,
    token(),
  );
  return toPage(res, params.limit ?? 20);
}

// Danh sách công việc dạng mảng gọn (trang chủ, Việc lặp): tự bóc envelope.
export async function fetchWorks(
  params: FetchWorksParams = {},
): Promise<WorkItem[]> {
  return (await fetchWorksPage(params)).items;
}

// Chi tiết 1 công việc (trang /works/:id).
export async function fetchWorkById(id: number): Promise<WorkDetail> {
  return apiClient.get<WorkDetail>(`/workflow/works/${id}`, token());
}

// Cây checklist cha-con của 1 work (GET trả sẵn children lồng nhau).
export async function fetchChecklistTree(
  workId: number,
): Promise<ChecklistTreeNode[]> {
  return apiClient.get<ChecklistTreeNode[]>(
    `/workflow/checklists?workId=${workId}`,
    token(),
  );
}

// Thư viện mẫu checklist độc lập (workId null): node gốc là danh mục mẫu
// (VD "Checklist A"), cây con là nội dung cha/con của mẫu đó.
export async function fetchChecklistTemplates(): Promise<ChecklistTreeNode[]> {
  return apiClient.get<ChecklistTreeNode[]>(
    '/workflow/checklists?unattached=true',
    token(),
  );
}

// Timeline lịch sử chuyển trạng thái của 1 work (mới nhất trước).
// Backend tự ghi 1 mốc mỗi lần tạo/đổi status.
export async function fetchWorkHistories(
  workId: number,
): Promise<WorkStatusHistory[]> {
  return apiClient.get<WorkStatusHistory[]>(
    `/workflow/works/${workId}/history`,
    token(),
  );
}

// Bộ trạng thái của 1 loại việc (select chuyển trạng thái ở trang detail).
export async function fetchStatusesByCategory(
  categoryId: number,
): Promise<WorkStatus[]> {
  return apiClient.get<WorkStatus[]>(
    `/workflow/statuses?categoryId=${categoryId}`,
    token(),
  );
}

export interface UpdateWorkPayload {
  title?: string;
  description?: string;
  progress?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  location?: string;
  siteId?: number;
  statusId?: number;
  // Ghi chú kèm khi chuyển trạng thái → lưu vào lịch sử (không phải cột works)
  statusNote?: string;
  handlerIds?: number[];
  startDate?: string;
  endDate?: string;
  completedAt?: string;
}

export interface RecurrencePayload {
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  weekdays?: number[];
  monthDays?: number[];
  quarterlyMode?: 'START_OF_QUARTER' | 'END_OF_QUARTER';
  yearMonth?: number;
  yearDay?: number;
  startDate?: string;
  endType?: 'NEVER' | 'ON_DATE';
  endDate?: string;
  isActive?: boolean;
}

export interface CreateWorkPayload {
  title: string;
  description?: string;
  categoryId: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  location?: string;
  siteId?: number;
  incidentTypeId?: number;
  statusId?: number;
  handlerIds?: number[];
  followerIds?: number[];
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  progress?: number;
  isRecurrence?: boolean;
  recurrence?: RecurrencePayload;
}

// Tạo công việc mới (người giao = user đăng nhập, tự gắn ở API).
export async function createWork(
  payload: CreateWorkPayload,
): Promise<WorkDetail> {
  return apiClient.post<WorkDetail>('/workflow/works', payload, token());
}

// Sửa công việc (chỉ người giao, người thực hiện hoặc ADMIN — backend check).
export async function updateWork(
  id: number,
  payload: UpdateWorkPayload,
): Promise<WorkDetail> {
  return apiClient.patch<WorkDetail>(`/workflow/works/${id}`, payload, token());
}

// Xoá mềm công việc (khôi phục được).
export async function deleteWork(id: number): Promise<unknown> {
  return apiClient.remove(`/workflow/works/${id}`, token());
}

// Mở lại công việc đã xoá mềm (người trong cuộc hoặc ADMIN — backend check).
export async function restoreWork(id: number): Promise<unknown> {
  return apiClient.post(`/workflow/works/${id}/restore`, undefined, token());
}

// Droplist Phân loại sự cố cho form tạo/sửa việc INCIDENT.
export interface IncidentTypeItem {
  id: number;
  code?: string | null;
  name: string;
}

export async function fetchIncidentTypes(): Promise<IncidentTypeItem[]> {
  try {
    const list = await apiClient.get<IncidentTypeItem[]>(
      '/workflow/incident-types',
      token(),
    );
    return list.filter(
      (t) => !(t as unknown as { isDeleted?: boolean }).isDeleted,
    );
  } catch {
    return [];
  }
}

// Chi tiết sự cố hư hỏng (PUT upsert theo work — tất cả optional ở backend,
// modal tạo incident yêu cầu các trường bắt buộc ở client).
export interface SaveIncidentDetailPayload {
  beforeImages?: string[];
  afterImages?: string[];
  phase?: string;
  rbfRbw?: string;
  unit?: string;
  // Vị trí sự cố: FK tới cây vị trí của dự án (siteId của work).
  // locationName là đường dẫn đầy đủ để hiển thị nhanh.
  locationId?: number | null;
  locationName?: string;
  // Tài sản / thiết bị liên quan (thuộc vị trí trên).
  assetId?: number | null;
  relatedAsset?: string;
  // 3 field droplist (module Ứng dụng): phân loại sửa chữa / hư hỏng / đơn vị
  // phụ trách. Backend tự điền nhãn denormalize (repairType/damageType/picUnit).
  repairTypeId?: number | null;
  damageTypeId?: number | null;
  picUnitId?: number | null;
  cause?: string;
  solution?: string;
  nextWork?: string;
  reopenCount?: number;
  notes?: string;
}

export async function saveIncidentDetail(
  workId: number,
  payload: SaveIncidentDetailPayload,
): Promise<unknown> {
  return apiClient.put(
    `/workflow/works/${workId}/incident-detail`,
    payload,
    token(),
  );
}

// 1 dòng tiêu chí/đầu việc của checklist (work loại CHECKLIST).
export interface CreateChecklistItemPayload {
  title: string;
  standard?: string;
  valueType?: string;
  itemPriority?: string;
  required?: boolean;
  requiredImage?: boolean;
  quantity?: number;
  value?: number;
  attachments?: string[];
  photoTakenAt?: string;
  checkpoint?: boolean;
  // Kết quả đánh giá nội dung con: PASS = Đạt, FAIL = Không đạt
  result?: ChecklistResult;
  status?: 'TODO' | 'DOING' | 'DONE' | 'CANCELLED';
  notes?: string;
  sortOrder?: number;
  parentId?: number;
  workId?: number;
}

export async function createChecklistItem(
  payload: CreateChecklistItemPayload,
): Promise<ChecklistTreeNode> {
  return apiClient.post<ChecklistTreeNode>(
    '/workflow/checklists',
    payload,
    token(),
  );
}

export async function updateChecklistItem(
  id: number,
  payload: Partial<CreateChecklistItemPayload>,
): Promise<ChecklistTreeNode> {
  return apiClient.patch<ChecklistTreeNode>(
    `/workflow/checklists/${id}`,
    payload,
    token(),
  );
}

// Xoá mềm cả cây con (mẫu / nhóm / nội dung con).
export async function deleteChecklistItem(
  id: number,
): Promise<{ deleted: number }> {
  return apiClient.remove<{ deleted: number }>(
    `/workflow/checklists/${id}`,
    token(),
  );
}

// Chi tiết kiểm tra năng lượng (GET /workflow/energy-checks?workId=).
// 1 đợt → n đồng hồ → mỗi đồng hồ n chỉ số pha (điện 3 pha:
// NORMAL bình thường, OFF_PEAK thấp điểm, PEAK cao điểm).
export type EnergyPhase = 'NORMAL' | 'PEAK' | 'OFF_PEAK';

export interface EnergyReading {
  id: number;
  phase: EnergyPhase;
  startIndex: number | string;
  endIndex: number | string;
  total?: number | string | null;
}

export interface EnergyMeter {
  id: number;
  meterCode: string;
  meterType: 'ELECTRICITY' | 'WATER' | 'DO_OIL';
  location?: string | null;
  attachments?: string[] | null;
  checkpoint?: boolean;
  notes?: string | null;
  readings: EnergyReading[];
}

export interface EnergyCheck {
  id: number;
  title: string;
  location?: string | null;
  checkTime?: string | null;
  notes?: string | null;
  workId?: number | null;
  meters: EnergyMeter[];
}

export async function fetchEnergyChecks(
  workId: number,
): Promise<EnergyCheck[]> {
  try {
    return await apiClient.get<EnergyCheck[]>(
      `/workflow/energy-checks?workId=${workId}`,
      token(),
    );
  } catch {
    return [];
  }
}

// 1 đợt kiểm tra năng lượng kèm đồng hồ + chỉ số (work loại ENERGY_CHECK).
// Backend tự tính total = cuối − đầu, 1 call tạo cả 3 tầng.
export interface CreateEnergyReadingPayload {
  phase?: 'NORMAL' | 'PEAK' | 'OFF_PEAK';
  startIndex: number;
  endIndex: number;
}

export interface CreateEnergyMeterPayload {
  meterCode: string;
  meterType: 'ELECTRICITY' | 'WATER' | 'DO_OIL';
  location?: string;
  attachments?: string[];
  checkpoint?: boolean;
  notes?: string;
  readings?: CreateEnergyReadingPayload[];
}

export interface CreateEnergyCheckPayload {
  title: string;
  location?: string;
  checkTime?: string;
  notes?: string;
  workId?: number;
  meters?: CreateEnergyMeterPayload[];
}

export async function createEnergyCheck(
  payload: CreateEnergyCheckPayload,
): Promise<unknown> {
  return apiClient.post('/workflow/energy-checks', payload, token());
}

// Masterplan 3 cấp của work loại MASTERPLAN (tạo từng cấp, nối workId/systemId/categoryId).
export interface CreateMasterplanSystemPayload {
  vnName: string;
  code?: string;
  engName?: string;
  image?: string;
  workId?: number;
}

export interface CreateMasterplanCategoryPayload {
  vnName: string;
  systemId: number;
  code?: string;
  engName?: string;
}

export interface CreateMasterplanTaskPayload {
  title: string;
  categoryId: number;
  pic?: string;
  frequency?: string;
  formTemplate?: string;
  classification?: string;
  planData?: Record<string, unknown>;
}

export async function createMasterplanSystem(
  payload: CreateMasterplanSystemPayload,
): Promise<{ id: number }> {
  return apiClient.post<{ id: number }>(
    '/workflow/masterplan-systems',
    payload,
    token(),
  );
}

export async function createMasterplanCategory(
  payload: CreateMasterplanCategoryPayload,
): Promise<{ id: number }> {
  return apiClient.post<{ id: number }>(
    '/workflow/masterplan-categories',
    payload,
    token(),
  );
}

export async function createMasterplanTask(
  payload: CreateMasterplanTaskPayload,
): Promise<unknown> {
  return apiClient.post('/workflow/masterplan-tasks', payload, token());
}

// Droplist Dự án cho filter/form (GET /workflow/sites).
export interface SiteItem {
  id: number;
  code?: string | null;
  name: string;
}

export async function fetchSites(): Promise<SiteItem[]> {
  try {
    const list = await apiClient.get<SiteItem[]>('/workflow/sites', token());
    return list.filter(
      (s) => !(s as unknown as { isDeleted?: boolean }).isDeleted,
    );
  } catch {
    return [];
  }
}

// Danh bạ nhân viên cho filter/form. Endpoint /users khoá ADMIN nên rớt quyền
// thì trả [] — caller tự gộp thêm người có trong danh sách việc.
export interface DirectoryUser {
  id: number;
  accountName: string;
  fullName?: string | null;
}

export async function fetchDirectory(): Promise<DirectoryUser[]> {
  try {
    const list = await apiClient.get<DirectoryUser[]>(
      '/users?isInvestor=false',
      token(),
    );
    return list.filter(
      (u) => !(u as unknown as { isDeleted?: boolean }).isDeleted,
    );
  } catch {
    return [];
  }
}
