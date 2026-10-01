import { BadRequestException, Injectable } from '@nestjs/common';
import { canViewAll, userSiteIds } from '../../common/access.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type {
  ContractType,
  MeterType,
  Prisma,
  SiteManagementStatus,
  SiteOperationStatus,
  SiteRentalStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface ReportRow {
  key: string;
  label: string;
  value: number;
  color?: string;
}

export interface ReportMarker {
  id: number;
  name: string;
  lat: number;
  lng: number;
  sub?: string;
}

export interface ReportResult {
  dataset: string;
  metric: string;
  dimension: string | null;
  total: number;
  rows: ReportRow[];
  markers?: ReportMarker[];
}

export interface ReportQuery {
  dataset: string;
  metric?: string;
  dimension?: string | null;
  filters?: Record<string, unknown>;
  limit?: number;
}

interface DataScope {
  viewAll: boolean;
  siteIds: number[];
  userId: number;
}

/** Mô tả 1 dataset cho UI builder tự dựng form (GET /reports/meta). */
export interface DatasetMeta {
  dataset: string;
  label: string;
  metrics: Array<{ value: string; label: string }>;
  dimensions: Array<{ value: string; label: string }>;
  filters: Array<{ value: string; label: string; type: string }>;
  chartTypes: string[];
}

const BASE_CHARTS = ['KPI', 'BAR', 'PIE', 'LINE', 'TABLE'];

export const DATASET_META: DatasetMeta[] = [
  {
    dataset: 'works',
    label: 'Công việc',
    metrics: [{ value: 'count', label: 'Số lượng' }],
    dimensions: [
      { value: 'status', label: 'Trạng thái' },
      { value: 'category', label: 'Loại công việc' },
      { value: 'priority', label: 'Mức ưu tiên' },
      { value: 'site', label: 'Dự án' },
      { value: 'month', label: 'Tháng tạo' },
    ],
    filters: [
      { value: 'from', label: 'Từ ngày', type: 'date' },
      { value: 'to', label: 'Đến ngày', type: 'date' },
      { value: 'siteId', label: 'Dự án', type: 'site' },
      { value: 'categoryId', label: 'Loại công việc', type: 'workCategory' },
      { value: 'statusId', label: 'Trạng thái', type: 'workStatus' },
    ],
    chartTypes: BASE_CHARTS,
  },
  {
    dataset: 'checklist',
    label: 'Checklist (Đạt/Không đạt)',
    metrics: [{ value: 'count', label: 'Số dòng' }],
    dimensions: [
      { value: 'result', label: 'Kết quả đánh giá' },
      { value: 'valueType', label: 'Loại giá trị' },
    ],
    filters: [
      { value: 'from', label: 'Từ ngày', type: 'date' },
      { value: 'to', label: 'Đến ngày', type: 'date' },
      { value: 'siteId', label: 'Dự án', type: 'site' },
      { value: 'workId', label: 'Công việc (ID)', type: 'number' },
    ],
    chartTypes: BASE_CHARTS,
  },
  {
    dataset: 'assets',
    label: 'Tài sản',
    metrics: [{ value: 'count', label: 'Số lượng' }],
    dimensions: [
      { value: 'category', label: 'Danh mục' },
      { value: 'usageStatus', label: 'Trạng thái dùng' },
      { value: 'condition', label: 'Tình trạng' },
      { value: 'site', label: 'Dự án' },
    ],
    filters: [
      { value: 'siteId', label: 'Dự án', type: 'site' },
      { value: 'categoryId', label: 'Danh mục tài sản', type: 'assetCategory' },
    ],
    chartTypes: BASE_CHARTS,
  },
  {
    dataset: 'sites',
    label: 'Dự án',
    metrics: [{ value: 'count', label: 'Số lượng' }],
    dimensions: [
      { value: 'operationStatus', label: 'Tình trạng dự án' },
      { value: 'rentalStatus', label: 'Trạng thái cho thuê' },
      { value: 'managementStatus', label: 'Trạng thái quản lý' },
      { value: 'province', label: 'Tỉnh thành' },
      { value: 'map', label: 'Bản đồ vị trí' },
    ],
    filters: [
      { value: 'operationStatus', label: 'Tình trạng dự án', type: 'text' },
      { value: 'provinceId', label: 'Tỉnh thành (ID)', type: 'number' },
    ],
    chartTypes: [...BASE_CHARTS, 'MAP'],
  },
  {
    dataset: 'incidents',
    label: 'Sự cố hư hỏng',
    metrics: [{ value: 'count', label: 'Số lượng' }],
    dimensions: [
      { value: 'damageType', label: 'Phân loại hư hỏng' },
      { value: 'repairType', label: 'Phân loại sửa chữa' },
      { value: 'site', label: 'Dự án' },
      { value: 'status', label: 'Trạng thái việc' },
      { value: 'picUnit', label: 'Đơn vị phụ trách' },
      { value: 'reopened', label: 'Mở lại sự cố' },
      { value: 'month', label: 'Tháng phát sinh' },
    ],
    filters: [
      { value: 'siteId', label: 'Dự án', type: 'site' },
      { value: 'from', label: 'Từ ngày', type: 'date' },
      { value: 'to', label: 'Đến ngày', type: 'date' },
    ],
    chartTypes: BASE_CHARTS,
  },
  {
    dataset: 'energy',
    label: 'Năng lượng',
    metrics: [
      { value: 'sum_total', label: 'Tổng tiêu thụ' },
      { value: 'count', label: 'Số chỉ số' },
    ],
    dimensions: [
      { value: 'meterType', label: 'Loại đồng hồ' },
      { value: 'phase', label: 'Pha đo' },
      { value: 'month', label: 'Tháng kiểm tra' },
    ],
    filters: [
      { value: 'from', label: 'Từ ngày', type: 'date' },
      { value: 'to', label: 'Đến ngày', type: 'date' },
      { value: 'meterType', label: 'Loại đồng hồ', type: 'text' },
      { value: 'siteId', label: 'Dự án', type: 'site' },
    ],
    chartTypes: BASE_CHARTS,
  },
  {
    dataset: 'contracts',
    label: 'Hợp đồng',
    metrics: [{ value: 'count', label: 'Số lượng' }],
    dimensions: [
      { value: 'contractType', label: 'Loại đầu vào/ra' },
      { value: 'typeName', label: 'Tên loại hợp đồng' },
    ],
    filters: [
      { value: 'siteId', label: 'Dự án', type: 'site' },
      { value: 'contractType', label: 'Loại (INPUT/OUTPUT)', type: 'text' },
    ],
    chartTypes: BASE_CHARTS,
  },
];

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
};

