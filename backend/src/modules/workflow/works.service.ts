import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { toDateTimeInput } from '../../common/datetime.js';
import { Logger } from '@nestjs/common';
import {
  computeNextRun,
  previewOccurrences,
  toDay,
  type RecurrenceRule,
} from './recurrence-schedule.util.js';
import {
  assertCanDelete,
  assertCanEdit,
  assertCanView,
  assertUsersExist,
  assertWorkDates,
  dedupeIds,
  resolveStatusChange,
  roleOf,
  type StatusSnapshot,
  type WorkRole,
} from './work-rules.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateWorkDto } from './dto/create-work.dto.js';
import type { UpdateWorkDto } from './dto/update-work.dto.js';

const userSelect = {
  id: true,
  accountName: true,
  fullName: true,
  email: true,
} as const;

const workInclude = {
  category: true,
  assigner: { select: userSelect },
  status: true,
  handlers: { include: { user: { select: userSelect } } },
  followers: { select: userSelect },
  site: { include: { manager: { select: userSelect } } },
  incidentType: true,
  incidentDetail: true,
  recurrence: { select: { id: true, title: true } },
  recurrenceSchedule: true,
} satisfies Prisma.WorkInclude;

export type WorkScope = 'assigned' | 'handled' | 'followed' | 'all';

export interface SafeWorkUser {
  id: number;
  accountName: string;
  fullName: string | null;
  email: string;
}

/** Người giao hoặc một trong các người thực hiện (dùng chung cho works + incident-detail). */
export function isWorkInvolved(
  work: { assignerId: number; handlers: Pick<SafeWorkUser, 'id'>[] },
  meId: number,
): boolean {
  return work.assignerId === meId || work.handlers.some((h) => h.id === meId);
}

// ~1000 việc/ngày: mọi list bắt buộc phân trang, mặc định mới nhất trước.
export const WORKS_DEFAULT_LIMIT = 20;
export const WORKS_MAX_LIMIT = 100;

// Mỗi lần cron chỉ đuổi tối đa bấy nhiêu kỳ/1 mẫu (tránh bùng nổ khi cron chết lâu)
const MAX_CATCH_UP_PER_RUN = 20;

export interface FindWorksFilter {
  scope?: WorkScope;
  meId: number;
  // Quyền xem bản đã xoá mềm (chỉ ADMIN, service tự ép false nếu không phải)
  isAdmin?: boolean;
  categoryId?: number;
  statusId?: number;
  // Trễ hạn: quá endDate mà trạng thái chưa đóng (mỗi loại việc 1 tab riêng ở FE)
  overdue?: boolean;
  // true = chỉ work mẫu lặp, false = chỉ work thường/con
  isRecurrence?: boolean;
  includeDeleted?: boolean;
  // true = chỉ lấy bản đã xoá (thùng rác, ADMIN)
  deletedOnly?: boolean;
  page?: number;
  limit?: number;
  // Lọc nâng cao (drawer filter FE): dự án + nhân viên (giao hoặc thực hiện)
  // + khoảng ngày Từ → Đến (việc thiếu ngày thì giữ lại, không loại).
  siteId?: number;
  userId?: number;
  from?: string;
  to?: string;
}

