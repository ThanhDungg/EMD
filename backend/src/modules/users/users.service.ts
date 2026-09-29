import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { toDateTimeInput } from '../../common/datetime.js';
import { PasswordService } from '../../common/crypto/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

// Quan hệ luôn kèm khi trả user (droplist + manager + M2M).
// groups/permissions đã xoá mềm KHÔNG được nạp: nếu không, guard vẫn cấp
// quyền cho user thuộc group/perms đã bị vô hiệu (tài liệu §10.2 deny-by-default).
const userInclude = {
  position: true,
  department: true,
  coDepartment: true,
  status: true,
  manager: { select: { id: true, accountName: true, fullName: true, email: true } },
  projects: true,
  groups: {
    where: { isDeleted: false },
    include: { permissions: { where: { isDeleted: false } } },
  },
} satisfies Prisma.UserInclude;

export interface FindUsersFilter {
  includeDeleted?: boolean;
  // Lọc tab giao diện: true = chủ đầu tư, false = nhân viên
  isInvestor?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  // --- Helpers ---

  /** Xoá field nhạy cảm trước khi trả về client */
  private toSafeUser<T extends { password?: unknown; refreshTokenHash?: unknown }>(user: T) {
    const { password: _p, refreshTokenHash: _r, ...safe } = user;
    return safe;
  }

  private handleUniqueError(err: unknown): never {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException('accountName hoặc email đã tồn tại.');
    }
    throw err;
  }

  // --- Queries (mặc định ẩn user đã xoá mềm) ---

  async findAll(filter: FindUsersFilter = {}) {
    const { includeDeleted = false, isInvestor } = filter;
    const users = await this.prisma.user.findMany({
      where: {
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(isInvestor !== undefined ? { isInvestor } : {}),
      },
      include: userInclude,
      orderBy: { id: 'asc' },
    });
    return users.map((u) => this.toSafeUser(u));
  }

  async findOne(id: number, includeDeleted = false) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user || (!includeDeleted && user.isDeleted)) {
      throw new NotFoundException(`User #${id} không tồn tại.`);
    }
    return this.toSafeUser(user);
  }

  /** Dùng nội bộ cho auth: lấy cả password hash, chỉ user chưa xoá */
  findActiveByAccount(account: string) {
    return this.prisma.user.findFirst({
      where: {
        isDeleted: false,
        OR: [{ accountName: account }, { email: account }],
      },
    });
  }

  /** Dùng nội bộ cho auth refresh: user chưa xoá theo id (kèm hash) */
  findActiveById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
  }

  /** Dùng nội bộ cho auth: lưu/xoá hash refresh token (xoay vòng khi refresh) */
  setRefreshTokenHash(userId: number, hash: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  // --- Mutations ---

  async create(dto: CreateUserDto) {
    const { password, projectIds, groupIds, birthday, hireDate, ...rest } = dto;
    try {
      const user = await this.prisma.user.create({
        data: {
          ...rest,
          ...(birthday !== undefined ? { birthday: toDateTimeInput(birthday) } : {}),
          ...(hireDate !== undefined ? { hireDate: toDateTimeInput(hireDate) } : {}),
          password: await this.passwordService.hash(password),
          projects: projectIds ? { connect: projectIds.map((id) => ({ id })) } : undefined,
          groups: groupIds ? { connect: groupIds.map((id) => ({ id })) } : undefined,
        },
        include: userInclude,
      });
      return this.toSafeUser(user);
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id, true);
    const { password, projectIds, groupIds, birthday, hireDate, ...rest } = dto;
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...rest,
          ...(birthday !== undefined ? { birthday: toDateTimeInput(birthday) } : {}),
          ...(hireDate !== undefined ? { hireDate: toDateTimeInput(hireDate) } : {}),
          ...(password ? { password: await this.passwordService.hash(password) } : {}),
          ...(projectIds ? { projects: { set: projectIds.map((pid) => ({ id: pid })) } } : {}),
          ...(groupIds ? { groups: { set: groupIds.map((gid) => ({ id: gid })) } } : {}),
        },
        include: userInclude,
      });
      return this.toSafeUser(user);
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  /** Xoá mềm: đánh dấu isDeleted (giữ dữ liệu + quan hệ) */
  async remove(id: number) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { isDeleted: true, refreshTokenHash: null },
      include: userInclude,
    });
    return this.toSafeUser(user);
  }

  /** Khôi phục user đã xoá mềm */
  async restore(id: number) {
    await this.findOne(id, true);
    const user = await this.prisma.user.update({
      where: { id },
      data: { isDeleted: false },
      include: userInclude,
    });
    return this.toSafeUser(user);
  }
}
