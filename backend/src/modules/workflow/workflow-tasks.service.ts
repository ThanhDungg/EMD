import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { toDateTimeInput } from '../../common/datetime.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateWorkflowTaskDto } from './dto/create-workflow-task.dto.js';
import type { UpdateWorkflowTaskDto } from './dto/update-workflow-task.dto.js';

const userSelect = {
  id: true,
  accountName: true,
  fullName: true,
  email: true,
} as const;

const taskInclude = {
  category: true,
  assigner: { select: userSelect },
  assignee: { select: userSelect },
} satisfies Prisma.WorkflowTaskInclude;

export type TaskScope = 'assigned' | 'executed' | 'all';

export interface FindTasksFilter {
  scope?: TaskScope;
  meId: number;
  categoryId?: number;
  status?: Prisma.WorkflowTaskWhereInput['status'];
  includeDeleted?: boolean;
}

@Injectable()
export class WorkflowTasksService {
  constructor(private readonly prisma: PrismaService) {}

  // Tab "Công việc của tôi": scope=assigned (tôi giao) | executed (tôi thực hiện)
  findAll(filter: FindTasksFilter) {
    const { scope = 'all', meId, categoryId, status, includeDeleted = false } = filter;
    return this.prisma.workflowTask.findMany({
      where: {
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(scope === 'assigned' ? { assignerId: meId } : {}),
        ...(scope === 'executed' ? { assigneeId: meId } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(status ? { status } : {}),
      },
      include: taskInclude,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id },
      include: taskInclude,
    });
    if (!task || task.isDeleted) {
      throw new NotFoundException(`WorkflowTask #${id} không tồn tại.`);
    }
    return task;
  }

  // Người giao = user đang đăng nhập (tự gắn, không nhận từ client)
  create(dto: CreateWorkflowTaskDto, assignerId: number) {
    const { categoryId, assigneeId, dueDate, ...rest } = dto;
    return this.prisma.workflowTask.create({
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: toDateTimeInput(dueDate) } : {}),
        category: { connect: { id: categoryId } },
        assigner: { connect: { id: assignerId } },
        ...(assigneeId ? { assignee: { connect: { id: assigneeId } } } : {}),
      },
      include: taskInclude,
    });
  }

  // Chỉ người giao, người thực hiện (hoặc ADMIN) được sửa
  async update(id: number, dto: UpdateWorkflowTaskDto, meId: number, isAdmin: boolean) {
    const task = await this.findOne(id);
    const involved = task.assignerId === meId || task.assigneeId === meId;
    if (!involved && !isAdmin) {
      throw new ForbiddenException('Chỉ người giao, người thực hiện hoặc ADMIN được sửa.');
    }
    const { categoryId, assigneeId, dueDate, ...rest } = dto;
    return this.prisma.workflowTask.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: toDateTimeInput(dueDate) } : {}),
        ...(categoryId !== undefined ? { category: { connect: { id: categoryId } } } : {}),
        ...(assigneeId !== undefined
          ? { assignee: { connect: { id: assigneeId } } }
          : {}),
      },
      include: taskInclude,
    });
  }

  async remove(id: number, meId: number, isAdmin: boolean) {
    const task = await this.findOne(id);
    const involved = task.assignerId === meId || task.assigneeId === meId;
    if (!involved && !isAdmin) {
      throw new ForbiddenException('Chỉ người giao, người thực hiện hoặc ADMIN được xoá.');
    }
    return this.prisma.workflowTask.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
