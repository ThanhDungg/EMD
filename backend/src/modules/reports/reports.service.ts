import { Injectable } from '@nestjs/common';
import { userSiteIds } from '../../common/access.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REPORT_PRESET_GROUPS } from './report-presets.js';
import {
  REPORT_CHARTS,
  REPORT_DATASET_DEFS,
} from './reports.constants.js';
import type { DrillReportDto, QueryReportDto } from './dto/query-report.dto.js';

const METER_TYPE_LABELS: Record<string, string> = {
  ELECTRICITY: 'Điện',
  WATER: 'Nước',
  DO_OIL: 'Dầu DO',
};

const PHASE_LABELS: Record<string, string> = {
  NORMAL: 'Bình thường',
  PEAK: 'Cao điểm',
  OFF_PEAK: 'Thấp điểm',
};

// Cột hiển thị của danh sách drill cho từng dataset (khớp key trả về từ
// drillRows). FE tự map key → tiêu đề tiếng Việt.
const DRILL_COLUMNS: Record<string, { key: string; label: string }[]> = {
  works: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Tiêu đề việc' },
    { key: 'category', label: 'Loại việc' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'site', label: 'Dự án' },
    { key: 'assigner', label: 'Người giao' },
    { key: 'handler', label: 'Người thực hiện' },
    { key: 'priority', label: 'Ưu tiên' },
    { key: 'progress', label: 'Tiến độ (%)' },
  ],
  incidents: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Tiêu đề sự cố' },
    { key: 'damageType', label: 'Loại hư hỏng' },
    { key: 'repairType', label: 'Loại sửa chữa' },
    { key: 'picUnit', label: 'Đơn vị phụ trách' },
    { key: 'site', label: 'Dự án' },
    { key: 'status', label: 'Trạng thái' },
  ],
  energy: [
    { key: 'id', label: 'ID' },
    { key: 'meterCode', label: 'Mã đồng hồ' },
    { key: 'meterType', label: 'Loại đồng hồ' },
    { key: 'phase', label: 'Pha' },
    { key: 'site', label: 'Dự án' },
    { key: 'startIndex', label: 'Chỉ số đầu' },
    { key: 'endIndex', label: 'Chỉ số cuối' },
    { key: 'total', label: 'Tiêu thụ' },
  ],
  assets: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Mã tài sản' },
    { key: 'name', label: 'Tên tài sản' },
    { key: 'category', label: 'Danh mục' },
    { key: 'condition', label: 'Tình trạng' },
    { key: 'usageStatus', label: 'Trạng thái dùng' },
    { key: 'site', label: 'Dự án' },
    { key: 'quantity', label: 'Số lượng' },
    { key: 'unit', label: 'Đơn vị' },
    { key: 'warrantyEnd', label: 'Bảo hành đến' },
  ],
  checklist: [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Tiêu chí' },
    { key: 'result', label: 'Kết quả' },
    { key: 'category', label: 'Loại việc' },
    { key: 'site', label: 'Dự án' },
    { key: 'standard', label: 'Tiêu chuẩn' },
  ],
  contracts: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Mã hợp đồng' },
    { key: 'companyName', label: 'Công ty' },
    { key: 'contractType', label: 'Loại' },
    { key: 'serviceType', label: 'Loại dịch vụ' },
    { key: 'site', label: 'Dự án' },
    { key: 'startDate', label: 'Bắt đầu' },
    { key: 'endDate', label: 'Kết thúc' },
    { key: 'termType', label: 'Thời hạn' },
  ],
  personnel: [
    { key: 'id', label: 'ID' },
    { key: 'accountName', label: 'Tài khoản' },
    { key: 'fullName', label: 'Họ tên' },
    { key: 'department', label: 'Đơn vị' },
    { key: 'position', label: 'Chức vụ' },
    { key: 'level', label: 'Cấp bậc' },
    { key: 'status', label: 'Tình trạng' },
    { key: 'role', label: 'Vai trò' },
  ],
  sites: [
    { key: 'id', label: 'ID' },
    { key: 'code', label: 'Mã dự án' },
    { key: 'name', label: 'Tên dự án' },
    { key: 'investor', label: 'Chủ đầu tư' },
    { key: 'serviceType', label: 'Loại dịch vụ' },
    { key: 'province', label: 'Tỉnh thành' },
    { key: 'manager', label: 'Quản lý' },
    { key: 'glaArea', label: 'Diện tích GLA (m²)' },
    { key: 'occupancyRate', label: 'Lấp đầy (%)' },
  ],
};

