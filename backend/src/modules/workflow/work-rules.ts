import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * Rule nghiệp vụ của công việc (tài liệu §4.7, §4.11, §12.5), viết dạng hàm
 * thuần để unit test được không cần DB. Mọi hàm trả về hoặc ném lỗi
 * nghiệp vụ — service chỉ lo đọc/ghi dữ liệu.
 */

/** Vai trò của người dùng đối với 1 công việc (tài liệu §4.11).
 * 'manager' = quản lý của dự án chứa công việc (QLDA/GSV): full quyền trong
 * module Quy trình với việc thuộc dự án mình, kể cả khi không trực tiếp
 * giao/nhận/theo dõi việc đó. */
export type WorkRole =
  | 'assigner'
  | 'handler'
  | 'follower'
  | 'manager'
  | 'outsider'
  | 'admin';

export interface WorkRelation {
  assignerId: number;
  handlerIds: number[];
  followerIds: number[];
}

/** Xác định vai trò: admin ưu tiên, sau đó người giao > người thực hiện > người theo dõi.
 * managesSite = user là quản lý/thành viên của dự án chứa việc (QLDA/GSV). */
export function roleOf(
  work: WorkRelation,
  meId: number,
  isAdmin = false,
  managesSite = false,
): WorkRole {
  if (isAdmin) return 'admin';
  if (work.assignerId === meId) return 'assigner';
  if (work.handlerIds.includes(meId)) return 'handler';
  if (work.followerIds.includes(meId)) return 'follower';
  if (managesSite) return 'manager';
  return 'outsider';
}

/** Xem: người theo dõi/phối hợp và quản lý dự án cũng được xem. */
export function canViewWork(role: WorkRole): boolean {
  return role !== 'outsider';
}

/** Sửa + đổi trạng thái: người giao / người thực hiện / quản lý dự án / admin. */
export function canEditWork(role: WorkRole): boolean {
  return (
    role === 'assigner' ||
    role === 'handler' ||
    role === 'manager' ||
    role === 'admin'
  );
}

/**
 * Xoá: chỉ người giao và ADMIN. Người thực hiện chỉ hoàn thành việc, không xoá
 * việc — nếu không, một người nhận việc có thể xoá mất việc đã được giao.
 */
export function canDeleteWork(role: WorkRole): boolean {
  return role === 'assigner' || role === 'admin';
}

export function assertCanView(role: WorkRole): void {
  if (!canViewWork(role)) {
    throw new ForbiddenException('Bạn không có quyền xem công việc này.');
  }
}

export function assertCanEdit(role: WorkRole): void {
  if (!canEditWork(role)) {
    throw new ForbiddenException(
      'Chỉ người giao, người thực hiện, quản lý dự án hoặc ADMIN được sửa.',
    );
  }
}

export function assertCanDelete(role: WorkRole): void {
  if (!canDeleteWork(role)) {
    throw new ForbiddenException('Chỉ người giao hoặc ADMIN được xoá công việc.');
  }
}

/** Loại bỏ id trùng, giữ thứ tự. */
export function dedupeIds(ids: number[] | undefined): number[] | undefined {
  if (ids === undefined) return undefined;
  return [...new Set(ids)];
}

// --- Ngày ---

export interface WorkDates {
  startDate?: string | null;
  endDate?: string | null;
  completedAt?: string | null;
}