const OPERATION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Ngưng hoạt động',
};

const RENTAL_STATUS_LABEL: Record<string, string> = {
  RENTED: 'Đang cho thuê',
  VACANT: 'Trống',
  PREPARING: 'Chuẩn bị cho thuê',
};

const MANAGEMENT_STATUS_LABEL: Record<string, string> = {
  MANAGED: 'Đang quản lý',
  NOT_MANAGED: 'Chưa quản lý',
  SUSPENDED: 'Ngưng quản lý',
};

const METER_TYPE_LABEL: Record<string, string> = {
  ELECTRICITY: 'Điện',
  WATER: 'Nước',
  DO_OIL: 'Dầu DO',
};

const PHASE_LABEL: Record<string, string> = {
  NORMAL: 'Bình thường',
  PEAK: 'Cao điểm',
  OFF_PEAK: 'Thấp điểm',
};

const CONTRACT_TYPE_LABEL: Record<string, string> = {
  INPUT: 'Đầu vào',
  OUTPUT: 'Đầu ra',
};

const RESULT_LABEL: Record<string, { label: string; color: string }> = {
  PASS: { label: 'Đạt', color: '#52c41a' },
  FAIL: { label: 'Không đạt', color: '#ff4d4f' },
  NONE: { label: 'Chưa đánh giá', color: '#d9d9d9' },
};

