import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateMasterplanCategoryDto } from './dto/create-masterplan.dto.js';
import type { UpdateMasterplanCategoryDto } from './dto/update-masterplan.dto.js';

const categoryInclude = {
  tasks: { where: { isDeleted: false } },
} as const;

@Injectable()
export class MasterplanCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(systemId?: number, includeDeleted = false) {
    return this.prisma.masterplanCategory.findMany({
      where: {
        ...(systemId !== undefined ? { systemId } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: categoryInclude,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.masterplanCategory.findUnique({
      where: { id },
      include: categoryInclude,
    });
    if (!category || category.isDeleted) {
      throw new NotFoundException(`MasterplanCategory #${id} không tồn tại.`);
    }
    return category;
  }

  async create(dto: CreateMasterplanCategoryDto) {
    const system = await this.prisma.masterplanSystem.findUnique({
      where: { id: dto.systemId },
    });
    if (!system || system.isDeleted) {
      throw new NotFoundException(`MasterplanSystem #${dto.systemId} không tồn tại.`);
    }
    return this.prisma.masterplanCategory.create({
      data: dto,
      include: categoryInclude,
    });
  }

  async update(id: number, dto: UpdateMasterplanCategoryDto) {
    const category = await this.findOne(id);
    if (dto.systemId !== undefined && dto.systemId !== category.systemId) {
      const system = await this.prisma.masterplanSystem.findUnique({
        where: { id: dto.systemId },
      });
      if (!system || system.isDeleted) {
        throw new NotFoundException(`MasterplanSystem #${dto.systemId} không tồn tại.`);
      }
    }
    return this.prisma.masterplanCategory.update({
      where: { id },
      data: dto,
      include: categoryInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.masterplanTask.updateMany({
        where: { categoryId: id },
        data: { isDeleted: true },
      }),
      this.prisma.masterplanCategory.update({ where: { id }, data: { isDeleted: true } }),
    ]);
    return { deleted: true };
  }

  async restore(id: number) {
    const category = await this.prisma.masterplanCategory.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`MasterplanCategory #${id} không tồn tại.`);
    }
    await this.prisma.$transaction([
      this.prisma.masterplanCategory.update({ where: { id }, data: { isDeleted: false } }),
      this.prisma.masterplanTask.updateMany({
        where: { categoryId: id },
        data: { isDeleted: false },
      }),
    ]);
    return { restored: true };
  }
}
