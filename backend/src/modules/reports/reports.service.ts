import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { canAdminister, canViewAll } from '../../common/access.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateChartDto } from './dto/create-chart.dto.js';
import type { CreateDashboardDto } from './dto/create-dashboard.dto.js';
import type { ShareDashboardDto } from './dto/share-dashboard.dto.js';
import type { UpdateChartDto } from './dto/update-chart.dto.js';
import type { UpdateDashboardDto } from './dto/update-dashboard.dto.js';

const safeUserSelect = {
  id: true,
  accountName: true,
  fullName: true,
} as const;

// Prisma 7 chỉ nhận orderBy dạng MẢNG cho quan hệ lồng (object bị validate
// lỗi "Expected ReportChartOrderByWithRelationInput[]").
const chartInclude = {
  charts: {
    where: { isDeleted: false },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ReportDashboardInclude;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Quyền ----------

  /** Dashboard mà user được xem (owner, ADMIN/CEO/HO, được chia sẻ). */
  private viewWhere(user: JwtPayload) {
    if (canViewAll(user.permissions)) return { isDeleted: false };
    return {
      isDeleted: false,
      OR: [
        { ownerId: user.sub },
        { sharedUsers: { some: { id: user.sub } } },
        { sharedGroups: { some: { users: { some: { id: user.sub } } } } },
      ],
    };
  }

  private async findViewable(id: number, user: JwtPayload) {
    const dashboard = await this.prisma.reportDashboard.findFirst({
      where: { id, ...this.viewWhere(user) },
      include: {
        ...chartInclude,
        owner: { select: safeUserSelect },
        sharedUsers: { select: safeUserSelect },
        sharedGroups: { select: { id: true, name: true } },
      },
    });
    if (!dashboard) {
      throw new NotFoundException(`Dashboard #${id} không tồn tại.`);
    }
    return dashboard;
  }

  /** Chỉ owner hoặc ADMIN được sửa/xoá/chia sẻ. */
  private assertEditable(
    dashboard: { ownerId: number },
    user: JwtPayload,
  ): void {
    if (dashboard.ownerId !== user.sub && !canAdminister(user.permissions)) {
      throw new ForbiddenException(
        'Chỉ chủ sở hữu hoặc ADMIN được thay đổi dashboard này.',
      );
    }
  }

  // ---------- Dashboards ----------

  /** scope: mine | shared | all (ADMIN thấy tất cả). */
  async findAll(user: JwtPayload, scope = 'all') {
    const mine = { ownerId: user.sub, isDeleted: false };
    const shared = {
      isDeleted: false,
      ownerId: { not: user.sub },
      OR: [
        { sharedUsers: { some: { id: user.sub } } },
        { sharedGroups: { some: { users: { some: { id: user.sub } } } } },
      ],
    };
    const where =
      scope === 'mine'
        ? mine
        : scope === 'shared'
          ? canViewAll(user.permissions)
            ? { isDeleted: false, ownerId: { not: user.sub } }
            : shared
          : canViewAll(user.permissions)
            ? { isDeleted: false }
            : { isDeleted: false, OR: [mine, ...shared.OR] };
    return this.prisma.reportDashboard.findMany({
      where,
      include: {
        owner: { select: safeUserSelect },
        _count: { select: { charts: { where: { isDeleted: false } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number, user: JwtPayload) {
    return this.findViewable(id, user);
  }

  async create(user: JwtPayload, dto: CreateDashboardDto) {
    return this.prisma.reportDashboard.create({
      data: { ...dto, ownerId: user.sub },
      include: { owner: { select: safeUserSelect } },
    });
  }

  async update(id: number, user: JwtPayload, dto: UpdateDashboardDto) {
    const dashboard = await this.findViewable(id, user);
    this.assertEditable(dashboard, user);
    return this.prisma.reportDashboard.update({
      where: { id },
      data: dto,
      include: { owner: { select: safeUserSelect } },
    });
  }

  async remove(id: number, user: JwtPayload) {
    const dashboard = await this.findViewable(id, user);
    this.assertEditable(dashboard, user);
    return this.prisma.reportDashboard.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** Gán lại toàn bộ chia sẻ (user + nhóm). */
  async share(id: number, user: JwtPayload, dto: ShareDashboardDto) {
    const dashboard = await this.findViewable(id, user);
    this.assertEditable(dashboard, user);
    const userIds = dto.userIds ?? [];
    const groupIds = dto.groupIds ?? [];
    // Chỉ chia sẻ cho tài khoản/nhóm còn sử dụng.
    const [users, groups] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds }, isDeleted: false },
        select: { id: true },
      }),
      this.prisma.group.findMany({
        where: { id: { in: groupIds }, isDeleted: false },
        select: { id: true },
      }),
    ]);
    return this.prisma.reportDashboard.update({
      where: { id },
      data: {
        sharedUsers: { set: users.map((u) => ({ id: u.id })) },
        sharedGroups: { set: groups.map((g) => ({ id: g.id })) },
      },
      include: {
        sharedUsers: { select: safeUserSelect },
        sharedGroups: { select: { id: true, name: true } },
      },
    });
  }

  // ---------- Charts (kế thừa quyền dashboard) ----------

  private async chartDashboard(chartId: number, user: JwtPayload) {
    const chart = await this.prisma.reportChart.findUnique({
      where: { id: chartId },
      select: { id: true, dashboardId: true, dashboard: { select: { ownerId: true } } },
    });
    if (!chart || !chart.dashboard) {
      throw new NotFoundException(`Biểu đồ #${chartId} không tồn tại.`);
    }
    // Xem được dashboard mới được động vào biểu đồ của nó.
    await this.findViewable(chart.dashboardId, user);
    return chart;
  }

  async createChart(
    dashboardId: number,
    user: JwtPayload,
    dto: CreateChartDto,
  ) {
    const dashboard = await this.findViewable(dashboardId, user);
    this.assertEditable(dashboard, user);
    const maxOrder = await this.prisma.reportChart.findFirst({
      where: { dashboardId, isDeleted: false },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return this.prisma.reportChart.create({
      data: {
        ...dto,
        filters: (dto.filters ?? undefined) as Prisma.InputJsonValue | undefined,
        dashboardId,
        sortOrder: dto.sortOrder ?? (maxOrder?.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateChart(id: number, user: JwtPayload, dto: UpdateChartDto) {
    const chart = await this.chartDashboard(id, user);
    const dashboard = await this.findViewable(chart.dashboardId, user);
    this.assertEditable(dashboard, user);
    return this.prisma.reportChart.update({
      where: { id },
      data: {
        ...dto,
        filters: (dto.filters ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async removeChart(id: number, user: JwtPayload) {
    const chart = await this.chartDashboard(id, user);
    const dashboard = await this.findViewable(chart.dashboardId, user);
    this.assertEditable(dashboard, user);
    return this.prisma.reportChart.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
