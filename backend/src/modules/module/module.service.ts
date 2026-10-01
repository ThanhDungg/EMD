import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateModuleDto } from './dto/create-module.dto.js';
import type { UpdateModuleDto } from './dto/update-module.dto.js';

const safeUserSelect = {
  id: true,
  accountName: true,
  email: true,
  fullName: true,
} as const;

@Injectable()
export class ModuleService {
  constructor(private readonly prisma: PrismaService) {}

  // Sidebar rail lọc theo user: chỉ module được gán trực tiếp (viewerUsers)
  // hoặc qua nhóm (viewerGroups). ADMIN/CEO xem tất cả nhờ seed gán đủ.
  findAll(includeDeleted = false, userId?: number) {
    const scoped =
      userId === undefined
        ? undefined
        : {
            OR: [
              { viewerUsers: { some: { id: userId } } },
              { viewerGroups: { some: { users: { some: { id: userId } } } } },
            ],
          };
    return this.prisma.module.findMany({
      where: {
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...scoped,
      },
      include: {
        viewerUsers: { select: safeUserSelect },
        viewerGroups: { include: { permissions: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: {
        viewerUsers: { select: safeUserSelect },
        viewerGroups: { include: { permissions: true } },
      },
    });
    if (!mod || (!includeDeleted && mod.isDeleted)) {
      throw new NotFoundException(`Module #${id} không tồn tại.`);
    }
    return mod;
  }

  create(dto: CreateModuleDto) {
    const { viewerUserIds, viewerGroupIds, ...rest } = dto;
    return this.prisma.module.create({
      data: {
        ...rest,
        viewerUsers: viewerUserIds ? { connect: viewerUserIds.map((id) => ({ id })) } : undefined,
        viewerGroups: viewerGroupIds
          ? { connect: viewerGroupIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { viewerUsers: { select: safeUserSelect }, viewerGroups: true },
    });
  }

  async update(id: number, dto: UpdateModuleDto) {
    await this.findOne(id, true);
    const { viewerUserIds, viewerGroupIds, ...rest } = dto;
    return this.prisma.module.update({
      where: { id },
      data: {
        ...rest,
        ...(viewerUserIds
          ? { viewerUsers: { set: viewerUserIds.map((uid) => ({ id: uid })) } }
          : {}),
        ...(viewerGroupIds
          ? { viewerGroups: { set: viewerGroupIds.map((gid) => ({ id: gid })) } }
          : {}),
      },
      include: { viewerUsers: { select: safeUserSelect }, viewerGroups: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.module.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.module.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
