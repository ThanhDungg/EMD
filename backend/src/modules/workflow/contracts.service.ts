import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toDateOnly } from '../../common/datetime.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateContractDto } from './dto/create-contract.dto.js';
import type { CreateContractDocumentDto } from './dto/contract-document.dto.js';
import type { UpdateContractDocumentDto } from './dto/update-contract-document.dto.js';
import type { UpdateContractDto } from './dto/update-contract.dto.js';
import { ContractTermType } from '../../generated/prisma/client.js';

const contractInclude = {
  serviceType: { select: { id: true, name: true } },
  siteLinks: {
    include: { site: { select: { id: true, code: true, name: true } } },
    orderBy: { id: 'asc' },
  },
  documents: {
    where: { isDeleted: false },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.ContractInclude;

/** Hợp đồng (khai báo master data) — thuộc nhiều dự án.
 * Dữ liệu nhiều-nhiều nằm ở bảng contract_sites: client gửi mảng `siteIds`,
 * service đồng bộ trong 1 transaction (xoá liên kết bị bỏ chọn, thêm cái mới).
 * Kèm bảng đường dẫn tài liệu `contract_documents`. */
@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.contract.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      orderBy: { id: 'desc' },
      include: contractInclude,
    });
  }

  async findOne(id: number) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, isDeleted: false },
      include: contractInclude,
    });
    if (!contract) {
      throw new NotFoundException(`Hợp đồng #${id} không tồn tại.`);
    }
    return contract;
  }

  /** Ngày: hợp đồng có thời hạn phải có ngày kết thúc và không kết thúc trước
   * ngày bắt đầu. */
  private assertDates(dto: CreateContractDto | UpdateContractDto): void {
    const start = dto.startDate ? toDateOnly(dto.startDate) : undefined;
    const end = dto.endDate ? toDateOnly(dto.endDate) : undefined;
    if (dto.termType === ContractTermType.TERM && dto.endDate === undefined) {
      throw new BadRequestException(
        'Hợp đồng có thời hạn phải có ngày kết thúc.',
      );
    }
    if (start && end && end < start) {
      throw new BadRequestException(
        'Ngày kết thúc phải sau ngày bắt đầu hợp đồng.',
      );
    }
  }

  private async assertSites(siteIds: number[]): Promise<void> {
    if (siteIds.length === 0) return;
    const found = await this.prisma.site.findMany({
      where: { id: { in: siteIds }, isDeleted: false },
      select: { id: true },
    });
    if (found.length !== siteIds.length) {
      const okIds = new Set(found.map((s) => s.id));
      const missing = siteIds.filter((id) => !okIds.has(id));
      throw new BadRequestException(`Dự án không tồn tại: ${missing.join(', ')}.`);
    }
  }

  private toData(
    dto: CreateContractDto | UpdateContractDto,
  ): Prisma.ContractUncheckedUpdateInput {
    const { startDate, endDate, siteIds: _siteIds, ...rest } = dto;
    return {
      ...rest,
      ...(startDate !== undefined
        ? { startDate: startDate ? toDateOnly(startDate) : null }
        : {}),
      ...(endDate !== undefined
        ? { endDate: endDate ? toDateOnly(endDate) : null }
        : {}),
    };
  }

  async create(dto: CreateContractDto) {
    this.assertDates(dto);
    const { siteIds } = dto;
    const ids = siteIds ?? [];
    await this.assertSites(ids);
    return this.prisma.contract.create({
      data: {
        ...(this.toData(dto) as Prisma.ContractUncheckedCreateInput),
        ...(ids.length
          ? { siteLinks: { create: ids.map((siteId) => ({ siteId })) } }
          : {}),
      },
      include: contractInclude,
    });
  }

  async update(id: number, dto: UpdateContractDto) {
    await this.findOne(id);
    this.assertDates(dto);
    const { siteIds } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (siteIds) {
        await this.assertSites(siteIds);
        const current = await tx.contractSite.findMany({
          where: { contractId: id },
          select: { id: true, siteId: true },
        });
        const keep = new Set(siteIds);
        const remove = current.filter((l) => !keep.has(l.siteId)).map((l) => l.id);
        if (remove.length) {
          await tx.contractSite.deleteMany({ where: { id: { in: remove } } });
        }
        const exists = new Set(current.map((l) => l.siteId));
        const add = siteIds.filter((siteId) => !exists.has(siteId));
        if (add.length) {
          await tx.contractSite.createMany({
            data: add.map((siteId) => ({ contractId: id, siteId })),
          });
        }
      }
      return tx.contract.update({
        where: { id },
        data: this.toData(dto),
        include: contractInclude,
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.contract.update({
      where: { id },
      data: { isDeleted: true },
      include: contractInclude,
    });
  }

  async restore(id: number) {
    const contract = await this.prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      throw new NotFoundException(`Hợp đồng #${id} không tồn tại.`);
    }
    return this.prisma.contract.update({
      where: { id },
      data: { isDeleted: false },
      include: contractInclude,
    });
  }

  // ---------- Đường dẫn tài liệu của hợp đồng ----------

  async addDocument(id: number, dto: CreateContractDocumentDto) {
    await this.findOne(id);
    return this.prisma.contractDocument.create({
      data: {
        contractId: id,
        name: dto.name.trim(),
        path: dto.path.trim(),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  private async findDocument(id: number) {
    const doc = await this.prisma.contractDocument.findFirst({
      where: { id, isDeleted: false },
    });
    if (!doc) {
      throw new NotFoundException(`Tài liệu #${id} không tồn tại.`);
    }
    return doc;
  }

  async updateDocument(
    docId: number,
    dto: UpdateContractDocumentDto,
  ): Promise<unknown> {
    await this.findDocument(docId);
    return this.prisma.contractDocument.update({
      where: { id: docId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.path !== undefined ? { path: dto.path.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async removeDocument(docId: number): Promise<unknown> {
    await this.findDocument(docId);
    return this.prisma.contractDocument.update({
      where: { id: docId },
      data: { isDeleted: true },
    });
  }
}
