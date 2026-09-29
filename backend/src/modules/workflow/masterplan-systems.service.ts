import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateMasterplanSystemDto } from './dto/create-masterplan.dto.js';
import type { UpdateMasterplanSystemDto } from './dto/update-masterplan.dto.js';
import { WorksService } from './works.service.js';

// Include cây full: system → hạng mục → công việc (lọc bản chưa xoá)
const systemInclude = {
  categories: {
    where: { isDeleted: false },
    include: { tasks: { where: { isDeleted: false } } },
  },
} as const;

@Injectable()
export class MasterplanSystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly worksService: WorksService,
  ) {}

  findAll(workId?: number, includeDeleted = false) {
    return this.prisma.masterplanSystem.findMany({
      where: {
        ...(workId !== undefined ? { workId } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: systemInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const system = await this.prisma.masterplanSystem.findUnique({
      where: { id },
      include: systemInclude,
    });
    if (!system || system.isDeleted) {
      throw new NotFoundException(`MasterplanSystem #${id} không tồn tại.`);
    }
    return system;
  }

  async create(dto: CreateMasterplanSystemDto) {
    if (dto.workId !== undefined) {
      await this.worksService.findOne(dto.workId);
    }
    return this.prisma.masterplanSystem.create({
      data: dto,
      include: systemInclude,
    });
  }

  async update(id: number, dto: UpdateMasterplanSystemDto) {
    await this.findOne(id);
    if (dto.workId !== undefined) {
      await this.worksService.findOne(dto.workId);
    }
    return this.prisma.masterplanSystem.update({
      where: { id },
      data: dto,
      include: systemInclude,
    });
  }

  // Xoá mềm cả hạng mục + công việc bên trong
  async remove(id: number) {
    await this.findOne(id);
    const categories = await this.prisma.masterplanCategory.findMany({
      where: { systemId: id },
      select: { id: true },
    });
    const categoryIds = categories.map((c) => c.id);
    await this.prisma.$transaction([
      this.prisma.masterplanTask.updateMany({
        where: { categoryId: { in: categoryIds } },
        data: { isDeleted: true },
      }),
      this.prisma.masterplanCategory.updateMany({
        where: { id: { in: categoryIds } },
        data: { isDeleted: true },
      }),
      this.prisma.masterplanSystem.update({ where: { id }, data: { isDeleted: true } }),
    ]);
    return { deleted: true };
  }

  async restore(id: number) {
    const system = await this.prisma.masterplanSystem.findUnique({ where: { id } });
    if (!system) throw new NotFoundException(`MasterplanSystem #${id} không tồn tại.`);
    const categories = await this.prisma.masterplanCategory.findMany({
      where: { systemId: id },
      select: { id: true },
    });
    const categoryIds = categories.map((c) => c.id);
    await this.prisma.$transaction([
      this.prisma.masterplanSystem.update({ where: { id }, data: { isDeleted: false } }),
      this.prisma.masterplanCategory.updateMany({
        where: { id: { in: categoryIds } },
        data: { isDeleted: false },
      }),
      this.prisma.masterplanTask.updateMany({
        where: { categoryId: { in: categoryIds } },
        data: { isDeleted: false },
      }),
    ]);
    return { restored: true };
  }
}
