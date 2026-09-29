import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateWorkflowCategoryDto } from './dto/create-workflow-category.dto.js';
import type { UpdateWorkflowCategoryDto } from './dto/update-workflow-category.dto.js';

@Injectable()
export class WorkflowCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.workflowCategory.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      include: {
        // Bộ status riêng của từng loại (FE dùng đổ dropdown + chips lọc)
        statuses: {
          where: includeDeleted ? undefined : { isDeleted: false },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const category = await this.prisma.workflowCategory.findUnique({
      where: { id },
      include: {
        statuses: {
          where: includeDeleted ? undefined : { isDeleted: false },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!category || (!includeDeleted && category.isDeleted)) {
      throw new NotFoundException(`WorkflowCategory #${id} không tồn tại.`);
    }
    return category;
  }

  create(dto: CreateWorkflowCategoryDto) {
    return this.prisma.workflowCategory.create({ data: dto });
  }

  async update(id: number, dto: UpdateWorkflowCategoryDto) {
    await this.findOne(id, true);
    return this.prisma.workflowCategory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Xoá mềm cả bộ status của loại (work cũ vẫn giữ statusId để hiển thị)
    await this.prisma.workflowStatus.updateMany({
      where: { categoryId: id, isDeleted: false },
      data: { isDeleted: true },
    });
    return this.prisma.workflowCategory.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    await this.prisma.workflowStatus.updateMany({
      where: { categoryId: id, isDeleted: true },
      data: { isDeleted: false },
    });
    return this.prisma.workflowCategory.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
