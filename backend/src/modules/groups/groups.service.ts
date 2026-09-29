import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateGroupDto } from './dto/create-group.dto.js';
import type { UpdateGroupDto } from './dto/update-group.dto.js';

const safeUserSelect = {
  id: true,
  accountName: true,
  email: true,
  fullName: true,
} as const;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private handleUniqueError(err: unknown): never {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException('Mã group đã tồn tại.');
    }
    throw err;
  }

  findAll(includeDeleted = false) {
    return this.prisma.group.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      include: {
        permissions: true,
        users: { select: safeUserSelect },
        viewableModules: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        permissions: true,
        users: { select: safeUserSelect },
        viewableModules: true,
      },
    });
    if (!group || (!includeDeleted && group.isDeleted)) {
      throw new NotFoundException(`Group #${id} không tồn tại.`);
    }
    return group;
  }

  async create(dto: CreateGroupDto) {
    const { permissionIds, userIds, ...rest } = dto;
    try {
      return await this.prisma.group.create({
        data: {
          ...rest,
          permissions: permissionIds ? { connect: permissionIds.map((id) => ({ id })) } : undefined,
          users: userIds ? { connect: userIds.map((id) => ({ id })) } : undefined,
        },
        include: { permissions: true, users: { select: safeUserSelect } },
      });
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async update(id: number, dto: UpdateGroupDto) {
    await this.findOne(id, true);
    const { permissionIds, userIds, ...rest } = dto;
    try {
      return await this.prisma.group.update({
        where: { id },
        data: {
          ...rest,
          ...(permissionIds
            ? { permissions: { set: permissionIds.map((pid) => ({ id: pid })) } }
            : {}),
          ...(userIds ? { users: { set: userIds.map((uid) => ({ id: uid })) } } : {}),
        },
        include: { permissions: true, users: { select: safeUserSelect } },
      });
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.group.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.group.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
