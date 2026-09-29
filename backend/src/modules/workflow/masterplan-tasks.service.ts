import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateMasterplanTaskDto } from './dto/create-masterplan.dto.js';
import type { UpdateMasterplanTaskDto } from './dto/update-masterplan.dto.js';

@Injectable()
export class MasterplanTasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(categoryId?: number, includeDeleted = false) {
    return this.prisma.masterplanTask.findMany({
      where: {
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.masterplanTask.findUnique({ where: { id } });
    if (!task || task.isDeleted) {
      throw new NotFoundException(`MasterplanTask #${id} không tồn tại.`);
    }
    return task;
  }

  async create(dto: CreateMasterplanTaskDto) {
    const category = await this.prisma.masterplanCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || category.isDeleted) {
      throw new NotFoundException(`MasterplanCategory #${dto.categoryId} không tồn tại.`);
    }
    const { categoryId, planData, ...rest } = dto;
    return this.prisma.masterplanTask.create({
      data: {
        ...rest,
        category: { connect: { id: categoryId } },
        ...(planData !== undefined
          ? { planData: planData as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async update(id: number, dto: UpdateMasterplanTaskDto) {
    await this.findOne(id);
    if (dto.categoryId !== undefined) {
      const category = await this.prisma.masterplanCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.isDeleted) {
        throw new NotFoundException(`MasterplanCategory #${dto.categoryId} không tồn tại.`);
      }
    }
    const { categoryId, planData, ...rest } = dto;
    return this.prisma.masterplanTask.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryId !== undefined ? { category: { connect: { id: categoryId } } } : {}),
        ...(planData !== undefined
          ? { planData: planData as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.masterplanTask.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    const task = await this.prisma.masterplanTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException(`MasterplanTask #${id} không tồn tại.`);
    return this.prisma.masterplanTask.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
