import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toDateOnly } from '../../common/datetime.js';
import { userSiteIds } from '../../common/access.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateAssetDto } from './dto/create-asset.dto.js';
import type { UpdateAssetDto } from './dto/update-asset.dto.js';

const droplistInclude = {
  category: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, code: true, name: true } },
  usageStatus: { select: { id: true, code: true, name: true } },
  condition: { select: { id: true, code: true, name: true } },
  location: {
    select: {
      id: true,
      name: true,
      siteId: true,
      parentId: true,
      site: { select: { id: true, name: true } },
    },
  },
} as const;

export interface AssetFilters {
  /** Lọc theo dự án (site) — dùng bởi màn sự cố và màn danh sách. */
  siteId?: number;
  locationId?: number;
  categoryId?: number;
  usageStatusId?: number;
  conditionId?: number;
  /** Tìm theo mã / tên / model / nhà cung cấp. */
  keyword?: string;
  includeDeleted?: boolean;
  /** Phạm vi dự án (QLDA/GSV/kỹ thuật). viewAll = ADMIN/CEO/HO. */
  scope?: { meId: number; viewAll: boolean };
}

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tài sản chưa gắn vị trí thì ai cũng xem; đã gắn vị trí thì chỉ người
  // trong dự án đó (và ADMIN/CEO/HO) được xem.
  async findAll(filters: AssetFilters = {}) {
    const {
      siteId,
      locationId,
      categoryId,
      usageStatusId,
      conditionId,
      keyword,
      scope,
    } = filters;
    let siteFilter = {};
    if (scope && !scope.viewAll) {
      const ids = await userSiteIds(this.prisma, scope.meId);
      siteFilter = {
        OR: [{ locationId: null }, { location: { siteId: { in: ids } } }],
      };
    }
    return this.prisma.asset.findMany({
      where: {
        ...(filters.includeDeleted ? {} : { isDeleted: false }),
        ...siteFilter,
        ...(categoryId != null ? { categoryId } : {}),
        ...(usageStatusId != null ? { usageStatusId } : {}),
        ...(conditionId != null ? { conditionId } : {}),
        ...(locationId != null
          ? { locationId }
          : siteId != null
            ? { location: { siteId } }
            : {}),
        ...(keyword
          ? {
              OR: [
                { code: { contains: keyword, mode: 'insensitive' } },
                { name: { contains: keyword, mode: 'insensitive' } },
                { model: { contains: keyword, mode: 'insensitive' } },
                { supplier: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: droplistInclude,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number, scope?: { meId: number; viewAll: boolean }) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: droplistInclude,
    });
    if (!asset || asset.isDeleted) {
      throw new NotFoundException(`Asset #${id} không tồn tại.`);
    }
    if (scope && !scope.viewAll && asset.location?.siteId != null) {
      const ids = await userSiteIds(this.prisma, scope.meId);
      if (!ids.includes(asset.location.siteId)) {
        throw new ForbiddenException(`Bạn không có quyền xem tài sản #${id}.`);
      }
    }
    return asset;
  }

  // Vị trí phải tồn tại (và không bị xoá)
  private async assertLocation(locationId: number | undefined | null) {
    if (locationId == null) return;
    const location = await this.prisma.siteLocation.findUnique({
      where: { id: locationId },
    });
    if (!location || location.isDeleted) {
      throw new BadRequestException(`Vị trí #${locationId} không tồn tại.`);
    }
  }

  async create(dto: CreateAssetDto) {
    await this.assertLocation(dto.locationId);
    return this.prisma.asset.create({
      data: {
        code: dto.code,
        name: dto.name,
        usageDate: toDateOnly(dto.usageDate),
        usageStatusId: dto.usageStatusId,
        categoryId: dto.categoryId,
        locationId: dto.locationId,
        supplier: dto.supplier,
        origin: dto.origin,
        model: dto.model,
        quantity: dto.quantity,
        unitId: dto.unitId,
        warrantyEnd: toDateOnly(dto.warrantyEnd),
        conditionId: dto.conditionId,
        remarks: dto.remarks,
        detail: dto.detail,
      },
      include: droplistInclude,
    });
  }

  async update(id: number, dto: UpdateAssetDto) {
    await this.findOne(id);
    await this.assertLocation(dto.locationId);
    return this.prisma.asset.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.usageDate !== undefined
          ? { usageDate: toDateOnly(dto.usageDate) }
          : {}),
        ...(dto.usageStatusId !== undefined
          ? { usageStatusId: dto.usageStatusId }
          : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.locationId !== undefined ? { locationId: dto.locationId } : {}),
        ...(dto.supplier !== undefined ? { supplier: dto.supplier } : {}),
        ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unitId !== undefined ? { unitId: dto.unitId } : {}),
        ...(dto.warrantyEnd !== undefined
          ? { warrantyEnd: toDateOnly(dto.warrantyEnd) }
          : {}),
        ...(dto.conditionId !== undefined
          ? { conditionId: dto.conditionId }
          : {}),
        ...(dto.remarks !== undefined ? { remarks: dto.remarks } : {}),
        ...(dto.detail !== undefined ? { detail: dto.detail } : {}),
      },
      include: droplistInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.asset.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset #${id} không tồn tại.`);
    return this.prisma.asset.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