@Injectable()
export class ReportsDataService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Scope ----------

  private async scope(user: JwtPayload): Promise<DataScope> {
    if (canViewAll(user.permissions)) {
      return { viewAll: true, siteIds: [], userId: user.sub };
    }
    return {
      viewAll: false,
      siteIds: await userSiteIds(this.prisma, user.sub),
      userId: user.sub,
    };
  }

  /** Điều kiện work mà user được thấy (không viewAll). */
  private workScopeWhere(scope: DataScope): Prisma.WorkWhereInput {
    if (scope.viewAll) return {};
    return {
      OR: [
        { siteId: { in: scope.siteIds } },
        { assignerId: scope.userId },
        { handlers: { some: { userId: scope.userId } } },
        { followers: { some: { id: scope.userId } } },
      ],
    };
  }

  // ---------- Helpers đọc filters ----------

  private num(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }

  private str(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim();
    return s ? s : undefined;
  }

  private dateRange(filters: Record<string, unknown>): {
    gte?: Date;
    lte?: Date;
  } {
    const out: { gte?: Date; lte?: Date } = {};
    const from = this.str(filters.from);
    const to = this.str(filters.to);
    if (from) {
      const d = new Date(`${from}T00:00:00`);
      if (!Number.isNaN(d.getTime())) out.gte = d;
    }
    if (to) {
      const d = new Date(`${to}T23:59:59.999`);
      if (!Number.isNaN(d.getTime())) out.lte = d;
    }
    return out;
  }

  /** Chuỗi phải là 1 key enum hợp lệ — sai thì báo 400 rõ ràng. */
  private enumVal(
    raw: string | undefined,
    labels: Record<string, string>,
    name: string,
  ): string | undefined {
    if (!raw) return undefined;
    const upper = raw.trim().toUpperCase();
    if (!(upper in labels)) {
      throw new BadRequestException(
        `"${raw}" không hợp lệ cho ${name}. Giá trị đúng: ${Object.keys(labels).join(', ')}.`,
      );
    }
    return upper;
  }

  private monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private finish(
    query: ReportQuery,
    rows: ReportRow[],
    markers?: ReportMarker[],
  ): ReportResult {
    const byValue = [...rows].sort((a, b) => b.value - a.value);
    const limit = query.limit ?? 20;
    return {
      dataset: query.dataset,
      metric: query.metric ?? 'count',
      dimension: query.dimension ?? null,
      total: rows.reduce((sum, r) => sum + r.value, 0),
      rows: query.dimension === 'month' || query.dimension === 'map'
        ? [...rows].sort((a, b) => (a.key < b.key ? -1 : 1)).slice(0, limit)
        : byValue.slice(0, limit),
      ...(markers ? { markers } : {}),
    };
  }

  // ---------- Entry ----------

  async query(user: JwtPayload, query: ReportQuery): Promise<ReportResult> {
    const scope = await this.scope(user);
    const dimension = query.dimension ?? null;
    const filters = query.filters ?? {};
    switch (query.dataset) {
      case 'works':
        return this.works(scope, query.metric ?? 'count', dimension, filters, query);
      case 'checklist':
        return this.checklist(scope, dimension, filters, query);
      case 'assets':
        return this.assets(scope, dimension, filters, query);
      case 'sites':
        return this.sites(scope, dimension, filters, query);
      case 'incidents':
        return this.incidents(scope, dimension, filters, query);
      case 'energy':
        return this.energy(scope, query.metric ?? 'count', dimension, filters, query);
      case 'contracts':
        return this.contracts(scope, dimension, filters, query);
      default:
        throw new BadRequestException(
          `Dataset "${query.dataset}" không hỗ trợ.`,
        );
    }
  }

  // ---------- Works ----------

  private async works(
    scope: DataScope,
    metric: string,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    if (metric !== 'count') {
      throw new BadRequestException('Công việc chỉ hỗ trợ metric "count".');
    }
    const range = this.dateRange(filters);
    const where: Prisma.WorkWhereInput = {
      isDeleted: false,
      isRecurrence: false,
      ...this.workScopeWhere(scope),
      ...(this.num(filters.siteId) !== undefined
        ? { siteId: this.num(filters.siteId) }
        : {}),
      ...(this.num(filters.categoryId) !== undefined
        ? { categoryId: this.num(filters.categoryId) }
        : {}),
      ...(this.num(filters.statusId) !== undefined
        ? { statusId: this.num(filters.statusId) }
        : {}),
      ...(range.gte || range.lte ? { createdAt: range } : {}),
    };

    if (!dimension) {
      const total = await this.prisma.work.count({ where });
      return this.finish(query, [{ key: 'total', label: 'Tổng số', value: total }]);
    }

    if (dimension === 'month') {
      const items = await this.prisma.work.findMany({
        where,
        select: { createdAt: true },
      });
      const map = new Map<string, number>();
      for (const item of items) {
        const key = this.monthKey(item.createdAt);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({
          key,
          label: `T${key.slice(5)}/${key.slice(0, 4)}`,
          value,
        })),
      );
    }

    if (dimension === 'status') {
      const groups = await this.prisma.work.groupBy({
        by: ['statusId'],
        where,
        _count: { _all: true },
      });
      const statuses = await this.prisma.workflowStatus.findMany({
        where: { id: { in: groups.map((g) => g.statusId).filter((v): v is number => v !== null) } },
        select: { id: true, name: true, color: true },
      });
      const byId = new Map(statuses.map((s) => [s.id, s]));
      return this.finish(
        query,
        groups.map((g) => {
          const s = g.statusId !== null ? byId.get(g.statusId) : undefined;
          return {
            key: g.statusId === null ? 'none' : String(g.statusId),
            label: s?.name ?? 'Chưa đặt',
            value: g._count._all,
            ...(s?.color ? { color: s.color } : {}),
          };
        }),
      );
    }

    if (dimension === 'category') {
      const groups = await this.prisma.work.groupBy({
        by: ['categoryId'],
        where,
        _count: { _all: true },
      });
      const cats = await this.prisma.workflowCategory.findMany({
        where: { id: { in: groups.map((g) => g.categoryId) } },
        select: { id: true, vnName: true },
      });
      const byId = new Map(cats.map((c) => [c.id, c.vnName]));
      return this.finish(
        query,
        groups.map((g) => ({
          key: String(g.categoryId),
          label: byId.get(g.categoryId) ?? `#${g.categoryId}`,
          value: g._count._all,
        })),
      );
    }

    if (dimension === 'priority') {
      const groups = await this.prisma.work.groupBy({
        by: ['priority'],
        where,
        _count: { _all: true },
      });
      return this.finish(
        query,
        groups.map((g) => ({
          key: g.priority,
          label: PRIORITY_LABEL[g.priority] ?? g.priority,
          value: g._count._all,
        })),
      );
    }

    if (dimension === 'site') {
      const groups = await this.prisma.work.groupBy({
        by: ['siteId'],
        where,
        _count: { _all: true },
      });
      const sites = await this.prisma.site.findMany({
        where: { id: { in: groups.map((g) => g.siteId).filter((v): v is number => v !== null) } },
        select: { id: true, name: true },
      });
      const byId = new Map(sites.map((s) => [s.id, s.name]));
      return this.finish(
        query,
        groups.map((g) => ({
          key: g.siteId === null ? 'none' : String(g.siteId),
          label: g.siteId === null ? 'Không dự án' : (byId.get(g.siteId) ?? `#${g.siteId}`),
          value: g._count._all,
        })),
      );
    }

    throw new BadRequestException(
      `Công việc không hỗ trợ dimension "${dimension}".`,
    );
  }

  // ---------- Checklist (chỉ dòng lá có work) ----------

  private async checklist(
    scope: DataScope,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    const range = this.dateRange(filters);
    const siteId = this.num(filters.siteId);
    const workId = this.num(filters.workId);
    const items = await this.prisma.checklistItem.findMany({
      where: {
        isDeleted: false,
        workId: { not: null },
        work: { isDeleted: false },
        ...(workId !== undefined ? { workId } : {}),
        ...(range.gte || range.lte ? { createdAt: range } : {}),
      },
      select: {
        id: true,
        parentId: true,
        result: true,
        valueType: true,
        work: {
          select: {
            siteId: true,
            assignerId: true,
            handlers: { select: { userId: true } },
            followers: { select: { id: true } },
          },
        },
      },
    });
    // Lọc phạm vi + chỉ giữ dòng lá (không ai nhận làm con).
    const parentIds = new Set(
      items.map((i) => i.parentId).filter((v): v is number => v !== null),
    );
    const leaves = items.filter((i) => {
      if (parentIds.has(i.id)) return false;
      const w = i.work;
      if (!w) return false;
      if (scope.viewAll) return true;
      if (siteId !== undefined) return w.siteId === siteId;
      if (w.siteId !== null && w.siteId !== undefined)
        return scope.siteIds.includes(w.siteId);
      if (w.assignerId === scope.userId) return true;
      if (w.handlers.some((h) => h.userId === scope.userId)) return true;
      return w.followers.some((f) => f.id === scope.userId);
    });

    if (!dimension || dimension === 'result') {
      const map = new Map<string, number>();
      for (const item of leaves) {
        const key = item.result ?? 'NONE';
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({
          key,
          label: RESULT_LABEL[key]?.label ?? key,
          value,
          ...(RESULT_LABEL[key]?.color
            ? { color: RESULT_LABEL[key].color }
            : {}),
        })),
      );
    }

    if (dimension === 'valueType') {
      const map = new Map<string, number>();
      for (const item of leaves) {
        const key = item.valueType ?? '—';
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({ key, label: key, value })),
      );
    }

    throw new BadRequestException(
      `Checklist không hỗ trợ dimension "${dimension}".`,
    );
  }

  // ---------- Assets ----------

  private async assets(
    scope: DataScope,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    const siteId = this.num(filters.siteId);
    const categoryId = this.num(filters.categoryId);
    const where: Prisma.AssetWhereInput = {
      isDeleted: false,
      ...(scope.viewAll
        ? {}
        : {
            OR: [
              { locationId: null },
              { location: { siteId: { in: scope.siteIds } } },
            ],
          }),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(siteId !== undefined ? { location: { siteId } } : {}),
    };
    const items = await this.prisma.asset.findMany({
      where,
      select: {
        category: { select: { name: true } },
        usageStatus: { select: { name: true } },
        condition: { select: { name: true } },
        location: { select: { site: { select: { name: true } } } },
      },
    });

    if (!dimension || dimension === 'category') {
      return this.finish(query, this.countBy(items, (i) => i.category?.name ?? '—'));
    }
    if (dimension === 'usageStatus') {
      return this.finish(query, this.countBy(items, (i) => i.usageStatus?.name ?? '—'));
    }
    if (dimension === 'condition') {
      return this.finish(query, this.countBy(items, (i) => i.condition?.name ?? '—'));
    }
    if (dimension === 'site') {
      return this.finish(
        query,
        this.countBy(items, (i) => i.location?.site?.name ?? 'Chưa đặt vị trí'),
      );
    }
    throw new BadRequestException(
      `Tài sản không hỗ trợ dimension "${dimension}".`,
    );
  }

  private countBy<T>(items: T[], key: (item: T) => string): ReportRow[] {
    const map = new Map<string, number>();
    for (const item of items) {
      const k = key(item);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, value]) => ({
      key: label,
      label,
      value,
    }));
  }

  // ---------- Sites (+ bản đồ) ----------

  private async sites(
    scope: DataScope,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    const operationStatus = this.enumVal(
      this.str(filters.operationStatus),
      OPERATION_STATUS_LABEL,
      'tình trạng dự án',
    ) as SiteOperationStatus | undefined;
    const rentalStatus = this.enumVal(
      this.str(filters.rentalStatus),
      RENTAL_STATUS_LABEL,
      'trạng thái cho thuê',
    ) as SiteRentalStatus | undefined;
    const managementStatus = this.enumVal(
      this.str(filters.managementStatus),
      MANAGEMENT_STATUS_LABEL,
      'trạng thái quản lý',
    ) as SiteManagementStatus | undefined;
    const where: Prisma.SiteWhereInput = {
      isDeleted: false,
      ...(scope.viewAll ? {} : { id: { in: scope.siteIds } }),
      ...(operationStatus ? { operationStatus } : {}),
      ...(rentalStatus ? { rentalStatus } : {}),
      ...(managementStatus ? { managementStatus } : {}),
      ...(this.num(filters.provinceId) !== undefined
        ? { provinceId: this.num(filters.provinceId) }
        : {}),
    };
    const items = await this.prisma.site.findMany({
      where,
      select: {
        id: true,
        name: true,
        geoPoints: true,
        operationStatus: true,
        rentalStatus: true,
        managementStatus: true,
        province: { select: { name: true } },
      },
    });

    if (dimension === 'map') {
      const markers: ReportMarker[] = [];
      for (const s of items) {
        const point = this.firstGeoPoint(s.geoPoints);
        if (!point) continue;
        markers.push({
          id: s.id,
          name: s.name,
          lat: point.lat,
          lng: point.lng,
          sub: s.operationStatus
            ? (OPERATION_STATUS_LABEL[s.operationStatus] ?? s.operationStatus)
            : undefined,
        });
      }
      return this.finish(
        query,
        [{ key: 'total', label: 'Dự án có vị trí', value: markers.length }],
        markers,
      );
    }

    if (!dimension || dimension === 'operationStatus') {
      return this.finish(
        query,
        this.countBy(items, (s) =>
          s.operationStatus
            ? (OPERATION_STATUS_LABEL[s.operationStatus] ?? s.operationStatus)
            : '—',
        ),
      );
    }
    if (dimension === 'rentalStatus') {
      return this.finish(
        query,
        this.countBy(items, (s) =>
          s.rentalStatus
            ? (RENTAL_STATUS_LABEL[s.rentalStatus] ?? s.rentalStatus)
            : '—',
        ),
      );
    }
    if (dimension === 'managementStatus') {
      return this.finish(
        query,
        this.countBy(items, (s) =>
          s.managementStatus
            ? (MANAGEMENT_STATUS_LABEL[s.managementStatus] ?? s.managementStatus)
            : '—',
        ),
      );
    }
    if (dimension === 'province') {
      return this.finish(
        query,
        this.countBy(items, (s) => s.province?.name ?? '—'),
      );
    }
    throw new BadRequestException(
      `Dự án không hỗ trợ dimension "${dimension}".`,
    );
  }

  private firstGeoPoint(
    raw: string | null,
  ): { lat: number; lng: number } | null {
    if (!raw) return null;
    const first = raw.split(';')[0]?.trim();
    if (!first) return null;
    const [latRaw, lngRaw] = first.split(',');
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  // ---------- Incidents ----------

  private async incidents(
    scope: DataScope,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    const siteId = this.num(filters.siteId);
    const range = this.dateRange(filters);
    // Dự án của sự cố lấy theo work, rồi mới tới vị trí xảy ra.
    const items = await this.prisma.incidentDetail.findMany({
      where: {
        isDeleted: false,
        ...(scope.viewAll
          ? {}
          : {
              OR: [
                { work: this.workScopeWhere(scope) },
                { location: { siteId: { in: scope.siteIds } } },
              ],
            }),
        ...(siteId !== undefined
          ? {
              OR: [{ work: { siteId } }, { location: { siteId } }],
            }
          : {}),
        ...(range.gte || range.lte
          ? { work: { createdAt: range } }
          : {}),
      },
      select: {
        damageType: true,
        repairType: true,
        picUnit: true,
        reopenCount: true,
        createdAt: true,
        work: {
          select: {
            siteId: true,
            createdAt: true,
            status: { select: { name: true, color: true } },
          },
        },
        location: { select: { siteId: true } },
      },
    });
    // id dự án đã resolve (work trước, vị trí sau) + tên dự án để gom nhóm.
    const resolvedSiteIds = [
      ...new Set(
        items
          .map((i) => i.work?.siteId ?? i.location?.siteId ?? null)
          .filter((v): v is number => v !== null),
      ),
    ];
    const sites = await this.prisma.site.findMany({
      where: { id: { in: resolvedSiteIds } },
      select: { id: true, name: true },
    });
    const siteName = new Map(sites.map((s) => [s.id, s.name]));
    const siteOf = (i: (typeof items)[number]): string =>
      siteName.get(i.work?.siteId ?? i.location?.siteId ?? -1) ?? 'Không dự án';

    if (!dimension || dimension === 'damageType') {
      return this.finish(
        query,
        this.countBy(items, (i) => i.damageType ?? '—'),
      );
    }
    if (dimension === 'repairType') {
      return this.finish(
        query,
        this.countBy(items, (i) => i.repairType ?? '—'),
      );
    }
    if (dimension === 'picUnit') {
      return this.finish(query, this.countBy(items, (i) => i.picUnit ?? '—'));
    }
    if (dimension === 'site') {
      return this.finish(query, this.countBy(items, siteOf));
    }
    if (dimension === 'status') {
      const map = new Map<
        string,
        { value: number; color?: string }
      >();
      for (const i of items) {
        const name = i.work?.status?.name ?? 'Chưa đặt';
        const cur = map.get(name) ?? {
          value: 0,
          ...(i.work?.status?.color ? { color: i.work.status.color } : {}),
        };
        cur.value += 1;
        map.set(name, cur);
      }
      return this.finish(
        query,
        [...map.entries()].map(([label, v]) => ({
          key: label,
          label,
          value: v.value,
          ...(v.color ? { color: v.color } : {}),
        })),
      );
    }
    if (dimension === 'reopened') {
      return this.finish(
        query,
        this.countBy(items, (i) =>
          i.reopenCount > 0 ? 'Đã mở lại' : 'Không mở lại',
        ),
      );
    }
    if (dimension === 'month') {
      const map = new Map<string, number>();
      for (const i of items) {
        const d = i.work?.createdAt ?? i.createdAt;
        const key = this.monthKey(d);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({
          key,
          label: `T${key.slice(5)}/${key.slice(0, 4)}`,
          value,
        })),
      );
    }
    throw new BadRequestException(
      `Sự cố không hỗ trợ dimension "${dimension}".`,
    );
  }

  // ---------- Energy ----------

  private async energy(
    scope: DataScope,
    metric: string,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    if (metric !== 'count' && metric !== 'sum_total') {
      throw new BadRequestException(
        'Năng lượng chỉ hỗ trợ metric "count" và "sum_total".',
      );
    }
    const range = this.dateRange(filters);
    const meterType = this.enumVal(
      this.str(filters.meterType),
      METER_TYPE_LABEL,
      'loại đồng hồ',
    ) as MeterType | undefined;
    const siteId = this.num(filters.siteId);
    const readings = await this.prisma.energyReading.findMany({
      where: {
        isDeleted: false,
        ...(meterType ? { meter: { meterType } } : {}),
        ...(range.gte || range.lte || siteId !== undefined || !scope.viewAll
          ? {
              meter: {
                check: {
                  isDeleted: false,
                  ...(range.gte || range.lte
                    ? { checkTime: range }
                    : {}),
                  ...(siteId !== undefined
                    ? { work: { siteId } }
                    : !scope.viewAll
                      ? {
                          OR: [
                            { workId: null },
                            { work: this.workScopeWhere(scope) },
                          ],
                        }
                      : {}),
                },
              },
            }
          : { meter: { check: { isDeleted: false } } }),
      },
      select: {
        total: true,
        phase: true,
        meter: {
          select: {
            meterType: true,
            check: { select: { checkTime: true } },
          },
        },
      },
    });

    const valueOf = (total: unknown): number =>
      metric === 'sum_total' ? Number(total ?? 0) : 1;

    if (!dimension || dimension === 'meterType') {
      const map = new Map<string, number>();
      for (const r of readings) {
        const key = r.meter.meterType;
        map.set(key, (map.get(key) ?? 0) + valueOf(r.total));
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({
          key,
          label: METER_TYPE_LABEL[key] ?? key,
          value: Math.round(value * 100) / 100,
        })),
      );
    }
    if (dimension === 'phase') {
      const map = new Map<string, number>();
      for (const r of readings) {
        const key = r.phase;
        map.set(key, (map.get(key) ?? 0) + valueOf(r.total));
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({
          key,
          label: PHASE_LABEL[key] ?? key,
          value: Math.round(value * 100) / 100,
        })),
      );
    }
    if (dimension === 'month') {
      const map = new Map<string, number>();
      for (const r of readings) {
        const t = r.meter.check.checkTime;
        if (!t) continue;
        const key = this.monthKey(new Date(t));
        map.set(key, (map.get(key) ?? 0) + valueOf(r.total));
      }
      return this.finish(
        query,
        [...map.entries()].map(([key, value]) => ({
          key,
          label: `T${key.slice(5)}/${key.slice(0, 4)}`,
          value: Math.round(value * 100) / 100,
        })),
      );
    }
    throw new BadRequestException(
      `Năng lượng không hỗ trợ dimension "${dimension}".`,
    );
  }

  // ---------- Contracts ----------

  private async contracts(
    scope: DataScope,
    dimension: string | null,
    filters: Record<string, unknown>,
    query: ReportQuery,
  ): Promise<ReportResult> {
    const siteId = this.num(filters.siteId);
    const contractType = this.enumVal(
      this.str(filters.contractType),
      CONTRACT_TYPE_LABEL,
      'loại hợp đồng',
    ) as ContractType | undefined;
    const items = await this.prisma.contract.findMany({
      where: {
        isDeleted: false,
        ...(scope.viewAll
          ? {}
          : {
              OR: [
                { siteLinks: { none: {} } },
                { siteLinks: { some: { siteId: { in: scope.siteIds } } } },
              ],
            }),
        ...(siteId !== undefined
          ? { siteLinks: { some: { siteId } } }
          : {}),
        ...(contractType ? { contractType } : {}),
      },
      select: { contractType: true, typeName: true },
    });

    if (!dimension || dimension === 'contractType') {
      return this.finish(
        query,
        this.countBy(items, (c) => CONTRACT_TYPE_LABEL[c.contractType] ?? c.contractType),
      );
    }
    if (dimension === 'typeName') {
      return this.finish(query, this.countBy(items, (c) => c.typeName));
    }
    throw new BadRequestException(
      `Hợp đồng không hỗ trợ dimension "${dimension}".`,
    );
  }
}
