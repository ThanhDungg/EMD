import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { userSiteIds } from '../../common/access.js';
import { toDateOnly } from '../../common/datetime.js';
import { assertSiteGeoChain } from './site-geo.util.js';
import type { CreateSiteDto } from './dto/create-site.dto.js';
import type { UpdateSiteDto } from './dto/update-site.dto.js';

const managerSelect = {
  id: true,
  accountName: true,
  fullName: true,
  email: true,
} as const;

// Hồ sơ đầy đủ của dự án: quản lý + droplist địa lý + chủ đầu tư /
// loại hình dịch vụ / dịch vụ cung cấp. Service hồ sơ dự án dùng chung.
export const siteProfileInclude = {
  manager: { select: managerSelect },
  country: { select: { id: true, code: true, name: true } },
  region: { select: { id: true, code: true, name: true } },
  province: { select: { id: true, code: true, name: true } },
  ward: { select: { id: true, code: true, name: true } },
  investor: { select: { id: true, code: true, name: true } },
  serviceType: { select: { id: true, code: true, name: true } },
  service: { select: { id: true, code: true, name: true } },
} as const;

const siteInclude = siteProfileInclude;

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  // QLDA/GSV/kỹ thuật chỉ thấy dự án mình quản lý hoặc tham gia
  // (managerId hoặc bảng thành viên). ADMIN/CEO/HO xem tất cả.
  findAll(includeDeleted = false, scope?: { meId: number; viewAll: boolean }) {
    const scoped =
      scope && !scope.viewAll
        ? {
            OR: [
              { managerId: scope.meId },
              { members: { some: { userId: scope.meId } } },
            ],
          }
        : undefined;
    return this.prisma.site.findMany({
      where: {
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...scoped,
      },
      include: siteInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, includeDeleted = false, scope?: { meId: number; viewAll: boolean }) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: siteInclude,
    });
    if (!site || (!includeDeleted && site.isDeleted)) {
      throw new NotFoundException(`Site #${id} không tồn tại.`);
    }
    if (scope && !scope.viewAll) {
      const ids = await userSiteIds(this.prisma, scope.meId);
      if (!ids.includes(id)) {
        throw new ForbiddenException(`Bạn không có quyền truy cập dự án #${id}.`);
      }
    }
    return site;
  }

  async create(dto: CreateSiteDto) {
    await assertSiteGeoChain(this.prisma, dto);
    const { receivedAt, ...rest } = dto;
    return this.prisma.site.create({
      data: {
        ...rest,
        ...(receivedAt !== undefined
          ? { receivedAt: toDateOnly(receivedAt) }
          : {}),
      },
      include: siteInclude,
    });
  }

  async update(id: number, dto: UpdateSiteDto) {
    await this.findOne(id, true);
    await assertSiteGeoChain(this.prisma, dto);
    const { receivedAt, ...rest } = dto;
    return this.prisma.site.update({
      where: { id },
      data: {
        ...rest,
        ...(receivedAt !== undefined
          ? { receivedAt: toDateOnly(receivedAt) }
          : {}),
      },
      include: siteInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.site.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.site.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
