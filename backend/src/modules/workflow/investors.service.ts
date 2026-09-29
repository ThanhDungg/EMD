import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateInvestorDto } from './dto/create-investor.dto.js';
import { assertGeoChain3 } from './dto/geo-chain.util.js';
import type { UpdateInvestorDto } from './dto/update-investor.dto.js';

const investorInclude = {
  investorGroup: { select: { id: true, code: true, name: true, shortName: true } },
  country: { select: { id: true, name: true } },
  province: { select: { id: true, name: true } },
  ward: { select: { id: true, name: true } },
} as const;

// Chủ đầu tư (khai báo master data). Trước đây chỉ là droplist (code + name),
// nay là hồ sơ đầy đủ; hồ sơ dự án vẫn chọn qua droplist key `investor`.
// Chủ đầu tư cha là droplist riêng: key `investorGroup`.
@Injectable()
export class InvestorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.investor.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      orderBy: { id: 'asc' },
      include: investorInclude,
    });
  }

  async findOne(id: number) {
    const investor = await this.prisma.investor.findFirst({
      where: { id, isDeleted: false },
      include: investorInclude,
    });
    if (!investor) {
      throw new NotFoundException(`Chủ đầu tư #${id} không tồn tại.`);
    }
    return investor;
  }

  async create(dto: CreateInvestorDto) {
    await assertGeoChain3(this.prisma, dto);
    return this.prisma.investor.create({
      data: dto as never,
      include: investorInclude,
    });
  }

  async update(id: number, dto: UpdateInvestorDto) {
    await this.findOne(id);
    await assertGeoChain3(this.prisma, dto);
    return this.prisma.investor.update({
      where: { id },
      data: dto as never,
      include: investorInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.investor.update({
      where: { id },
      data: { isDeleted: true },
      include: investorInclude,
    });
  }

  async restore(id: number) {
    const investor = await this.prisma.investor.findUnique({ where: { id } });
    if (!investor) {
      throw new NotFoundException(`Chủ đầu tư #${id} không tồn tại.`);
    }
    return this.prisma.investor.update({
      where: { id },
      data: { isDeleted: false },
      include: investorInclude,
    });
  }
}
