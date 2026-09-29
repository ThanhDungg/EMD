import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateGeoDto, GeoKey } from './dto/geo.dto.js';
import type { UpdateGeoDto } from './dto/update-geo.dto.js';

// Địa lý phân cấp của hồ sơ dự án: quốc gia → miền → tỉnh thành → phường xã.
// Mỗi tầng trỏ về tầng trên bằng `parentId`, dùng 1 service + 1 controller.
export const GEO_LEVELS: Record<
  GeoKey,
  {
    label: string;
    table: string;
    parentKey: GeoKey | null;
    parentColumn: string;
  }
> = {
  country: {
    label: 'Quốc gia',
    table: 'countries',
    parentKey: null,
    parentColumn: '',
  },
  region: {
    label: 'Miền',
    table: 'regions',
    parentKey: 'country',
    parentColumn: 'countryId',
  },
  province: {
    label: 'Tỉnh thành',
    table: 'provinces',
    parentKey: 'region',
    parentColumn: 'regionId',
  },
  ward: {
    label: 'Phường xã',
    table: 'wards',
    parentKey: 'province',
    parentColumn: 'provinceId',
  },
};

export type GeoRow = {
  id: number;
  uuid: string;
  code: string | null;
  name: string;
  isDeleted: boolean;
};

@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lọc theo tầng trên bằng `parentId`. Riêng tỉnh thành nhận thêm `countryId`
   * (khách hàng chỉ có quốc gia → tỉnh, không qua miền).
   */
  findAll(key: GeoKey, parentId?: number, countryId?: number): Promise<GeoRow[]> {
    const where = {
      isDeleted: false,
      ...(parentId !== undefined
        ? { [GEO_LEVELS[key].parentColumn]: parentId }
        : {}),
      ...(key === 'province' && countryId !== undefined
        ? { region: { countryId } }
        : {}),
    };
    switch (key) {
      case 'country':
        return this.prisma.country.findMany({ where, orderBy: { id: 'asc' } });
      case 'region':
        return this.prisma.region.findMany({ where, orderBy: { id: 'asc' } });
      case 'province':
        return this.prisma.province.findMany({ where, orderBy: { id: 'asc' } });
      case 'ward':
        return this.prisma.ward.findMany({ where, orderBy: { id: 'asc' } });
    }
  }

  private async findUnique(key: GeoKey, id: number): Promise<GeoRow | null> {
    switch (key) {
      case 'country':
        return this.prisma.country.findUnique({ where: { id } });
      case 'region':
        return this.prisma.region.findUnique({ where: { id } });
      case 'province':
        return this.prisma.province.findUnique({ where: { id } });
      case 'ward':
        return this.prisma.ward.findUnique({ where: { id } });
    }
  }

  async findOne(key: GeoKey, id: number): Promise<GeoRow> {
    const row = await this.findUnique(key, id);
    if (!row || row.isDeleted) {
      throw new NotFoundException(
        `${GEO_LEVELS[key].label} #${id} không tồn tại.`,
      );
    }
    return row;
  }

  /** Tầng con bắt buộc phải có tầng trên (VD miền phải thuộc 1 quốc gia). */
  private async assertParent(key: GeoKey, parentId: number | undefined) {
    const parentKey = GEO_LEVELS[key].parentKey;
    if (!parentKey) {
      if (parentId !== undefined) {
        throw new BadRequestException(
          `${GEO_LEVELS[key].label} không có tầng trên.`,
        );
      }
      return;
    }
    if (parentId === undefined) {
      throw new BadRequestException(
        `${GEO_LEVELS[key].label} phải thuộc một ${GEO_LEVELS[parentKey].label}.`,
      );
    }
    await this.findOne(parentKey, parentId);
  }

  async create(key: GeoKey, dto: CreateGeoDto) {
    await this.assertParent(key, dto.parentId);
    const data = { name: dto.name, code: dto.code } as never;
    const parent =
      dto.parentId !== undefined
        ? { [GEO_LEVELS[key].parentColumn]: dto.parentId }
        : {};
    switch (key) {
      case 'country':
        return this.prisma.country.create({ data });
      case 'region':
        return this.prisma.region.create({
          data: { ...(data as object), ...parent } as never,
        });
      case 'province':
        return this.prisma.province.create({
          data: { ...(data as object), ...parent } as never,
        });
      case 'ward':
        return this.prisma.ward.create({
          data: { ...(data as object), ...parent } as never,
        });
    }
  }

  async update(key: GeoKey, id: number, dto: UpdateGeoDto) {
    await this.findOne(key, id);
    const data = { ...dto };
    delete (data as { parentId?: number }).parentId;
    const parent =
      dto.parentId !== undefined
        ? { [GEO_LEVELS[key].parentColumn]: dto.parentId }
        : {};
    if (dto.parentId !== undefined) await this.assertParent(key, dto.parentId);
    const payload = { ...(data as object), ...parent } as never;
    switch (key) {
      case 'country':
        return this.prisma.country.update({ where: { id }, data: payload });
      case 'region':
        return this.prisma.region.update({ where: { id }, data: payload });
      case 'province':
        return this.prisma.province.update({ where: { id }, data: payload });
      case 'ward':
        return this.prisma.ward.update({ where: { id }, data: payload });
    }
  }

  async remove(key: GeoKey, id: number) {
    await this.findOne(key, id);
    const data = { isDeleted: true };
    switch (key) {
      case 'country':
        return this.prisma.country.update({ where: { id }, data });
      case 'region':
        return this.prisma.region.update({ where: { id }, data });
      case 'province':
        return this.prisma.province.update({ where: { id }, data });
      case 'ward':
        return this.prisma.ward.update({ where: { id }, data });
    }
  }
}