export interface WorksPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vai trò của user đối với 1 work (assigner > handler > follower > outsider).
   * Chấp nhận cả 2 dạng: row thô `{ userId }` (work_handlers) và dạng đã phẳng
   * `{ id }` sau khi qua toResponse.
   */
  private roleOf(
    work: {
      assignerId: number;
      handlers: ({ userId: number } | { id: number })[];
      followers: { id: number }[];
    },
    meId: number,
    isAdmin = false,
  ): WorkRole {
    return roleOf(
      {
        assignerId: work.assignerId,
        handlerIds: work.handlers.map((h) => ('userId' in h ? h.userId : h.id)),
        followerIds: work.followers.map((f) => f.id),
      },
      meId,
      isAdmin,
    );
  }

  // --- Lịch sử trạng thái ---

  /** Ghi 1 mốc lịch sử chuyển trạng thái (from null = lúc tạo work). */
  private recordStatusHistory(
    workId: number,
    fromStatusId: number | null,
    toStatusId: number | null,
    changedById: number,
    note?: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return client.workStatusHistory.create({
      data: {
        workId,
        fromStatusId,
        toStatusId,
        changedById,
        ...(note ? { note } : {}),
      },
    });
  }

  /** Timeline lịch sử của 1 work (mới nhất trước). */
  async history(id: number, meId?: number, isAdmin = false) {
    await this.findOne(id, meId, isAdmin);
    return this.prisma.workStatusHistory.findMany({
      where: { workId: id },
      include: {
        fromStatus: true,
        toStatus: true,
        changedBy: { select: userSelect },
      },
      orderBy: { id: 'desc' },
    });
  }

  // --- Helpers ---

  /**
   * Chuẩn hoá response: handlers phẳng thành User[] (ẩn bảng trung gian),
   * ẩn chi tiết sự cố đã xoá mềm.
   */
  private toResponse<
    T extends {
      handlers: { user: SafeWorkUser }[];
      incidentDetail: { isDeleted: boolean } | null;
    },
  >(work: T) {
    const { handlers, incidentDetail, ...rest } = work;
    return {
      ...rest,
      handlers: handlers.map((h) => h.user),
      incidentDetail: incidentDetail && !incidentDetail.isDeleted ? incidentDetail : null,
    };
  }

  async findAll(filter: FindWorksFilter) {
    const {
      scope = 'all',
      meId,
      isAdmin = false,
      categoryId,
      statusId,
      overdue = false,
      isRecurrence,
      includeDeleted = false,
      deletedOnly = false,
      page = 1,
      limit = WORKS_DEFAULT_LIMIT,
      siteId,
      userId,
      from,
      to,
    } = filter;
    const take = Math.min(Math.max(limit, 1), WORKS_MAX_LIMIT);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;
    // Đầu ngày hôm nay UTC (khớp @db.Date, so theo ngày không theo giờ)
    const today = toDay(new Date());
    const and: Prisma.WorkWhereInput[] = [];
    if (scope === 'assigned') and.push({ assignerId: meId });
    if (scope === 'handled') and.push({ handlers: { some: { userId: meId } } });
    if (scope === 'followed') and.push({ followers: { some: { id: meId } } });
    // Quyền xem: user thường chỉ thấy việc liên quan tới mình (người giao /
    // người thực hiện / người theo dõi). ADMIN xem được toàn bộ.
    if (!isAdmin) {
      and.push({
        OR: [
          { assignerId: meId },
          { handlers: { some: { userId: meId } } },
          { followers: { some: { id: meId } } },
        ],
      });
    }
    if (categoryId !== undefined) and.push({ categoryId });
    if (statusId !== undefined) and.push({ statusId });
    if (isRecurrence !== undefined) and.push({ isRecurrence });
    if (siteId !== undefined) and.push({ siteId });
    if (userId !== undefined) {
      and.push({ OR: [{ assignerId: userId }, { handlers: { some: { userId } } }] });
    }
    if (from !== undefined) {
      and.push({ OR: [{ endDate: null }, { endDate: { gte: new Date(from) } }] });
    }
    if (to !== undefined) {
      and.push({ OR: [{ startDate: null }, { startDate: { lte: new Date(to) } }] });
    }
    // Trễ hạn: có endDate trong quá khứ + chưa có status đóng
    // (work chưa đặt status tính là chưa xong → vẫn trễ hạn).
    if (overdue) {
      and.push({
        endDate: { lt: today },
        OR: [{ statusId: null }, { status: { isClosed: false } }],
      });
    }
    const where: Prisma.WorkWhereInput = {
      // Xoá mềm: mặc định chỉ lấy isDeleted = false. ADMIN có thêm 2 chế độ:
      // includeDeleted = thấy tất cả, deletedOnly = chỉ bản đã xoá (thùng rác).
      // Không phải ADMIN thì 2 cờ này bị ép bỏ qua.
      ...(deletedOnly && isAdmin
        ? { isDeleted: true }
        : includeDeleted && isAdmin
          ? {}
          : { isDeleted: false }),
      ...(and.length > 0 ? { AND: and } : {}),
    };
    // Envelope phân trang kiểu source cũ: { data, total, page, limit, totalPages }.
    const [total, rows] = await Promise.all([
      this.prisma.work.count({ where }),
      this.prisma.work.findMany({
        where,
        include: workInclude,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
    ]);
    return {
      data: rows.map((w) => this.toResponse(w)),
      total,
      page: currentPage,
      limit: take,
      totalPages: Math.max(1, Math.ceil(total / take)),
    };
  }

  /** Load 1 work kèm quan hệ; bỏ qua bản đã xoá mềm. */
  private async loadWork(id: number) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: workInclude,
    });
    if (!work || work.isDeleted) {
      throw new NotFoundException(`Work #${id} không tồn tại.`);
    }
    return work;
  }

  /**
   * Chi tiết công việc: có kiểm tra quyền xem ở server (tài liệu §4.11).
   * Truyền `meId` = undefined thì bỏ qua kiểm tra (dùng nội bộ/cron).
   */
  async findOne(id: number, meId?: number, isAdmin = false) {
    const work = await this.loadWork(id);
    if (meId !== undefined) {
      assertCanView(this.roleOf(work, meId, isAdmin));
    }
    return this.toResponse(work);
  }

  /**
   * Kiểm tra status thuộc đúng loại của work. Trả về statusId hợp lệ.
   * Không truyền statusId → tự gắn status mặc định của loại.
   */
  private async resolveStatusId(
    categoryId: number,
    statusId: number | undefined,
  ): Promise<number | null> {
    if (statusId === undefined) {
      const fallback = await this.prisma.workflowStatus.findFirst({
        where: { categoryId, isDeleted: false, isDefault: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      });
      return fallback?.id ?? null;
    }
    const status = await this.prisma.workflowStatus.findUnique({
      where: { id: statusId },
    });
    if (!status || status.isDeleted || status.categoryId !== categoryId) {
      throw new BadRequestException(
        `Status #${statusId} không thuộc loại công việc này.`,
      );
    }
    return status.id;
  }

  /**
   * Validate + chuẩn hoá thông tin lặp của work mẫu (bảng work_recurrence_schedules).
   * `input` là schedule mới (create) hoặc patch từng phần (update, merge với cũ).
   */
  private async resolveRecurrenceSchedule(
    categoryId: number,
    input: {
      frequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      weekdays?: number[];
      monthDays?: number[];
      quarterlyMode?: 'START_OF_QUARTER' | 'END_OF_QUARTER';
      yearMonth?: number;
      yearDay?: number;
      startDate?: string;
      endType?: 'NEVER' | 'ON_DATE';
      endDate?: string;
      isActive?: boolean;
    },
    current?: {
      frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      weekdays: number[];
      monthDays: number[];
      quarterlyMode: 'START_OF_QUARTER' | 'END_OF_QUARTER' | null;
      yearMonth: number | null;
      yearDay: number | null;
      startDate: Date | null;
      endType: 'NEVER' | 'ON_DATE';
      endDate: Date | null;
    } | null,
    // startDate của work mẫu (dùng khi schedule không đặt startDate riêng)
    fallbackStartDate?: string,
  ): Promise<Prisma.WorkRecurrenceScheduleUncheckedCreateWithoutTemplateInput> {
    const category = await this.prisma.workflowCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.isDeleted) {
      throw new NotFoundException(`WorkflowCategory #${categoryId} không tồn tại.`);
    }
    if (!category.supportsRecurrence) {
      throw new BadRequestException(
        `Loại "${category.vnName}" chưa bật lịch lặp (supportsRecurrence).`,
      );
    }
    const frequency = input.frequency ?? current?.frequency;
    if (!frequency) {
      throw new BadRequestException('Work mẫu lặp cần chọn tần suất (frequency).');
    }
    const out: Prisma.WorkRecurrenceScheduleUncheckedCreateWithoutTemplateInput = {
      frequency,
      weekdays: [],
      monthDays: [],
      quarterlyMode: null,
      yearMonth: null,
      yearDay: null,
    };
    const weekdays = input.weekdays ?? current?.weekdays ?? [];
    const monthDays = input.monthDays ?? current?.monthDays ?? [];
    const quarterlyMode = input.quarterlyMode ?? current?.quarterlyMode ?? undefined;
    const yearMonth = input.yearMonth ?? current?.yearMonth ?? undefined;
    const yearDay = input.yearDay ?? current?.yearDay ?? undefined;
    if (frequency === 'WEEKLY') {
      const days = [...new Set(weekdays)];
      if (days.length === 0 || days.some((d) => d < 1 || d > 7)) {
        throw new BadRequestException('Lặp theo tuần cần chọn ít nhất 1 thứ (1 = Thứ 2 ... 7 = Chủ nhật).');
      }
      out.weekdays = days.sort((a, b) => a - b);
    } else if (frequency === 'MONTHLY') {
      const days = [...new Set(monthDays)];
      if (days.length === 0 || days.some((d) => d < 1 || d > 31)) {
        throw new BadRequestException('Lặp theo tháng cần chọn ít nhất 1 ngày (1-31).');
      }
      out.monthDays = days.sort((a, b) => a - b);
    } else if (frequency === 'QUARTERLY') {
      if (!quarterlyMode) {
        throw new BadRequestException('Lặp theo quý cần chọn đầu quý hoặc cuối quý.');
      }
      out.quarterlyMode = quarterlyMode;
    } else if (frequency === 'YEARLY') {
      if (!yearMonth || !yearDay) {
        throw new BadRequestException('Lặp theo năm cần chọn 1 ngày trong năm (tháng + ngày).');
      }
      const maxDay = yearMonth === 2 ? 29 : [4, 6, 9, 11].includes(yearMonth) ? 30 : 31;
      if (yearDay > maxDay) {
        throw new BadRequestException(`Tháng ${yearMonth} không có ngày ${yearDay}.`);
      }
      out.yearMonth = yearMonth;
      out.yearDay = yearDay;
    }
    if (input.startDate !== undefined) {
      out.startDate = toDateTimeInput(input.startDate);
    } else if (!current) {
      out.startDate = null; // theo startDate của work mẫu
    }
    const endType = input.endType ?? current?.endType ?? 'NEVER';
    out.endType = endType;
    if (endType === 'ON_DATE') {
      const endDate = input.endDate ?? current?.endDate?.toISOString() ?? undefined;
      if (!endDate) {
        throw new BadRequestException('Kết thúc vào ngày thì phải chọn endDate.');
      }
      out.endDate = toDateTimeInput(endDate) ?? null;
      const effectiveStart =
        input.startDate ?? current?.startDate?.toISOString() ?? fallbackStartDate;
      if (effectiveStart && out.endDate && new Date(out.endDate) < new Date(effectiveStart)) {
        throw new BadRequestException('Ngày kết thúc lặp phải sau ngày bắt đầu.');
      }
    } else {
      out.endDate = null;
    }
    if (input.isActive !== undefined) out.isActive = input.isActive;
    return out;
  }

  private toRuleOf(schedule: {
    frequency: RecurrenceRule['frequency'];
    weekdays: number[];
    monthDays: number[];
    quarterlyMode: RecurrenceRule['quarterlyMode'];
    yearMonth: number | null;
    yearDay: number | null;
  }): RecurrenceRule {
    return {
      frequency: schedule.frequency,
      weekdays: schedule.weekdays,
      monthDays: schedule.monthDays,
      quarterlyMode: schedule.quarterlyMode,
      yearMonth: schedule.yearMonth,
      yearDay: schedule.yearDay,
    };
  }

  // --- Engine: cron mỗi giờ copy work mẫu thành work con ---
  @Cron(CronExpression.EVERY_HOUR)
  async handleGenerateDue() {
    // Cron không ném lỗi ra ngoài (tránh crash app) nhưng phải ghi log để
    // phát hiện được mẫu lặp hỏng.
    await this.generateDue(new Date()).catch((err: unknown) => {
      this.logger.error(`Sinh việc lặp thất bại: ${String(err)}`);
    });
  }

  /** Sinh work con cho mọi mẫu tới hạn tính tới `now`. Trả tổng số đã tạo. */
  async generateDue(now: Date): Promise<{ generated: number }> {
    const due = await this.prisma.work.findMany({
      where: {
        isRecurrence: true,
        isDeleted: false,
        category: { supportsRecurrence: true, isDeleted: false },
        recurrenceSchedule: {
          isActive: true,
          isDeleted: false,
          OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
        },
      },
      select: { id: true },
    });
    let generated = 0;
    for (const t of due) {
      generated += await this.generateForTemplate(t.id, now).catch(() => 0);
    }
    return { generated };
  }

  /**
   * Sinh work con cho 1 mẫu (dùng cho cron + nút "Sinh ngay" ở FE).
   * Copy toàn bộ nội dung mẫu tại thời điểm sinh.
   */
  async generateForTemplate(
    id: number,
    now: Date,
    auth?: { meId: number; isAdmin: boolean },
  ): Promise<number> {
    const template = await this.prisma.work.findUnique({
      where: { id },
      include: {
        recurrenceSchedule: true,
        handlers: { select: { userId: true } },
        followers: { select: { id: true } },
      },
    });
    const schedule = template?.recurrenceSchedule;
    if (
      !template ||
      template.isDeleted ||
      !template.isRecurrence ||
      !schedule ||
      schedule.isDeleted ||
      !schedule.isActive
    ) {
      return 0;
    }
    if (auth) {
      if (template.assignerId !== auth.meId && !auth.isAdmin) {
        throw new ForbiddenException('Chỉ người giao của mẫu hoặc ADMIN được sinh việc.');
      }
    }
    const rule = this.toRuleOf(schedule);
    const today = toDay(now);
    const scheduleStart = schedule.startDate ?? template.startDate ?? now;
    let cursor =
      schedule.nextRunAt != null
        ? toDay(schedule.nextRunAt)
        : new Date(toDay(scheduleStart).getTime() - 86_400_000);
    let created = 0;
    for (let i = 0; i < MAX_CATCH_UP_PER_RUN; i += 1) {
      const next = computeNextRun(rule, cursor);
      if (!next) {
        await this.touchScheduleNextRun(schedule.id, null);
        break;
      }
      // Kết thúc vào ngày user chọn → quá hạn thì tự tắt schedule
      if (schedule.endType === 'ON_DATE' && schedule.endDate && next > toDay(schedule.endDate)) {
        await this.prisma.workRecurrenceSchedule.update({
          where: { id: schedule.id },
          data: { isActive: false, nextRunAt: null },
        });
        break;
      }
      if (next > today) {
        await this.touchScheduleNextRun(schedule.id, next);
        break;
      }
      if (await this.createOccurrence(template, next)) created += 1;
      cursor = next;
    }
    return created;
  }

  /** Xem trước các kỳ sẽ sinh của 1 mẫu (không ghi DB). */
  async previewTemplate(
    id: number,
    count = 10,
    auth?: { meId: number; isAdmin: boolean },
  ) {
    const template = await this.prisma.work.findUnique({
      where: { id },
      include: { recurrenceSchedule: true, handlers: { select: { userId: true } }, followers: { select: { id: true } } },
    });
    const schedule = template?.recurrenceSchedule;
    if (!template || template.isDeleted || !template.isRecurrence || !schedule) {
      throw new NotFoundException(`Work mẫu #${id} không tồn tại.`);
    }
    if (auth) {
      assertCanView(this.roleOf(template, auth.meId, auth.isAdmin));
    }
    const rule = this.toRuleOf(schedule);
    const scheduleStart = schedule.startDate ?? template.startDate ?? new Date();
    const from =
      schedule.nextRunAt != null
        ? toDay(schedule.nextRunAt)
        : new Date(toDay(scheduleStart).getTime() - 86_400_000);
    const end = schedule.endType === 'ON_DATE' ? schedule.endDate : null;
    return {
      templateId: id,
      dates: previewOccurrences(rule, from, count, end).map((d) =>
        d.toISOString().slice(0, 10),
      ),
    };
  }

  private async touchScheduleNextRun(scheduleId: number, next: Date | null) {
    await this.prisma.workRecurrenceSchedule.update({
      where: { id: scheduleId },
      data: { nextRunAt: next },
    });
  }

  /**
   * Copy mẫu thành 1 work con cho 1 kỳ. Bắt trùng bằng unique
   * (recurrenceId, scheduledDate): cron chạy chồng chỉ bỏ qua, không sinh đôi.
   */
  private async createOccurrence(
    template: {
      id: number;
      title: string;
      description: string | null;
      categoryId: number;
      assignerId: number;
      location: string | null;
      siteId: number | null;
      incidentTypeId: number | null;
      priority: 'LOW' | 'MEDIUM' | 'HIGH';
      handlers: { userId: number }[];
      followers: { id: number }[];
    },
    scheduledDate: Date,
  ): Promise<boolean> {
    const defaultStatus = await this.prisma.workflowStatus.findFirst({
      where: { categoryId: template.categoryId, isDeleted: false, isDefault: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    // Lọc user còn hiệu lực tại thời điểm sinh
    const [handlers, followers] = await Promise.all([
      template.handlers.length > 0
        ? this.prisma.user.findMany({
            where: {
              id: { in: template.handlers.map((h) => h.userId) },
              isDeleted: false,
            },
            select: { id: true },
          })
        : [],
      template.followers.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: template.followers.map((f) => f.id) }, isDeleted: false },
            select: { id: true },
          })
        : [],
    ]);
    try {
      const child = await this.prisma.work.create({
        data: {
          title: template.title,
          description: template.description,
          category: { connect: { id: template.categoryId } },
          assigner: { connect: { id: template.assignerId } },
          ...(defaultStatus ? { status: { connect: { id: defaultStatus.id } } } : {}),
          handlers: { create: handlers.map((h) => ({ userId: h.id })) },
          followers:
            followers.length > 0
              ? { connect: followers.map((f) => ({ id: f.id })) }
              : undefined,
          ...(template.siteId ? { site: { connect: { id: template.siteId } } } : {}),
          ...(template.incidentTypeId
            ? { incidentType: { connect: { id: template.incidentTypeId } } }
            : {}),
          location: template.location,
          priority: template.priority,
          recurrence: { connect: { id: template.id } },
          scheduledDate,
          isRecurrence: false,
        },
      });
      // Việc lặp năng lượng: gối đồng hồ sang kỳ mới (đầu kỳ sau = cuối kỳ trước).
      await this.carryEnergyRollover(template.id, child.id, scheduledDate).catch(
        () => {
          // Copy đồng hồ thất bại thì giữ lại work con (không chặn cron).
        },
      );
      return true;
    } catch (err) {
      // P2002 = kỳ này đã sinh rồi (cron chồng) → bỏ qua
      if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
        return false;
      }
      throw err;
    }
  }

  /**
   * Gối đồng hồ năng lượng sang work con mới sinh (việc lặp).
   * Nguồn = kỳ gần nhất đã có số liệu (work con trước đó, fallback về mẫu):
   * mỗi dòng đúng mã đồng hồ + pha đó lấy chỉ số cuối kỳ trước làm chỉ số
   * đầu kỳ sau (cuối kỳ sau để trống = cuối kỳ trước, tổng 0, người dùng
   * nhập tiếp khi đi ghi). Chỉ chạy với loại ENERGY_CHECK.
   */
  private async carryEnergyRollover(
    templateId: number,
    childWorkId: number,
    scheduledDate: Date,
  ): Promise<void> {
    const category = await this.prisma.workflowCategory.findFirst({
      where: {
        works: { some: { id: templateId } },
        isDeleted: false,
      },
      select: { code: true },
    });
    if (category?.code !== 'ENERGY_CHECK') return;

    const checkInclude = {
      meters: {
        where: { isDeleted: false },
        include: { readings: { where: { isDeleted: false } } },
      },
    } as const;

    // Các ứng viên nguồn: con mới nhất trước → … → mẫu (lấy thằng đầu có số liệu).
    const siblings = await this.prisma.work.findMany({
      where: {
        recurrenceId: templateId,
        isDeleted: false,
        id: { not: childWorkId },
      },
      select: { id: true },
      orderBy: [{ scheduledDate: 'desc' }, { id: 'desc' }],
      take: 20,
    });
    const candidateIds = [...siblings.map((s) => s.id), templateId];
    let sourceChecks:
      | { title: string; location: string | null; notes: string | null; meters: any[] }[]
      | null = null;
    for (const wid of candidateIds) {
      const checks = await this.prisma.energyCheck.findMany({
        where: { workId: wid, isDeleted: false },
        include: checkInclude,
        orderBy: { id: 'asc' },
      });
      if (checks.some((c) => c.meters.length > 0)) {
        sourceChecks = checks;
        break;
      }
    }
    if (!sourceChecks || sourceChecks.length === 0) return;

    for (const src of sourceChecks) {
      if (src.meters.length === 0) continue;
      await this.prisma.energyCheck.create({
        data: {
          title: src.title,
          location: src.location,
          checkTime: scheduledDate,
          notes: src.notes,
          work: { connect: { id: childWorkId } },
          meters: {
            create: src.meters.map((m: any) => ({
              meterCode: m.meterCode,
              meterType: m.meterType,
              location: m.location,
              attachments: m.attachments ?? [],
              checkpoint: false,
              notes: m.notes,
              readings: {
                create: m.readings.map((r: any) => {
                  const prevEnd = Number(r.endIndex);
                  return {
                    phase: r.phase,
                    startIndex: prevEnd,
                    endIndex: prevEnd,
                    total: 0,
                  };
                }),
              },
            })),
          },
        },
      });
    }
  }

  /**
   * Kiểm tra các tham chiếu của work trước khi ghi: loại việc, site, phân loại
   * sự cố, người thực hiện và người theo dõi phải tồn tại và chưa bị xoá.
   * Trả về danh sách đã loại trùng.
   */
  private async assertReferences(input: {
    categoryId?: number;
    siteId?: number | null;
    incidentTypeId?: number | null;
    handlerIds?: number[];
    followerIds?: number[];
  }): Promise<{ handlerIds?: number[]; followerIds?: number[] }> {
    if (input.categoryId !== undefined) {
      const category = await this.prisma.workflowCategory.findFirst({
        where: { id: input.categoryId, isDeleted: false },
        select: { id: true },
      });
      if (!category) {
        throw new BadRequestException(`Loại việc #${input.categoryId} không tồn tại.`);
      }
    }
    if (input.siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: input.siteId, isDeleted: false },
        select: { id: true },
      });
      if (!site) throw new BadRequestException(`Dự án #${input.siteId} không tồn tại.`);
    }
    if (input.incidentTypeId) {
      const type = await this.prisma.incidentType.findFirst({
        where: { id: input.incidentTypeId, isDeleted: false },
        select: { id: true },
      });
      if (!type) {
        throw new BadRequestException(`Phân loại sự cố #${input.incidentTypeId} không tồn tại.`);
      }
    }
    const handlerIds = dedupeIds(input.handlerIds);
    if (handlerIds && handlerIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: handlerIds }, isDeleted: false },
        select: { id: true },
      });
      assertUsersExist(
        handlerIds,
        users.map((u) => u.id),
        'Người thực hiện',
      );
    }
    const followerIds = dedupeIds(input.followerIds);
    if (followerIds && followerIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: followerIds }, isDeleted: false },
        select: { id: true },
      });
      assertUsersExist(
        followerIds,
        users.map((u) => u.id),
        'Người theo dõi',
      );
    }
    return { handlerIds, followerIds };
  }

  /** Người giao = user đang đăng nhập (tự gắn, không nhận từ client) */
  async create(dto: CreateWorkDto, assignerId: number) {
    const {
      categoryId,
      statusId,
      handlerIds,
      followerIds,
      siteId,
      incidentTypeId,
      startDate,
      endDate,
      completedAt,
      isRecurrence,
      recurrence,
      ...rest
    } = dto;
    const resolvedStatusId = await this.resolveStatusId(categoryId, statusId);
    const { handlerIds: uniqueHandlers, followerIds: uniqueFollowers } =
      await this.assertReferences({
        categoryId,
        siteId,
        incidentTypeId,
        handlerIds,
        followerIds,
      });
    assertWorkDates({ startDate, endDate, completedAt });
    // Work mẫu lặp: validate + tạo schedule riêng; work thường bỏ qua field recurrence
    let scheduleCreate:
      | Prisma.WorkRecurrenceScheduleUncheckedCreateWithoutTemplateInput
      | undefined;
    if (isRecurrence) {
      if (!recurrence) {
        throw new BadRequestException('Work mẫu lặp cần thông tin lặp (recurrence).');
      }
      scheduleCreate = await this.resolveRecurrenceSchedule(
        categoryId,
        recurrence,
        null,
        startDate,
      );
    }
    // Tạo work + mốc lịch sử đầu tiên trong CÙNG 1 transaction: không để lại
    // work mồ côi khi ghi lịch sử lỗi.
    const created = await this.prisma.$transaction(async (tx) => {
      const work = await tx.work.create({
        data: {
          ...rest,
          // Prisma 7 chỉ nhận ISO-8601 đầy đủ — DTO cho phép ngày rút gọn
          ...(startDate !== undefined ? { startDate: toDateTimeInput(startDate) } : {}),
          ...(endDate !== undefined ? { endDate: toDateTimeInput(endDate) } : {}),
          ...(completedAt !== undefined ? { completedAt: toDateTimeInput(completedAt) } : {}),
          category: { connect: { id: categoryId } },
          assigner: { connect: { id: assignerId } },
          ...(resolvedStatusId !== null
            ? { status: { connect: { id: resolvedStatusId } } }
            : {}),
          ...(uniqueHandlers
            ? { handlers: { create: uniqueHandlers.map((userId) => ({ userId })) } }
            : {}),
          ...(uniqueFollowers
            ? { followers: { connect: uniqueFollowers.map((id) => ({ id })) } }
            : {}),
          ...(siteId !== undefined ? { site: { connect: { id: siteId } } } : {}),
          ...(incidentTypeId !== undefined
            ? { incidentType: { connect: { id: incidentTypeId } } }
            : {}),
          ...(isRecurrence !== undefined ? { isRecurrence } : {}),
          ...(scheduleCreate ? { recurrenceSchedule: { create: scheduleCreate } } : {}),
        },
        include: workInclude,
      });
      // Mốc lịch sử đầu tiên: tạo work (from null)
      await this.recordStatusHistory(work.id, null, work.statusId, assignerId, undefined, tx);
      return work;
    });
    return this.toResponse(created);
  }

  // Chỉ người giao, người thực hiện (hoặc ADMIN) được sửa
  async update(id: number, dto: UpdateWorkDto, meId: number, isAdmin: boolean) {
    const work = await this.findOne(id, meId, isAdmin);
    assertCanEdit(this.roleOf(work, meId, isAdmin));
    const {
      categoryId,
      statusId,
      handlerIds,
      followerIds,
      siteId,
      incidentTypeId,
      startDate,
      endDate,
      completedAt,
      isRecurrence,
      recurrence,
      statusNote,
      ...rest
    } = dto;
    // Đổi loại → status cũ có thể không còn thuộc loại mới: yêu cầu chọn lại
    // (trừ khi client gửi statusId mới thì validate theo loại mới).
    const targetCategoryId = categoryId ?? work.categoryId;
    const { handlerIds: uniqueHandlers, followerIds: uniqueFollowers } =
      await this.assertReferences({
        ...(categoryId !== undefined ? { categoryId } : {}),
        siteId,
        incidentTypeId,
        handlerIds,
        followerIds,
      });
    // Ngày: dùng giá trị mới nếu có, nếu không thì giữ giá trị hiện tại
    const nextStart = startDate !== undefined ? startDate : work.startDate?.toISOString();
    const nextEnd = endDate !== undefined ? endDate : work.endDate?.toISOString();
    const nextCompleted =
      completedAt !== undefined ? completedAt : work.completedAt?.toISOString();
    assertWorkDates({ startDate: nextStart, endDate: nextEnd, completedAt: nextCompleted });
    let resolvedStatusId: number | null | undefined;
    if (statusId !== undefined || categoryId !== undefined) {
      resolvedStatusId = await this.resolveStatusId(targetCategoryId, statusId);
    }
    // Work con (đã sinh từ mẫu) không được biến thành mẫu
    if (isRecurrence && work.recurrenceId) {
      throw new BadRequestException('Work con đã sinh từ mẫu không thể làm mẫu lặp.');
    }
    const willBeTemplate = isRecurrence ?? work.isRecurrence;
    const currentSchedule = work.recurrenceSchedule as {
      frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      weekdays: number[];
      monthDays: number[];
      quarterlyMode: 'START_OF_QUARTER' | 'END_OF_QUARTER' | null;
      yearMonth: number | null;
      yearDay: number | null;
      startDate: Date | null;
      endType: 'NEVER' | 'ON_DATE';
      endDate: Date | null;
    } | null;
    // Bật mẫu mới mà chưa có schedule → bắt buộc gửi recurrence
    if (willBeTemplate && !currentSchedule && !recurrence) {
      throw new BadRequestException('Work mẫu lặp cần thông tin lặp (recurrence).');
    }
    // Schedule: tạo mới / cập nhật từng phần / xoá khi tắt cờ mẫu.
    // Chỉ reset nextRunAt khi đổi rule thời gian (không reset khi chỉ bật/tắt).
    const ruleTimeChanged =
      !!recurrence &&
      (recurrence.frequency !== undefined ||
        recurrence.weekdays !== undefined ||
        recurrence.monthDays !== undefined ||
        recurrence.quarterlyMode !== undefined ||
        recurrence.yearMonth !== undefined ||
        recurrence.yearDay !== undefined ||
        recurrence.startDate !== undefined ||
        recurrence.endType !== undefined ||
        recurrence.endDate !== undefined);
    let scheduleOp: Prisma.WorkUpdateInput['recurrenceSchedule'];
    if (willBeTemplate && recurrence) {
      const scheduleData = await this.resolveRecurrenceSchedule(
        targetCategoryId,
        recurrence,
        currentSchedule,
        startDate ?? work.startDate?.toString(),
      );
      if (ruleTimeChanged) scheduleData.nextRunAt = null;
      scheduleOp = currentSchedule
        ? { update: scheduleData }
        : { create: scheduleData };
    } else if (willBeTemplate && categoryId !== undefined && currentSchedule) {
      // Đổi loại của mẫu → validate lại schedule theo loại mới
      const scheduleData = await this.resolveRecurrenceSchedule(
        targetCategoryId,
        {},
        currentSchedule,
        startDate ?? work.startDate?.toString(),
      );
      scheduleData.nextRunAt = null;
      scheduleOp = { update: scheduleData };
    } else if (isRecurrence === false && work.isRecurrence && currentSchedule) {
      // Tắt cờ mẫu → xoá schedule riêng (work con đã sinh giữ nguyên)
      scheduleOp = { delete: true };
    }
    // Hiệu ứng trạng thái: hoàn thành → progress 100 + completedAt; mở lại →
    // xoá completedAt; trạng thái kết thúc chỉ ADMIN mới đổi được.
    const statusWillChange =
      resolvedStatusId !== undefined && resolvedStatusId !== work.statusId;
    let statusEffects: {
      progress: number | null;
      completedAt: string | null;
    } | null = null;
    // Chạy rule khi đổi trạng thái HOẶC khi client tự gửi tiến độ / thời điểm
    // hoàn thành (để chặn dữ liệu mâu thuẫn với trạng thái hiện tại).
    if (
      statusWillChange ||
      dto.progress !== undefined ||
      completedAt !== undefined
    ) {
      const targetStatus =
        resolvedStatusId !== undefined && resolvedStatusId !== null
          ? await this.loadStatusSnapshot(resolvedStatusId)
          : work.statusId
            ? await this.loadStatusSnapshot(work.statusId)
            : null;
      statusEffects = resolveStatusChange({
        // Khi không đổi trạng thái thì current = target: rule chỉ kiểm tra
        // tiến độ/hoàn thành có khớp với trạng thái đang có hay không.
        current: statusWillChange ? (work.status as StatusSnapshot | null) : targetStatus,
        target: targetStatus,
        ...(dto.progress !== undefined ? { progress: dto.progress } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        isAdmin,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.work.update({
      where: { id },
      data: {
        ...rest,
        ...(statusEffects?.progress !== null && statusEffects?.progress !== undefined
          ? { progress: statusEffects.progress }
          : {}),
        ...(statusEffects
          ? { completedAt: statusEffects.completedAt }
          : completedAt !== undefined
            ? { completedAt: toDateTimeInput(completedAt) ?? null }
            : {}),
        ...(startDate !== undefined ? { startDate: toDateTimeInput(startDate) } : {}),
        ...(endDate !== undefined ? { endDate: toDateTimeInput(endDate) } : {}),
        ...(completedAt !== undefined ? { completedAt: toDateTimeInput(completedAt) } : {}),
        ...(categoryId !== undefined ? { category: { connect: { id: categoryId } } } : {}),
        ...(resolvedStatusId !== undefined
          ? resolvedStatusId !== null
            ? { status: { connect: { id: resolvedStatusId } } }
            : { status: { disconnect: true } }
          : {}),
        // Gán lại toàn bộ danh sách người thực hiện (chuẩn cho assign list)
        ...(uniqueHandlers
          ? {
              handlers: {
                deleteMany: {},
                create: uniqueHandlers.map((userId) => ({ userId })),
              },
            }
          : {}),
        ...(uniqueFollowers
          ? { followers: { set: uniqueFollowers.map((fid) => ({ id: fid })) } }
          : {}),
        ...(siteId !== undefined ? { site: { connect: { id: siteId } } } : {}),
        ...(isRecurrence !== undefined ? { isRecurrence } : {}),
        ...(scheduleOp ? { recurrenceSchedule: scheduleOp } : {}),
        ...(incidentTypeId !== undefined
          ? { incidentType: { connect: { id: incidentTypeId } } }
          : {}),
      },
      include: workInclude,
      });
      // Đổi trạng thái (kể cả đổi loại kéo theo reset status) → ghi mốc lịch sử
      // kèm ghi chú chuyển trạng thái. Ghi trong cùng transaction với work.
      if (statusWillChange) {
        await this.recordStatusHistory(
          id,
          work.statusId,
          resolvedStatusId as number | null,
          meId,
          statusNote,
          tx,
        );
      }
      return result;
    });
    return this.toResponse(updated);
  }

  /** Đọc status dạng snapshot (id/code/isClosed) cho rule đổi trạng thái. */
  private async loadStatusSnapshot(statusId: number): Promise<StatusSnapshot> {
    const status = await this.prisma.workflowStatus.findFirst({
      where: { id: statusId, isDeleted: false },
      select: { id: true, code: true, isClosed: true },
    });
    if (!status) throw new BadRequestException(`Trạng thái #${statusId} không tồn tại.`);
    return status;
  }

  async remove(id: number, meId: number, isAdmin: boolean) {
    const work = await this.findOne(id, meId, isAdmin);
    assertCanDelete(this.roleOf(work, meId, isAdmin));
    return this.prisma.$transaction(async (tx) => {
      // Xoá mẫu lặp → tắt lịch, nếu không cron vẫn sinh việc con cho mẫu đã xoá.
      if (work.isRecurrence && work.recurrenceSchedule) {
        await tx.workRecurrenceSchedule.updateMany({
          where: { id: work.recurrenceSchedule.id },
          data: { isActive: false },
        });
      }
      return tx.work.update({ where: { id }, data: { isDeleted: true } });
    });
  }

  // Mở lại công việc đã xoá mềm (ADMIN hoặc người trong cuộc).
  // findOne chặn bản đã xoá nên đọc trực tiếp + check quyền như remove.
  async restore(id: number, meId: number, isAdmin: boolean) {
    const work = await this.prisma.work.findUnique({
      where: { id },
      include: { handlers: { select: { userId: true } } },
    });
    if (!work) throw new NotFoundException(`Work #${id} không tồn tại.`);
    const involved =
      work.assignerId === meId || work.handlers.some((h) => h.userId === meId);
    if (!involved && !isAdmin) {
      throw new ForbiddenException(
        'Chỉ người giao, người thực hiện hoặc ADMIN được khôi phục.',
      );
    }
    // Trong lúc work bị xoá, status/loại có thể đã bị xoá mềm theo: khôi phục
    // về status mặc định của loại để không tạo dữ liệu mồ côi.
    const statusStillValid = work.statusId
      ? await this.prisma.workflowStatus.findFirst({
          where: { id: work.statusId, isDeleted: false },
          select: { id: true },
        })
      : null;
    const categoryStillValid = await this.prisma.workflowCategory.findFirst({
      where: { id: work.categoryId, isDeleted: false },
      select: { id: true, supportsRecurrence: true },
    });
    if (!categoryStillValid) {
      throw new BadRequestException(
        'Loại việc của công việc này đã bị xoá, không thể khôi phục.',
      );
    }
    if (work.statusId && !statusStillValid) {
      const fallback = await this.prisma.workflowStatus.findFirst({
        where: { categoryId: work.categoryId, isDeleted: false, isDefault: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      return this.prisma.work.update({
        where: { id },
        data: { isDeleted: false, statusId: fallback?.id ?? null },
      });
    }
    return this.prisma.work.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
