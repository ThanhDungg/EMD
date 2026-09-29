import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';
import { assertCustomerGeoChain } from './dto/customer-geo.util.js';
import type { UpdateCustomerDto } from './dto/update-customer.dto.js';

const customerInclude = {
  country: { select: { id: true, name: true } },
  province: { select: { id: true, name: true } },
  ward: { select: { id: true, name: true } },
  factory: { select: { id: true, name: true } },
  siteLinks: {
    include: { site: { select: { id: true, code: true, name: true } } },
    orderBy: { id: 'asc' },
  },
} as const;

// Khách hàng (danh mục kiểm tra năng lượng) — thuộc nhiều dự án.
// Dữ liệu quan hệ nhiều-nhiều nằm ở bảng customer_sites: client gửi mảng
// `siteIds`, service đồng bộ (xoá các liên kết không còn, thêm các liên kết
// mới) trong 1 transaction.
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.customer.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      orderBy: { id: 'desc' },
      include: customerInclude,
    });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, isDeleted: false },
      include: customerInclude,
    });
    if (!customer) {
      throw new NotFoundException(`Khách hàng #${id} không tồn tại.`);
    }
    return customer;
  }

  /** Kiểm tra danh sách id dự án trước khi lưu quan hệ nhiều-nhiều. */
  private async assertSites(siteIds: number[]): Promise<void> {
    if (siteIds.length === 0) return;
    const found = await this.prisma.site.findMany({
      where: { id: { in: siteIds }, isDeleted: false },
      select: { id: true },
    });
    if (found.length !== siteIds.length) {
      const okIds = new Set(found.map((s) => s.id));
      const missing = siteIds.filter((id) => !okIds.has(id));
      throw new BadRequestException(
        `Dự án không tồn tại: ${missing.join(', ')}.`,
      );
    }
  }

  async create(dto: CreateCustomerDto) {
    await assertCustomerGeoChain(this.prisma, dto);
    const { siteIds, ...data } = dto;
    const ids = siteIds ?? [];
    await this.assertSites(ids);
    return this.prisma.customer.create({
      data: {
        ...data,
        ...(ids.length
          ? { siteLinks: { create: ids.map((siteId) => ({ siteId })) } }
          : {}),
      },
      include: customerInclude,
    });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    await assertCustomerGeoChain(this.prisma, dto);
    const { siteIds, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (siteIds) {
        await this.assertSites(siteIds);
        // Đồng bộ quan hệ nhiều-nhiều: giữ các liên kết chưa đổi, xoá liên kết
        // bị bỏ chọn, thêm liên kết mới.
        const current = await tx.customerSite.findMany({
          where: { customerId: id },
          select: { id: true, siteId: true },
        });
        const keep = new Set(siteIds);
        const remove = current.filter((l) => !keep.has(l.siteId)).map((l) => l.id);
        if (remove.length) {
          await tx.customerSite.deleteMany({ where: { id: { in: remove } } });
        }
        const exists = new Set(current.map((l) => l.siteId));
        const add = siteIds.filter((siteId) => !exists.has(siteId));
        if (add.length) {
          await tx.customerSite.createMany({
            data: add.map((siteId) => ({ customerId: id, siteId })),
          });
        }
      }
      return tx.customer.update({
        where: { id },
        data,
        include: customerInclude,
      });
    });
  }

  /** Xoá mềm: bảng nối customer_sites giữ nguyên (khôi phục được). */
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { isDeleted: true },
      include: customerInclude,
    });
  }

  async restore(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Khách hàng #${id} không tồn tại.`);
    }
    return this.prisma.customer.update({
      where: { id },
      data: { isDeleted: false },
      include: customerInclude,
    });
  }
}
