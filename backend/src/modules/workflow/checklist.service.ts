import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toDateTimeInput } from '../../common/datetime.js';
import type { ChecklistItem } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateChecklistItemDto } from './dto/create-checklist-item.dto.js';
import type { UpdateChecklistItemDto } from './dto/update-checklist-item.dto.js';
import { WorksService } from './works.service.js';

export interface ChecklistTreeNode extends ChecklistItem {
  children: ChecklistTreeNode[];
}

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly worksService: WorksService,
  ) {}

  // --- Helpers ---

  /** Dựng cây cha-con từ danh sách phẳng (sắp xếp theo sortOrder) */
  private toTree(items: ChecklistItem[]): ChecklistTreeNode[] {
    const byId = new Map<number, ChecklistTreeNode>();
    for (const item of items) {
      byId.set(item.id, { ...item, children: [] });
    }
    const roots: ChecklistTreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId !== null && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sort = (nodes: ChecklistTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      for (const n of nodes) sort(n.children);
    };
    sort(roots);
    return roots;
  }

  /** Thu thập id của node + toàn bộ hậu duệ (để xoá/khôi phục cascade) */
  private async collectSubtreeIds(rootId: number): Promise<number[]> {
    const ids = [rootId];
    const queue = [rootId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await this.prisma.checklistItem.findMany({
        where: { parentId: current },
        select: { id: true },
      });
      for (const c of children) {
        ids.push(c.id);
        queue.push(c.id);
      }
    }
    return ids;
  }

  // --- Queries ---

  /** Trả cây checklist của 1 work (hoặc toàn bộ khi không truyền workId).
   * unattached = true → chỉ các node mẫu độc lập (workId null): root là
   * danh mục mẫu, cây con là nội dung cha/con của mẫu đó. */
  async findTree(workId?: number, includeDeleted = false, unattached = false) {
    if (workId !== undefined) {
      await this.worksService.findOne(workId);
    }
    const items = await this.prisma.checklistItem.findMany({
      where: {
        ...(workId !== undefined ? { workId } : {}),
        ...(unattached ? { workId: null } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return this.toTree(items);
  }

  async findOne(id: number) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item || item.isDeleted) {
      throw new NotFoundException(`ChecklistItem #${id} không tồn tại.`);
    }
    return item;
  }

  // --- Mutations ---

  async create(dto: CreateChecklistItemDto) {
    // Client có thể gửi null (xoá FK) — chỉ tra khi có giá trị thật, nếu
    // không findUnique({ id: null }) là Prisma ném lỗi 500.
    if (dto.workId != null) {
      await this.worksService.findOne(dto.workId);
    }
    if (dto.parentId != null) {
      const parent = await this.prisma.checklistItem.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.isDeleted) {
        throw new NotFoundException(
          `ChecklistItem cha #${dto.parentId} không tồn tại.`,
        );
      }
      // Giữ cây trong cùng 1 work
      if ((parent.workId ?? null) !== (dto.workId ?? null)) {
        throw new BadRequestException(
          'Row con phải thuộc cùng work với row cha.',
        );
      }
    }
    return this.prisma.checklistItem.create({
      data: {
        ...dto,
        // Prisma 7 chỉ nhận ISO-8601 đầy đủ — DTO cho phép ngày rút gọn
        ...(dto.photoTakenAt !== undefined
          ? { photoTakenAt: toDateTimeInput(dto.photoTakenAt) }
          : {}),
      },
    });
  }

  async update(id: number, dto: UpdateChecklistItemDto) {
    const item = await this.findOne(id);
    if (dto.parentId != null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Row không thể là cha của chính nó.');
      }
      const parent = await this.prisma.checklistItem.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.isDeleted) {
        throw new NotFoundException(
          `ChecklistItem cha #${dto.parentId} không tồn tại.`,
        );
      }
      const nextWorkId = dto.workId != null ? dto.workId : item.workId;
      if ((parent.workId ?? null) !== (nextWorkId ?? null)) {
        throw new BadRequestException(
          'Row con phải thuộc cùng work với row cha.',
        );
      }
      // Không được đặt 1 row làm cha của chính hậu duệ của nó — sẽ tạo vòng lặp.
      const subtree = await this.collectSubtreeIds(id);
      if (subtree.includes(parent.id)) {
        throw new BadRequestException(
          'Không thể chuyển một row lên làm cha của chính hậu duệ của nó (tạo vòng lặp).',
        );
      }
    }
    if (dto.workId != null) {
      await this.worksService.findOne(dto.workId);
    }
    return this.prisma.checklistItem.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.photoTakenAt !== undefined
          ? { photoTakenAt: toDateTimeInput(dto.photoTakenAt) }
          : {}),
      },
    });
  }

  // Xoá mềm cả cây con
  async remove(id: number) {
    await this.findOne(id);
    const ids = await this.collectSubtreeIds(id);
    await this.prisma.checklistItem.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });
    return { deleted: ids.length };
  }

  // Khôi phục cả cây con
  async restore(id: number) {
    const item = await this.prisma.checklistItem.findUnique({ where: { id } });
    if (!item)
      throw new NotFoundException(`ChecklistItem #${id} không tồn tại.`);
    const ids = await this.collectSubtreeIds(id);
    await this.prisma.checklistItem.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: false },
    });
    return { restored: ids.length };
  }
}
