import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateContractorDto } from './dto/create-contractor.dto.js';
import { assertGeoChain3 } from './dto/geo-chain.util.js';
import type { UpdateContractorDto } from './dto/update-contractor.dto.js';

const contractorInclude = {
  contractorType: { select: { id: true, code: true, name: true } },
  service: { select: { id: true, name: true } },
  country: { select: { id: true, name: true } },
  province: { select: { id: true, name: true } },
  ward: { select: { id: true, name: true } },
} as const;

// Nhà thầu (khai báo master data). Khác với `site_contractors` (bảng con ghi
// nhà thầu của 1 dự án) — bảng này là danh mục nhà thầu dùng chung.
@Injectable()
export class ContractorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.contractor.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      orderBy: { id: 'asc' },
      include: contractorInclude,
    });
  }

  async findOne(id: number) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id, isDeleted: false },
      include: contractorInclude,
    });
    if (!contractor) {
      throw new NotFoundException(`Nhà thầu #${id} không tồn tại.`);
    }
    return contractor;
  }

  async create(dto: CreateContractorDto) {
    await assertGeoChain3(this.prisma, dto);
    return this.prisma.contractor.create({
      data: dto as never,
      include: contractorInclude,
    });
  }

  async update(id: number, dto: UpdateContractorDto) {
    await this.findOne(id);
    await assertGeoChain3(this.prisma, dto);
    return this.prisma.contractor.update({
      where: { id },
      data: dto as never,
      include: contractorInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.contractor.update({
      where: { id },
      data: { isDeleted: true },
      include: contractorInclude,
    });
  }

  async restore(id: number) {
    const contractor = await this.prisma.contractor.findUnique({ where: { id } });
    if (!contractor) {
      throw new NotFoundException(`Nhà thầu #${id} không tồn tại.`);
    }
    return this.prisma.contractor.update({
      where: { id },
      data: { isDeleted: false },
      include: contractorInclude,
    });
  }
}