interface Access {
  meId: number;
  isAdmin: boolean;
  handledOnly: boolean;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function quarterKey(d: Date): string {
  return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
}

function inRange(d: Date | null | undefined, from?: string, to?: string): boolean {
  if (!d) return true; // việc thiếu ngày thì giữ lại (khớp filter works)
  const t = d.getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to + 'T23:59:59.999Z').getTime()) return false;
  return true;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  datasets() {
    return { datasets: REPORT_DATASET_DEFS, charts: REPORT_CHARTS };
  }

  private async scopeSiteIds(access: Access): Promise<number[] | null> {
    if (access.isAdmin) return null;
    return userSiteIds(this.prisma, access.meId);
  }

  // ---- Query engine linh hoạt kiểu Power BI ----
  // Lấy tối đa `limit` dòng thô (đã lọc quyền + filters) rồi group-by trong
  // memory — đơn giản, đúng quyền, đủ nhanh với ~1000 việc/ngày.
  async query(dto: QueryReportDto, access: Access) {
    const dimensions = (dto.dimensions ?? []).slice(0, 2);
    // 6 chỉ số: đủ cho dải KPI của 1 báo cáo (thường 5 thẻ số) vẫn gọi 1 lần.
    const metrics = (dto.metrics ?? []).slice(0, 6);
    const limit = Math.min(Math.max(dto.limit ?? 5000, 1), 5000);
    switch (dto.dataset) {
      case 'works':
        return this.queryWorks(dimensions, metrics, dto, access, limit);
      case 'incidents':
        return this.queryIncidents(dimensions, metrics, dto, access, limit);
      case 'energy':
        return this.queryEnergy(dimensions, metrics, dto, access, limit);
      case 'assets':
        return this.queryAssets(dimensions, metrics, dto, access, limit);
      case 'checklist':
        return this.queryChecklist(dimensions, metrics, dto, access, limit);
      case 'contracts':
        return this.queryContracts(dimensions, metrics, dto, access, limit);
      case 'personnel':
        return this.queryPersonnel(dimensions, metrics, dto, limit);
      case 'sites':
        return this.querySites(dimensions, metrics, dto, access, limit);
      default:
        return { rows: [], total: 0, dimensions, metrics };
    }
  }

  private baseWorkWhere(
    dto: QueryReportDto,
    scopeIds: number[] | null,
    access: Access,
  ) {
    const f = dto.filters ?? {};
    const and: Record<string, unknown>[] = [{ isDeleted: false }];
    if (!access.isAdmin) {
      if (access.handledOnly) {
        and.push({ handlers: { some: { userId: access.meId } } });
      } else {
        const or: Record<string, unknown>[] = [
          { assignerId: access.meId },
          { handlers: { some: { userId: access.meId } } },
          { followers: { some: { id: access.meId } } },
        ];
        if (scopeIds && scopeIds.length > 0) or.push({ siteId: { in: scopeIds } });
        and.push({ OR: or });
      }
    } else if (scopeIds === null && f.siteIds?.length) {
      and.push({ siteId: { in: f.siteIds } });
    }
    // User thường (non-admin) vẫn được lọc siteIds nhưng ép trong phạm vi
    if (!access.isAdmin && f.siteIds?.length && scopeIds) {
      and.push({ siteId: { in: f.siteIds.filter((id) => scopeIds.includes(id)) } });
    }
    if (f.categoryIds?.length) and.push({ categoryId: { in: f.categoryIds } });
    if (f.categoryCodes?.length) and.push({ category: { code: { in: f.categoryCodes } } });
    if (f.statusIds?.length) and.push({ statusId: { in: f.statusIds } });
    if (f.priorities?.length) and.push({ priority: { in: f.priorities } });
    if (f.userIds?.length) {
      and.push({
        OR: [
          { assignerId: { in: f.userIds } },
          { handlers: { some: { userId: { in: f.userIds } } } },
        ],
      });
    }
    return { AND: and };
  }

  private dimValue(
    dim: string,
    w: {
      category?: { vnName: string } | null;
      status?: { name: string } | null;
      priority: string;
      site?: { name: string } | null;
      siteId: number | null;
      assigner?: { fullName: string | null; accountName: string } | null;
      createdAt: Date;
      handlers?: { user: { fullName: string | null; accountName: string } }[];
    },
    _granularity?: string,
  ): string {
    switch (dim) {
      case 'category':
        return w.category?.vnName ?? '(Chưa phân loại)';
      case 'status':
        return w.status?.name ?? '(Chưa có trạng thái)';
      case 'priority':
        return w.priority === 'HIGH' ? 'Cao' : w.priority === 'LOW' ? 'Thấp' : 'Trung bình';
      case 'site':
        return w.site?.name ?? '(Không dự án)';
      case 'assigner':
        return w.assigner?.fullName?.trim() || w.assigner?.accountName || '(Ẩn)';
      case 'handler':
        return (
          w.handlers?.[0]?.user.fullName?.trim() ||
          w.handlers?.[0]?.user.accountName ||
          '(Chưa gán)'
        );
      case 'month':
        return monthKey(new Date(w.createdAt));
      case 'quarter':
        return quarterKey(new Date(w.createdAt));
      case 'week':
        return monthKey(new Date(w.createdAt));
      default:
        return '(Khác)';
    }
  }

  private async queryWorks(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    const scopeIds = await this.scopeSiteIds(access);
    const f = dto.filters ?? {};
    const rows = await this.prisma.work.findMany({
      where: this.baseWorkWhere(dto, scopeIds, access) as never,
      include: {
        category: true,
        status: true,
        site: true,
        assigner: { select: { fullName: true, accountName: true } },
        handlers: { include: { user: { select: { fullName: true, accountName: true } } } },
      },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filtered = rows.filter((w) => inRange(w.createdAt, f.from, f.to));
    const groups = new Map<string, typeof filtered>();
    const keyOf = (w: (typeof filtered)[number]) =>
      dimensions.map((d) => this.dimValue(d, w, dto.granularity)).join(' ‖ ') || '(Tất cả)';
    for (const w of filtered) {
      const k = keyOf(w);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(w);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const count = items.length;
      const completed = items.filter((w) => w.status?.isClosed).length;
      const open = count - completed;
      const overdue = items.filter(
        (w) => w.endDate && new Date(w.endDate) < today && !w.status?.isClosed,
      ).length;
      const avgProgress =
        count === 0 ? 0 : Math.round((items.reduce((s, w) => s + w.progress, 0) / count) * 10) / 10;
      const all: Record<string, number> = {
        count,
        completed,
        open,
        overdue,
        completionRate: count === 0 ? 0 : Math.round((completed / count) * 1000) / 10,
        avgProgress,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = count;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: filtered.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }

  private async queryIncidents(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    const scopeIds = await this.scopeSiteIds(access);
    const f = dto.filters ?? {};
    const incidentCat = await this.prisma.workflowCategory.findFirst({
      where: { code: 'INCIDENT', isDeleted: false },
      select: { id: true },
    });
    const rows = await this.prisma.work.findMany({
      where: {
        ...(this.baseWorkWhere(dto, scopeIds, access) as object),
        ...(incidentCat && !f.categoryIds?.length ? { categoryId: incidentCat.id } : {}),
      } as never,
      include: {
        status: true,
        site: true,
        createdAt: undefined,
        incidentDetail: {
          include: {
            damageTypeRef: true,
            repairTypeRef: true,
            picUnitRef: true,
          },
        },
      } as never,
      orderBy: { id: 'desc' },
      take: limit,
    });
    const filtered = (rows as unknown as Record<string, never>[]).filter((w) =>
      inRange((w as unknown as { createdAt: Date }).createdAt, f.from, f.to),
    );
    const dimOf = (w: Record<string, never>): string[] =>
      dimensions.map((d) => {
        const work = w as unknown as {
          site?: { name: string } | null;
          status?: { name: string } | null;
          createdAt: Date;
          incidentDetail?: {
            damageType?: string | null;
            damageTypeRef?: { name: string } | null;
            repairType?: string | null;
            repairTypeRef?: { name: string } | null;
            picUnit?: string | null;
            picUnitRef?: { name: string } | null;
          } | null;
        };
        switch (d) {
          case 'damageType':
            return work.incidentDetail?.damageTypeRef?.name ?? work.incidentDetail?.damageType ?? '(Chưa phân loại)';
          case 'repairType':
            return work.incidentDetail?.repairTypeRef?.name ?? work.incidentDetail?.repairType ?? '(Chưa phân loại)';
          case 'picUnit':
            return work.incidentDetail?.picUnitRef?.name ?? work.incidentDetail?.picUnit ?? '(Chưa gán)';
          case 'site':
            return work.site?.name ?? '(Không dự án)';
          case 'status':
            return work.status?.name ?? '(Chưa có trạng thái)';
          case 'month':
            return monthKey(new Date(work.createdAt));
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, Record<string, never>[]>();
    for (const w of filtered) {
      const k = dimOf(w).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(w);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const count = items.length;
      const reopenSum = items.reduce((s, w) => {
        const d = (w as unknown as { incidentDetail?: { reopenCount?: number } }).incidentDetail;
        return s + (d?.reopenCount ?? 0);
      }, 0);
      const withSolution = items.filter((w) => {
        const d = (w as unknown as { incidentDetail?: { solution?: string } }).incidentDetail;
        return !!d?.solution?.trim();
      }).length;
      const all: Record<string, number> = {
        count,
        reopenSum,
        avgReopen: count === 0 ? 0 : Math.round((reopenSum / count) * 100) / 100,
        withSolution,
        solutionRate: count === 0 ? 0 : Math.round((withSolution / count) * 1000) / 10,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = count;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: filtered.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }

  private async queryEnergy(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    const scopeIds = await this.scopeSiteIds(access);
    const f = dto.filters ?? {};
    const readings = await this.prisma.energyReading.findMany({
      where: {
        isDeleted: false,
        ...(f.meterTypes?.length
          ? { meter: { meterType: { in: f.meterTypes as never[] } } }
          : {}),
        ...(f.phases?.length ? { phase: { in: f.phases as never[] } } : {}),
      },
      include: {
        meter: {
          include: {
            check: { include: { work: { include: { site: true } } } },
          },
        },
      },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const meterLabel: Record<string, string> = {
      ELECTRICITY: 'Điện',
      WATER: 'Nước',
      DO_OIL: 'Dầu DO',
    };
    const phaseLabel: Record<string, string> = {
      NORMAL: 'Bình thường',
      PEAK: 'Cao điểm',
      OFF_PEAK: 'Thấp điểm',
    };
    const filtered = readings.filter((r) => {
      const work = r.meter.check.work;
      if (!work || work.isDeleted) return false;
      if (!access.isAdmin) {
        if (access.handledOnly) return false; // năng lượng gắn work — kỹ thuật xem qua work scope; giữ đơn giản: admin/HO/QLDA
        if (scopeIds && work.siteId !== null && !scopeIds.includes(work.siteId)) return false;
      }
      if (f.siteIds?.length && work.siteId !== null && !f.siteIds.includes(work.siteId)) return false;
      const t = r.createdAt;
      if (!inRange(t, f.from, f.to)) return false;
      return true;
    });
    const dimOf = (r: (typeof filtered)[number]) =>
      dimensions.map((d) => {
        switch (d) {
          case 'meterType':
            return meterLabel[r.meter.meterType] ?? r.meter.meterType;
          case 'phase':
            return phaseLabel[r.phase] ?? r.phase;
          case 'meterCode':
            return r.meter.meterCode;
          case 'site':
            return r.meter.check.work?.site?.name ?? '(Không dự án)';
          case 'month':
            return monthKey(new Date(r.createdAt));
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, typeof filtered>();
    for (const r of filtered) {
      const k = dimOf(r).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const totalConsumption = items.reduce((s, r) => s + Number(r.total), 0);
      const meterCount = new Set(items.map((r) => r.meter.meterCode)).size;
      const all: Record<string, number> = {
        totalConsumption: Math.round(totalConsumption * 100) / 100,
        readingCount: items.length,
        meterCount,
        avgConsumption:
          items.length === 0 ? 0 : Math.round((totalConsumption / items.length) * 100) / 100,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.totalConsumption = all.totalConsumption;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'totalConsumption'] ?? 0) - Number(a[metrics[0] ?? 'totalConsumption'] ?? 0));
    return {
      rows: out,
      total: filtered.length,
      dimensions,
      metrics: metrics.length ? metrics : ['totalConsumption'],
    };
  }

  private async queryAssets(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    void access;
    const f = dto.filters ?? {};
    const rows = await this.prisma.asset.findMany({
      where: {
        isDeleted: false,
        ...(f.siteIds?.length
          ? { location: { siteId: { in: f.siteIds } } }
          : {}),
      },
      include: { category: true, condition: true, usageStatus: true, location: { include: { site: true } } },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const dimOf = (a: (typeof rows)[number]) =>
      dimensions.map((d) => {
        switch (d) {
          case 'category':
            return a.category?.name ?? '(Chưa phân loại)';
          case 'condition':
            return a.condition?.name ?? '(Chưa đánh giá)';
          case 'usageStatus':
            return a.usageStatus?.name ?? '(Chưa rõ)';
          case 'site':
            return a.location?.site?.name ?? '(Chưa gán vị trí)';
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, typeof rows>();
    for (const a of rows) {
      const k = dimOf(a).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(a);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const quantitySum = items.reduce((s, a) => s + Number(a.quantity ?? 1), 0);
      const all: Record<string, number> = {
        count: items.length,
        quantitySum: Math.round(quantitySum * 100) / 100,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = items.length;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: rows.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }

  private async queryChecklist(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    const scopeIds = await this.scopeSiteIds(access);
    const f = dto.filters ?? {};
    const rows = await this.prisma.checklistItem.findMany({
      where: {
        isDeleted: false,
        parentId: { not: null }, // chỉ dòng con có đánh giá
      },
      include: { work: { include: { site: true, category: true } } },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const filtered = rows.filter((c) => {
      const w = c.work;
      if (w && !access.isAdmin) {
        if (w.siteId !== null && scopeIds && !scopeIds.includes(w.siteId)) return false;
        if (f.siteIds?.length && w.siteId !== null && !f.siteIds.includes(w.siteId)) return false;
      } else if (w && f.siteIds?.length && w.siteId !== null && !f.siteIds.includes(w.siteId)) {
        return false;
      }
      if (!inRange(c.createdAt, f.from, f.to)) return false;
      return true;
    });
    const dimOf = (c: (typeof filtered)[number]) =>
      dimensions.map((d) => {
        switch (d) {
          case 'result':
            return c.result === 'PASS' ? 'Đạt' : c.result === 'FAIL' ? 'Không đạt' : '(Chưa đánh giá)';
          case 'site':
            return c.work?.site?.name ?? '(Không dự án)';
          case 'category':
            return c.work?.category?.vnName ?? '(Việc độc lập)';
          case 'month':
            return monthKey(new Date(c.createdAt));
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const k = dimOf(c).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const pass = items.filter((c) => c.result === 'PASS').length;
      const fail = items.filter((c) => c.result === 'FAIL').length;
      const all: Record<string, number> = {
        count: items.length,
        pass,
        fail,
        passRate: items.length === 0 ? 0 : Math.round((pass / items.length) * 1000) / 10,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = items.length;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: filtered.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }

  // ---- HỢP ĐỒNG (báo cáo hoạt động) ----
  private async queryContracts(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    void access; // Hợp đồng là master data, mọi vai trò đều xem được phạm vi site.
    const f = dto.filters ?? {};
    const rows = await this.prisma.contract.findMany({
      where: {
        isDeleted: false,
        ...(f.contractTypes?.length
          ? { contractType: { in: f.contractTypes as never[] } }
          : {}),
        ...(f.siteIds?.length ? { siteLinks: { some: { siteId: { in: f.siteIds } } } } : {}),
      },
      include: {
        serviceType: true,
        siteLinks: { include: { site: true } },
      },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const now = Date.now();
    const filtered = rows.filter((c) =>
      f.from || f.to ? inRange(c.startDate, f.from, f.to) : true,
    );
    const expiryOf = (c: (typeof filtered)[number]): string => {
      if (c.termType === 'OPEN_ENDED' || !c.endDate) return 'Không xác định';
      const days = Math.ceil((new Date(c.endDate).getTime() - now) / 86_400_000);
      if (days < 0) return 'Đã hết hạn';
      if (days <= 30) return 'Còn ≤ 30 ngày';
      if (days <= 90) return 'Còn 31–90 ngày';
      if (days <= 180) return 'Còn 91–180 ngày';
      return 'Trên 180 ngày';
    };
    const dimOf = (c: (typeof filtered)[number]) =>
      dimensions.map((d) => {
        switch (d) {
          case 'contractType':
            return c.contractType === 'INPUT' ? 'Đầu vào' : 'Đầu ra';
          case 'serviceType':
            return c.serviceType?.name ?? '(Chưa phân loại)';
          case 'termType':
            return c.termType === 'TERM' ? 'Có thời hạn' : 'Không thời hạn';
          case 'site':
            return c.siteLinks.map((l) => l.site?.name).filter(Boolean).join(' + ') || '(Chưa gán dự án)';
          case 'company':
            return c.companyName;
          case 'month':
            return c.startDate ? monthKey(new Date(c.startDate)) : '(Chưa có ngày)';
          case 'expiry':
            return expiryOf(c);
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, typeof filtered>();
    for (const c of filtered) {
      const k = dimOf(c).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(c);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const withDates = items.filter((c) => c.startDate && c.endDate);
      const durations = withDates.map(
        (c) =>
          Math.round(
            (new Date(c.endDate as Date).getTime() - new Date(c.startDate as Date).getTime()) /
              86_400_000,
          ),
      );
      const expiring90 = items.filter((c) => {
        if (!c.endDate || c.termType === 'OPEN_ENDED') return false;
        const days = (new Date(c.endDate).getTime() - now) / 86_400_000;
        return days >= 0 && days <= 90;
      }).length;
      const expired = items.filter((c) => {
        if (!c.endDate || c.termType === 'OPEN_ENDED') return false;
        return new Date(c.endDate).getTime() < now;
      }).length;
      const all: Record<string, number> = {
        count: items.length,
        expiring90,
        expired,
        openEndless: items.filter((c) => !c.endDate || c.termType === 'OPEN_ENDED').length,
        avgDurationDays:
          durations.length === 0
            ? 0
            : Math.round((durations.reduce((s, v) => s + v, 0) / durations.length) * 10) / 10,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = items.length;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: filtered.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }

  // ---- NHÂN SỰ ----
  private async queryPersonnel(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    limit: number,
  ) {
    void dto;
    const rows = await this.prisma.user.findMany({
      where: { isDeleted: false },
      include: {
        department: true,
        position: true,
        userLevel: true,
        status: true,
        managedSites: { select: { id: true } },
      },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const dimOf = (u: (typeof rows)[number]) =>
      dimensions.map((d) => {
        switch (d) {
          case 'department':
            return u.department?.name ?? '(Chưa phân bộ)';
          case 'position':
            return u.position?.name ?? '(Chưa chức vụ)';
          case 'level':
            return u.userLevel?.name ?? '(Chưa xếp bậc)';
          case 'status':
            return u.status?.name ?? '(Chưa rõ)';
          case 'gender':
            return u.gender === 'MALE' ? 'Nam' : u.gender === 'FEMALE' ? 'Nữ' : 'Khác';
          case 'role':
            return u.isInvestor ? 'Chủ đầu tư' : 'Nhân viên';
          case 'hireYear':
            return u.hireDate ? String(new Date(u.hireDate).getFullYear()) : '(Chưa nhập)';
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, typeof rows>();
    for (const u of rows) {
      const k = dimOf(u).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(u);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const all: Record<string, number> = {
        count: items.length,
        investorAccount: items.filter((u) => u.isInvestor).length,
        managingSites: items.filter((u) => u.managedSites.length > 0).length,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = items.length;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: rows.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }

  // ---- DỰ ÁN (site) ----
  private async querySites(
    dimensions: string[],
    metrics: string[],
    dto: QueryReportDto,
    access: Access,
    limit: number,
  ) {
    const scopeIds = await this.scopeSiteIds(access);
    const f = dto.filters ?? {};
    const rows = await this.prisma.site.findMany({
      where: {
        isDeleted: false,
        ...(f.siteIds?.length ? { id: { in: f.siteIds } } : {}),
        // Người không xem toàn bộ chỉ thấy dự án mình quản lý / thành viên.
        ...(scopeIds && !access.isAdmin ? { id: { in: scopeIds } } : {}),
      },
      include: { investor: true, serviceType: true, service: true, province: true },
      orderBy: { id: 'desc' },
      take: limit,
    });
    const dimOf = (s: (typeof rows)[number]) =>
      dimensions.map((d) => {
        switch (d) {
          case 'site':
            return s.name;
          case 'investor':
            return s.investor?.name ?? '(Chưa gán chủ đầu tư)';
          case 'serviceType':
            return s.serviceType?.name ?? '(Chưa phân loại)';
          case 'service':
            return s.service?.name ?? '(Chưa phân loại)';
          case 'province':
            return s.province?.name ?? '(Chưa nhập)';
          case 'operationStatus':
            return s.operationStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng';
          case 'rentalStatus':
            return s.rentalStatus === 'RENTED'
              ? 'Đang cho thuê'
              : s.rentalStatus === 'VACANT'
                ? 'Trống'
                : 'Đang chuẩn bị';
          case 'managementStatus':
            return s.managementStatus === 'MANAGED'
              ? 'Đang quản lý'
              : s.managementStatus === 'NOT_MANAGED'
                ? 'Chưa quản lý'
                : 'Tạm dừng';
          default:
            return '(Khác)';
        }
      });
    const groups = new Map<string, typeof rows>();
    for (const s of rows) {
      const k = dimOf(s).join(' ‖ ') || '(Tất cả)';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(s);
    }
    const out = [...groups.entries()].map(([key, items]) => {
      const parts = key.split(' ‖ ');
      const row: Record<string, string | number> = {};
      dimensions.forEach((d, i) => {
        row[d] = parts[i] ?? key;
      });
      const sum = (pick: (s: (typeof items)[number]) => number | null) =>
        Math.round(items.reduce((s, x) => s + (pick(x) ?? 0), 0) * 100) / 100;
      const occ = items.filter((s) => s.occupancyRate != null);
      const all: Record<string, number> = {
        count: items.length,
        glaAreaSum: sum((s) => (s.glaArea == null ? null : Number(s.glaArea))),
        leasedAreaSum: sum((s) => (s.leasedArea == null ? null : Number(s.leasedArea))),
        avgLandArea:
          items.length === 0
            ? 0
            : Math.round(
                (items.reduce((s, x) => s + Number(x.landArea ?? 0), 0) / items.length) * 100,
              ) / 100,
        avgOccupancy:
          occ.length === 0
            ? 0
            : Math.round(
                (occ.reduce((s, x) => s + Number(x.occupancyRate ?? 0), 0) / occ.length) * 100,
              ) / 100,
      };
      for (const m of metrics) row[m] = all[m] ?? 0;
      if (metrics.length === 0) row.count = items.length;
      return row;
    });
    out.sort((a, b) => Number(b[metrics[0] ?? 'count'] ?? 0) - Number(a[metrics[0] ?? 'count'] ?? 0));
    return { rows: out, total: rows.length, dimensions, metrics: metrics.length ? metrics : ['count'] };
  }
  async overview(filters: { from?: string; to?: string; siteId?: number }, access: Access) {
    const siteIds = filters.siteId !== undefined ? [filters.siteId] : undefined;
    const baseDto = (dataset: QueryReportDto['dataset']): QueryReportDto => ({
      dataset,
      dimensions: [],
      metrics: [],
      filters: { from: filters.from, to: filters.to, siteIds },
    });
    const [
      totals,
      byStatus,
      byCategory,
      byMonth,
      incidents,
      energyTrend,
      energyByType,
      assetsByCond,
      quality,
    ] = await Promise.all([
      this.query(
        { ...baseDto('works'), metrics: ['count', 'open', 'overdue', 'completed'] },
        access,
      ),
      this.query({ ...baseDto('works'), dimensions: ['status'], metrics: ['count'] }, access),
        this.query({ ...baseDto('works'), dimensions: ['category'], metrics: ['count', 'completionRate'] }, access),
        this.query({ ...baseDto('works'), dimensions: ['month'], metrics: ['count', 'completed', 'overdue'] }, access),
        this.query(
          { ...baseDto('incidents'), dimensions: ['damageType'], metrics: ['count', 'solutionRate'] },
          access,
        ),
        this.query(
          { ...baseDto('energy'), dimensions: ['month'], metrics: ['totalConsumption'] },
          access,
        ),
        this.query(
          { ...baseDto('energy'), dimensions: ['meterType'], metrics: ['totalConsumption', 'meterCount'] },
          access,
        ),
        this.query({ ...baseDto('assets'), dimensions: ['condition'], metrics: ['count'] }, access),
        this.query({ ...baseDto('checklist'), dimensions: ['result'], metrics: ['count'] }, access),
      ]);
    const totalRow = totals.rows[0] ?? {};
    const totalEnergy = energyTrend.rows.reduce((s, r) => s + Number(r.totalConsumption ?? 0), 0);
    const totalIncidents = incidents.rows.reduce((s, r) => s + Number(r.count ?? 0), 0);
    // Tỉ lệ đạt chỉ tính dòng đã đánh giá (Đạt / Không đạt), bỏ qua "chưa đánh giá".
    const pass = Number(quality.rows.find((r) => r.result === 'Đạt')?.count ?? 0);
    const fail = Number(quality.rows.find((r) => r.result === 'Không đạt')?.count ?? 0);
    const evaluated = pass + fail;
    return {
      kpis: {
        totalWorks: Number(totalRow.count ?? 0),
        openWorks: Number(totalRow.open ?? 0),
        totalIncidents,
        totalEnergy: Math.round(totalEnergy * 100) / 100,
        passRate: evaluated === 0 ? 0 : Math.round((pass / evaluated) * 1000) / 10,
      },
      byStatus,
      byCategory,
      byMonth: { ...byMonth, rows: [...byMonth.rows].reverse() },
      incidents,
      energyTrend: { ...energyTrend, rows: [...energyTrend.rows].reverse() },
      energyByType,
      assetsByCond,
      quality,
    };
  }

  // ---- Danh mục báo cáo cha/con (3 nhóm) ----
  presets() {
    return { groups: REPORT_PRESET_GROUPS };
  }

  /**
   * Drill-through: click vào 1 chỉ số trên biểu đồ → trả DANH SÁCH bản ghi gốc
   * tạo ra chỉ số đó. Cùng bộ lọc với biểu đồ + lát cắt theo giá trị của chiều
   * được click (`slice.dim` = chiều, `slice.value` = giá trị đã chọn).
   */
  async drill(dto: DrillReportDto, access: Access) {
    const page = Math.max(dto.page ?? 1, 1);
    const limit = Math.min(Math.max(dto.limit ?? 50, 1), 200);
    const { slice } = dto;
    const all = await this.drillRows(dto, access);
    const matched = slice.value
      ? all.rows.filter((r) => String(r[slice.dim] ?? '') === slice.value)
      : all.rows;
    const start = (page - 1) * limit;
    return {
      rows: matched.slice(start, start + limit),
      total: matched.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(matched.length / limit)),
      columns: all.columns,
      dataset: dto.dataset,
      slice,
    };
  }

  /** Bản ghi gốc + nhãn chiều của từng dataset (dùng cho drill). */
  private async drillRows(
    dto: DrillReportDto,
    access: Access,
  ): Promise<{ rows: Record<string, string | number>[]; columns: { key: string; label: string }[] }> {
    const f = dto.filters ?? {};
    const slice = dto.slice;
    const limit = Math.min(Math.max(dto.limit ?? 5000, 1), 5000);
    const take = Math.max(limit, 1000);

    if (dto.dataset === 'works' || dto.dataset === 'incidents') {
      const scopeIds = await this.scopeSiteIds(access);
      const incidentCat = dto.dataset === 'incidents'
        ? await this.prisma.workflowCategory.findFirst({
            where: { code: 'INCIDENT', isDeleted: false },
            select: { id: true },
          })
        : null;
      const works = await this.prisma.work.findMany({
        where: {
          ...(this.baseWorkWhere(dto, scopeIds, access) as object),
          ...(incidentCat && !f.categoryIds?.length ? { categoryId: incidentCat.id } : {}),
        } as never,
        include: {
          category: true,
          status: true,
          site: true,
          assigner: { select: { fullName: true, accountName: true } },
          handlers: {
            include: { user: { select: { fullName: true, accountName: true } } },
          },
          incidentDetail: true,
        } as never,
        orderBy: { id: 'desc' },
        take,
      });
      const rows = (works as unknown as Record<string, never>[]).map((w) => {
        const work = w as unknown as {
          id: number;
          title: string;
          progress: number;
          priority: string;
          startDate: Date | null;
          endDate: Date | null;
          completedAt: Date | null;
          createdAt: Date;
          category?: { vnName: string } | null;
          status?: { name: string } | null;
          site?: { name: string } | null;
          assigner?: { fullName: string | null; accountName: string } | null;
          handlers?: { user: { fullName: string | null; accountName: string } }[];
          incidentDetail?: { damageType?: string | null; repairType?: string | null; picUnit?: string | null; cause?: string | null; solution?: string | null; reopenCount?: number } | null;
        };
        const base: Record<string, string | number> = {
          id: work.id,
          link: `/work/${work.id}`,
          category: work.category?.vnName ?? '(Chưa phân loại)',
          status: work.status?.name ?? '(Chưa có trạng thái)',
          priority:
            work.priority === 'HIGH' ? 'Cao' : work.priority === 'LOW' ? 'Thấp' : 'Trung bình',
          site: work.site?.name ?? '(Không dự án)',
          assigner: work.assigner?.fullName?.trim() || work.assigner?.accountName || '(Ẩn)',
          handler:
            work.handlers?.[0]?.user.fullName?.trim() ||
            work.handlers?.[0]?.user.accountName ||
            '(Chưa gán)',
          month: monthKey(new Date(work.createdAt)),
        };
        if (dto.dataset === 'incidents') {
          return {
            ...base,
            damageType: work.incidentDetail?.damageType ?? '(Chưa phân loại)',
            repairType: work.incidentDetail?.repairType ?? '(Chưa phân loại)',
            picUnit: work.incidentDetail?.picUnit ?? '(Chưa gán)',
          };
        }
        return { ...base, title: work.title, progress: work.progress };
      });
      return { rows, columns: DRILL_COLUMNS[dto.dataset] };
    }

    if (dto.dataset === 'energy') {
      const scopeIds = await this.scopeSiteIds(access);
      const readings = await this.prisma.energyReading.findMany({
        where: {
          isDeleted: false,
          ...(f.meterTypes?.length
            ? { meter: { meterType: { in: f.meterTypes as never[] } } }
            : {}),
          ...(f.phases?.length ? { phase: { in: f.phases as never[] } } : {}),
        },
        include: {
          meter: { include: { check: { include: { work: { include: { site: true } } } } } },
        },
        orderBy: { id: 'desc' },
        take,
      });
      const rows = readings
        .filter((r) => {
          const work = r.meter.check.work;
          if (!work || work.isDeleted) return false;
          if (scopeIds && work.siteId !== null && !scopeIds.includes(work.siteId)) return false;
          return inRange(r.createdAt, f.from, f.to);
        })
        .map((r) => ({
          id: r.id,
          link: r.meter.check.workId ? `/work/${r.meter.check.workId}` : '',
          meterType: METER_TYPE_LABELS[r.meter.meterType] ?? r.meter.meterType,
          phase: PHASE_LABELS[r.phase] ?? r.phase,
          meterCode: r.meter.meterCode,
          site: r.meter.check.work?.site?.name ?? '(Không dự án)',
          month: monthKey(new Date(r.createdAt)),
          startIndex: Number(r.startIndex),
          endIndex: Number(r.endIndex),
          total: Number(r.total),
        }));
      void slice;
      return { rows, columns: DRILL_COLUMNS.energy };
    }

    if (dto.dataset === 'assets') {
      const assets = await this.prisma.asset.findMany({
        where: {
          isDeleted: false,
          ...(f.siteIds?.length ? { location: { siteId: { in: f.siteIds } } } : {}),
        },
        include: {
          category: true,
          condition: true,
          usageStatus: true,
          unit: true,
          location: { include: { site: true } },
        },
        orderBy: { id: 'desc' },
        take,
      });
      return {
        rows: assets.map((a) => ({
          id: a.id,
          link: '/assets',
          code: a.code,
          name: a.name,
          category: a.category?.name ?? '(Chưa phân loại)',
          condition: a.condition?.name ?? '(Chưa đánh giá)',
          usageStatus: a.usageStatus?.name ?? '(Chưa rõ)',
          site: a.location?.site?.name ?? '(Chưa gán vị trí)',
          quantity: Number(a.quantity ?? 1),
          unit: a.unit?.name ?? '',
          warrantyEnd: a.warrantyEnd ? a.warrantyEnd.toISOString().slice(0, 10) : '',
        })),
        columns: DRILL_COLUMNS.assets,
      };
    }

    if (dto.dataset === 'checklist') {
      const scopeIds = await this.scopeSiteIds(access);
      const items = await this.prisma.checklistItem.findMany({
        where: { isDeleted: false, parentId: { not: null } },
        include: { work: { include: { site: true, category: true } } },
        orderBy: { id: 'desc' },
        take,
      });
      const rows = items
        .filter((c) => {
          const w = c.work;
          if (w && scopeIds && w.siteId !== null && !scopeIds.includes(w.siteId)) return false;
          return inRange(c.createdAt, f.from, f.to);
        })
        .map((c) => ({
          id: c.id,
          link: c.workId ? `/work/${c.workId}` : '',
          title: c.title,
          standard: c.standard ?? '',
          result:
            c.result === 'PASS' ? 'Đạt' : c.result === 'FAIL' ? 'Không đạt' : '(Chưa đánh giá)',
          site: c.work?.site?.name ?? '(Không dự án)',
          category: c.work?.category?.vnName ?? '(Việc độc lập)',
          month: monthKey(new Date(c.createdAt)),
        }));
      return { rows, columns: DRILL_COLUMNS.checklist };
    }

    if (dto.dataset === 'contracts') {
      const contracts = await this.prisma.contract.findMany({
        where: {
          isDeleted: false,
          ...(f.contractTypes?.length
            ? { contractType: { in: f.contractTypes as never[] } }
            : {}),
          ...(f.siteIds?.length ? { siteLinks: { some: { siteId: { in: f.siteIds } } } } : {}),
        },
        include: { serviceType: true, siteLinks: { include: { site: true } } },
        orderBy: { id: 'desc' },
        take,
      });
      const rows = contracts.map((c) => ({
        id: c.id,
        link: `/app/contracts/${c.id}`,
        code: c.code,
        companyName: c.companyName,
        contractType: c.contractType === 'INPUT' ? 'Đầu vào' : 'Đầu ra',
        serviceType: c.serviceType?.name ?? '(Chưa phân loại)',
        site: c.siteLinks.map((l) => l.site?.name).filter(Boolean).join(' + ') || '(Chưa gán dự án)',
        // Khoá chiều phải trùng tên với `dimensions` của query để drill lọc đúng.
        company: c.companyName,
        month: c.startDate ? monthKey(new Date(c.startDate)) : '(Chưa có ngày)',
        startDate: c.startDate?.toISOString().slice(0, 10) ?? '',
        endDate: c.endDate?.toISOString().slice(0, 10) ?? '',
        termType: c.termType === 'TERM' ? 'Có thời hạn' : 'Không thời hạn',
      }));
      return { rows, columns: DRILL_COLUMNS.contracts };
    }

    if (dto.dataset === 'personnel') {
      const users = await this.prisma.user.findMany({
        where: { isDeleted: false },
        include: { department: true, position: true, userLevel: true, status: true },
        orderBy: { id: 'desc' },
        take,
      });
      const rows = users.map((u) => ({
        id: u.id,
        link: '/admin/employees',
        accountName: u.accountName,
        fullName: u.fullName ?? '',
        department: u.department?.name ?? '(Chưa phân bộ)',
        position: u.position?.name ?? '(Chưa chức vụ)',
        level: u.userLevel?.name ?? '(Chưa xếp bậc)',
        status: u.status?.name ?? '(Chưa rõ)',
        role: u.isInvestor ? 'Chủ đầu tư' : 'Nhân viên',
        gender: u.gender === 'MALE' ? 'Nam' : u.gender === 'FEMALE' ? 'Nữ' : 'Khác',
        hireYear: u.hireDate ? String(new Date(u.hireDate).getFullYear()) : '(Chưa nhập)',
      }));
      return { rows, columns: DRILL_COLUMNS.personnel };
    }

    // sites
    const scopeIds = await this.scopeSiteIds(access);
    const sites = await this.prisma.site.findMany({
      where: {
        isDeleted: false,
        ...(f.siteIds?.length ? { id: { in: f.siteIds } } : {}),
        ...(scopeIds && !access.isAdmin ? { id: { in: scopeIds } } : {}),
      },
      include: { investor: true, serviceType: true, province: true, manager: true },
      orderBy: { id: 'desc' },
      take,
    });
    return {
      rows: sites.map((s) => ({
        id: s.id,
        link: `/app/projects/${s.id}`,
        code: s.code ?? '',
        name: s.name,
        // Khoá chiều "site" (dùng cho biểu đồ 'Diện tích theo dự án').
        site: s.name,
        investor: s.investor?.name ?? '(Chưa gán)',
        serviceType: s.serviceType?.name ?? '(Chưa phân loại)',
        province: s.province?.name ?? '(Chưa nhập)',
        manager: s.manager ? s.manager.fullName?.trim() || s.manager.accountName : '(Chưa có)',
        glaArea: Number(s.glaArea ?? 0),
        occupancyRate: Number(s.occupancyRate ?? 0),
      })),
      columns: DRILL_COLUMNS.sites,
    };
  }

  // ---- Saved boards (dashboard người dùng tự lưu) ----
  async listBoards(ownerId: number, isAdmin: boolean) {
    return this.prisma.reportBoard.findMany({
      where: {
        isDeleted: false,
        ...(isAdmin ? {} : { OR: [{ ownerId }, { isPublic: true }] }),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getBoard(id: number, ownerId: number, isAdmin: boolean) {
    const board = await this.prisma.reportBoard.findFirst({
      where: { id, isDeleted: false },
    });
    if (!board) return null;
    if (!isAdmin && board.ownerId !== ownerId && !board.isPublic) return null;
    return board;
  }

  createBoard(ownerId: number, dto: { name: string; description?: string; config?: Record<string, unknown>; isPublic?: boolean }) {
    return this.prisma.reportBoard.create({
      data: {
        name: dto.name,
        description: dto.description,
        config: (dto.config ?? { widgets: [] }) as never,
        isPublic: dto.isPublic ?? false,
        ownerId,
      },
    });
  }

  async updateBoard(
    id: number,
    ownerId: number,
    isAdmin: boolean,
    dto: { name?: string; description?: string; config?: Record<string, unknown>; isPublic?: boolean },
  ) {
    const board = await this.getBoard(id, ownerId, isAdmin);
    if (!board) return null;
    if (!isAdmin && board.ownerId !== ownerId) return null;
    return this.prisma.reportBoard.update({
      where: { id },
      data: { ...dto, config: dto.config as never },
    });
  }

  async removeBoard(id: number, ownerId: number, isAdmin: boolean) {
    const board = await this.getBoard(id, ownerId, isAdmin);
    if (!board) return false;
    if (!isAdmin && board.ownerId !== ownerId) return false;
    await this.prisma.reportBoard.update({ where: { id }, data: { isDeleted: true } });
    return true;
  }
}
