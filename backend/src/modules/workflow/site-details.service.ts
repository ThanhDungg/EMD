import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateSiteDetailDto,
  SiteDetailKind,
} from './dto/site-detail.dto.js';
import type { UpdateSiteDetailDto } from './dto/update-site-detail.dto.js';
import { SitesService } from './sites.service.js';

// 5 bảng con theo dự án đều là (siteId + vài field) nên dùng chung 1 service,
// phân biệt bằng `kind` (giống droplists). Dữ liệu trả về đã join sẵn phần
// cần hiển thị: nhân viên lấy từ users (tên/email/sđt/chức vụ).
export const SITE_DETAIL_KINDS: Record<
  SiteDetailKind,
  { label: string; table: string }
> = {
  members: { label: 'Nhân viên của dự án', table: 'site_members' },
  serviceProviders: {
    label: 'Nhà cung cấp dịch vụ',
    table: 'site_service_providers',
  },
  contractors: { label: 'Nhà thầu', table: 'site_contractors' },
  partnerContacts: {
    label: 'Thông tin liên lạc đối tác',
    table: 'site_partner_contacts',
  },
  units: { label: 'Unit', table: 'site_units' },
};

const memberSelect = {
  id: true,
  user: {
    select: {
      id: true,
      accountName: true,
      fullName: true,
      email: true,
      phone: true,
      internalPhone: true,
      position: { select: { name: true } },
    },
  },
} as const;

const partnerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
} as const;

const unitSelect = {
  id: true,
  code: true,
  name: true,
  area: true,
  status: true,
  notes: true,
} as const;

export type SiteDetailRow = Record<string, unknown> & { id: number };

@Injectable()
export class SiteDetailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sitesService: SitesService,
  ) {}

  findAll(kind: SiteDetailKind, siteId: number): Promise<SiteDetailRow[]> {
    const where = { siteId, isDeleted: false };
    switch (kind) {
      case 'members':
        return this.prisma.siteMember.findMany({
          where,
          select: memberSelect,
          orderBy: { id: 'asc' },
        }) as never;
      case 'serviceProviders':
        return this.prisma.siteServiceProvider.findMany({
          where,
          select: partnerSelect,
          orderBy: { id: 'asc' },
        }) as never;
      case 'contractors':
        return this.prisma.siteContractor.findMany({
          where,
          select: partnerSelect,
          orderBy: { id: 'asc' },
        }) as never;
      case 'partnerContacts':
        return this.prisma.sitePartnerContact.findMany({
          where,
          select: partnerSelect,
          orderBy: { id: 'asc' },
        }) as never;
      case 'units':
        return this.prisma.siteUnit.findMany({
          where,
          select: unitSelect,
          orderBy: { id: 'asc' },
        }) as never;
    }
  }

  async create(
    kind: SiteDetailKind,
    dto: CreateSiteDetailDto,
  ): Promise<SiteDetailRow> {
    await this.sitesService.findOne(dto.siteId);
    const { siteId, ...rest } = dto;
    // Prisma có 2 biến thể input (checked/unchecked) — ép kiểu 1 lần ở đây.
    const data = { siteId, ...rest } as never;
    switch (kind) {
      case 'members':
        return this.prisma.siteMember.create({
          data,
          select: memberSelect,
        }) as never;
      case 'serviceProviders':
        return this.prisma.siteServiceProvider.create({
          data,
          select: partnerSelect,
        }) as never;
      case 'contractors':
        return this.prisma.siteContractor.create({
          data,
          select: partnerSelect,
        }) as never;
      case 'partnerContacts':
        return this.prisma.sitePartnerContact.create({
          data,
          select: partnerSelect,
        }) as never;
      case 'units':
        return this.prisma.siteUnit.create({
          data,
          select: unitSelect,
        }) as never;
    }
  }

  async findOne(kind: SiteDetailKind, id: number): Promise<SiteDetailRow> {
    const where = { id, isDeleted: false };
    const row =
      kind === 'members'
        ? await this.prisma.siteMember.findFirst({
            where,
            select: memberSelect,
          })
        : kind === 'serviceProviders'
          ? await this.prisma.siteServiceProvider.findFirst({
              where,
              select: partnerSelect,
            })
          : kind === 'contractors'
            ? await this.prisma.siteContractor.findFirst({
                where,
                select: partnerSelect,
              })
            : kind === 'partnerContacts'
              ? await this.prisma.sitePartnerContact.findFirst({
                  where,
                  select: partnerSelect,
                })
              : await this.prisma.siteUnit.findFirst({
                  where,
                  select: unitSelect,
                });
    if (!row) {
      throw new NotFoundException(
        `${SITE_DETAIL_KINDS[kind].label} #${id} không tồn tại.`,
      );
    }
    return row as never;
  }

  async update(
    kind: SiteDetailKind,
    id: number,
    dto: UpdateSiteDetailDto,
  ): Promise<SiteDetailRow> {
    await this.findOne(kind, id);
    const { siteId: _siteId, ...rest } = dto;
    const data = rest as never;
    switch (kind) {
      case 'members':
        return this.prisma.siteMember.update({
          where: { id },
          data,
          select: memberSelect,
        }) as never;
      case 'serviceProviders':
        return this.prisma.siteServiceProvider.update({
          where: { id },
          data,
          select: partnerSelect,
        }) as never;
      case 'contractors':
        return this.prisma.siteContractor.update({
          where: { id },
          data,
          select: partnerSelect,
        }) as never;
      case 'partnerContacts':
        return this.prisma.sitePartnerContact.update({
          where: { id },
          data,
          select: partnerSelect,
        }) as never;
      case 'units':
        return this.prisma.siteUnit.update({
          where: { id },
          data,
          select: unitSelect,
        }) as never;
    }
  }

  async remove(kind: SiteDetailKind, id: number) {
    await this.findOne(kind, id);
    switch (kind) {
      case 'members':
        return this.prisma.siteMember.update({
          where: { id },
          data: { isDeleted: true },
        });
      case 'serviceProviders':
        return this.prisma.siteServiceProvider.update({
          where: { id },
          data: { isDeleted: true },
        });
      case 'contractors':
        return this.prisma.siteContractor.update({
          where: { id },
          data: { isDeleted: true },
        });
      case 'partnerContacts':
        return this.prisma.sitePartnerContact.update({
          where: { id },
          data: { isDeleted: true },
        });
      case 'units':
        return this.prisma.siteUnit.update({
          where: { id },
          data: { isDeleted: true },
        });
    }
  }
}
