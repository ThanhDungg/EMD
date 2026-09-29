import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePermissionDto } from './dto/create-permission.dto.js';
import type { UpdatePermissionDto } from './dto/update-permission.dto.js';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.permission.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      include: { groups: { select: { id: true, name: true, code: true } } },
      orderBy: { rank: 'desc' },
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
      include: { groups: { select: { id: true, name: true, code: true } } },
    });
    if (!permission || (!includeDeleted && permission.isDeleted)) {
      throw new NotFoundException(`Permission #${id} không tồn tại.`);
    }
    return permission;
  }

  async create(dto: CreatePermissionDto) {
    try {
      return await this.prisma.permission.create({ data: dto });
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        if ((err as { code?: string }).code === 'P2002') {
          throw new ConflictException('Mã quyền đã tồn tại.');
        }
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdatePermissionDto) {
    await this.findOne(id, true);
    try {
      return await this.prisma.permission.update({ where: { id }, data: dto });
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException('Mã quyền đã tồn tại.');
      }
      throw err;
    }
  }

  // Xoá mềm — quyền đang gắn group vẫn giữ liên kết, chỉ ẩn khỏi danh sách
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.permission.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.permission.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