function parse(value: string | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Kiểm tra ngày của công việc; trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateWorkDates(dates: WorkDates): string[] {
  const issues: string[] = [];
  const start = parse(dates.startDate);
  const end = parse(dates.endDate);
  const completed = parse(dates.completedAt);
  if (start && end && end < start) {
    issues.push('Ngày kết thúc phải sau ngày bắt đầu.');
  }
  if (start && completed && completed < start) {
    issues.push('Thời điểm hoàn thành phải sau ngày bắt đầu.');
  }
  if (end && completed && completed < end) {
    issues.push('Thời điểm hoàn thành phải sau ngày kết thúc.');
  }
  return issues;
}

export function assertWorkDates(dates: WorkDates): void {
  const issues = validateWorkDates(dates);
  if (issues.length > 0) {
    throw new BadRequestException(issues.join(' '));
  }
}

// --- Đổi trạng thái ---

/**
 * Mã trạng thái "đã hoàn thành" trong bộ status của loại việc. Khi chuyển vào
 * 1 trong các trạng thái này thì tiến độ phải = 100 và ghi completedAt.
 * (Bộ status admin tự định nghĩa; seed hiện dùng mã HOAN_THANH.)
 */
export const COMPLETION_STATUS_CODES = ['HOAN_THANH', 'HOAN THANH', 'COMPLETED'];

export function isCompletionStatus(status: {
  code: string;
  isClosed: boolean;
}): boolean {
  return (
    status.isClosed &&
    COMPLETION_STATUS_CODES.includes(status.code.toUpperCase().trim())
  );
}

export interface StatusSnapshot {
  id: number;
  code: string;
  isClosed: boolean;
}

export interface StatusChangeInput {
  /** Trạng thái hiện tại của công việc (null = chưa gán) */
  current: StatusSnapshot | null;
  /** Trạng thái đích sau khi update (null = bỏ trạng thái) */
  target: StatusSnapshot | null;
  /** Client có gửi progress không */
  progress?: number;
  /** Client có gửi completedAt không */
  completedAt?: string | null;
  isAdmin?: boolean;
  now?: Date;
}

export interface StatusChangeEffects {
  /** null = giữ nguyên tiến độ hiện tại (service không ghi field này) */
  progress: number | null;
  /** null = ghi completedAt = null (dùng khi mở lại việc đã kết thúc) */
  completedAt: string | null;
  /** true = đã đổi trạng thái (dùng để ghi lịch sử) */
  statusChanged: boolean;
}

/**
 * Tính tiến độ / thời điểm hoàn thành khi đổi trạng thái, đồng thời chặn các
 * trường hợp dữ liệu mâu thuẫn (tài liệu §4.7, §12.5):
 *  - Trạng thái kết thúc (isClosed) không có đường đi tiếp: chỉ ADMIN mới
 *    mở lại được, người thường bị từ chối.
 *  - Hoàn thành thì progress = 100 và có completedAt.
 *  - Chưa đóng mà progress = 100 là mâu thuẫn.
 */
export function resolveStatusChange(input: StatusChangeInput): StatusChangeEffects {
  const { current, target, isAdmin = false } = input;
  const now = input.now ?? new Date();
  const statusChanged = (current?.id ?? null) !== (target?.id ?? null);
  const clientProgress = input.progress;
  const clientCompleted = input.completedAt;

  if (statusChanged && current?.isClosed && !isAdmin) {
    throw new ForbiddenException(
      `Công việc đã ở trạng thái kết thúc "${current.code}". Chỉ ADMIN mới mở lại được.`,
    );
  }

  let progress: number | null;
  if (clientProgress !== undefined) {
    progress = clientProgress;
  } else if (target && isCompletionStatus(target)) {
    progress = 100;
  } else if (current?.id === target?.id) {
    progress = null; // giữ nguyên: service tự đọc giá trị hiện tại
  } else {
    progress = null;
  }

  if (target && !target.isClosed && progress === 100) {
    throw new BadRequestException(
      `Trạng thái "${target.code}" chưa kết thúc, không thể để tiến độ 100%.`,
    );
  }
  if (target && isCompletionStatus(target) && progress !== 100) {
    throw new BadRequestException(
      `Trạng thái "${target.code}" là hoàn thành nên tiến độ phải là 100%.`,
    );
  }

  let completedAt: string | null;
  if (clientCompleted !== undefined) {
    completedAt = clientCompleted;
  } else if (!statusChanged) {
    completedAt = null; // không đổi trạng thái → giữ nguyên thời điểm hoàn thành
  } else if (target?.isClosed) {
    // Kết thúc việc: ghi thời điểm hoàn thành thực tế nếu client chưa gửi
    completedAt = now.toISOString();
  } else {
    // Mở lại công việc từ trạng thái kết thúc → xoá thời điểm hoàn thành cũ
    completedAt = null;
  }

  return { progress, completedAt, statusChanged };
}

/** Kiểm tra danh sách id người dùng tồn tại và chưa bị xoá mềm. */
export function assertUsersExist(
  ids: number[],
  foundActiveIds: number[],
  label: string,
): void {
  const found = new Set(foundActiveIds);
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new BadRequestException(
      `${label} không tồn tại hoặc đã bị xoá: ${missing.join(', ')}.`,
    );
  }
}
