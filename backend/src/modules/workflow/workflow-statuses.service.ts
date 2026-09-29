import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateWorkflowStatusDto } from './dto/create-workflow-status.dto.js';
import type { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto.js';

const statusOrder = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

@Injectable()
export class WorkflowStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(categoryId?: number, includeDeleted = false) {
    return this.prisma.workflowStatus.findMany({
      where: {
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, vnName: true, code: true } } },
      orderBy: [...statusOrder],
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const status = await this.prisma.workflowStatus.findUnique({ where: { id } });
    if (!status || (!includeDeleted && status.isDeleted)) {
      throw new NotFoundException(`WorkflowStatus #${id} không tồn tại.`);
    }
    return status;
  }

  async create(dto: CreateWorkflowStatusDto) {
    const category = await this.prisma.workflowCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || category.isDeleted) {
      throw new NotFoundException(`WorkflowCategory #${dto.categoryId} không tồn tại.`);
    }
    return this.prisma.workflowStatus.create({ data: dto });
  }

  async update(id: number, dto: UpdateWorkflowStatusDto) {
    const status = await this.findOne(id, true);
    // Không cho chuyển status sang loại khác khi đã có work đang dùng
    // (sẽ làm work trỏ tới status không thuộc loại của nó).
    if (dto.categoryId !== undefined && dto.categoryId !== status.categoryId) {
      const used = await this.prisma.work.count({ where: { statusId: id } });
      if (used > 0) {
        throw new BadRequestException(
          `Status đang được ${used} công việc dùng, không thể chuyển sang loại khác.`,
        );
      }
    }
    return this.prisma.workflowStatus.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const status = await this.findOne(id);
    // Status đang có work dùng thì không xoá (tránh work mất trạng thái).
    // Work trỏ status đã xoá mềm vẫn hiển thị bình thường.
    const used = await this.prisma.work.count({
      where: { statusId: id, isDeleted: false },
    });
    if (used > 0) {
      throw new BadRequestException(
        `Status đang được ${used} công việc dùng, không thể xoá. Hãy chuyển các công việc sang status khác trước.`,
      );
    }
    return this.prisma.workflowStatus.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.workflowStatus.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
