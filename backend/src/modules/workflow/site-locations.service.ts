import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateSiteLocationDto } from './dto/create-site-location.dto.js';
import type { UpdateSiteLocationDto } from './dto/update-site-location.dto.js';
import { SitesService } from './sites.service.js';

export interface SiteLocationNode {
  id: number;
  uuid: string;
  code: string | null;
  name: string;
  parentId: number | null;
  siteId: number;
  sortOrder: number;
  children: SiteLocationNode[];
}

// Cây vị trí theo site: mỗi site 1 list vị trí cha-con. Sự cố chọn vị trí
// theo site đang chọn, tài sản gắn vào 1 node vị trí.
@Injectable()
export class SiteLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sitesService: SitesService,
  ) {}

  private toTree(
    items: {
      id: number;
      uuid: string;
      code: string | null;
      name: string;
      parentId: number | null;
      siteId: number;
      sortOrder: number;
    }[],
  ): SiteLocationNode[] {
    const nodes = new Map<number, SiteLocationNode>();
    for (const it of items) {
      nodes.set(it.id, { ...it, children: [] });
    }
    const roots: SiteLocationNode[] = [];
    for (const node of nodes.values()) {
      const parent =
        node.parentId === null ? undefined : nodes.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    const sortRec = (list: SiteLocationNode[]) => {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      for (const n of list) sortRec(n.children);
    };
    sortRec(roots);
    return roots;
  }

  /** Cây vị trí. Truyền siteId để lọc theo dự án đang chọn. */
  async findTree(siteId?: number, includeDeleted = false) {
    if (siteId !== undefined) {
      await this.sitesService.findOne(siteId);
    }
    const items = await this.prisma.siteLocation.findMany({
      where: {
        ...(siteId !== undefined ? { siteId } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        uuid: true,
        code: true,
        name: true,
        parentId: true,
        siteId: true,
        sortOrder: true,
      },
    });
    // Nhiều site trả về 1 danh sách phẳng group theo site để client dựng cây.
    if (siteId === undefined) {
      return items;
    }
    return this.toTree(items);
  }

  async findOne(id: number) {
    const location = await this.prisma.siteLocation.findUnique({
      where: { id },
    });
    if (!location || location.isDeleted) {
      throw new NotFoundException(`SiteLocation #${id} không tồn tại.`);
    }
    return location;
  }

  /** Node cha phải cùng site với node mới (không gắn cây 2 site). */
  private async assertParent(
    parentId: number | undefined | null,
    siteId: number,
  ) {
    if (parentId == null) return;
    const parent = await this.prisma.siteLocation.findUnique({
      where: { id: parentId },
    });
    if (!parent || parent.isDeleted) {
      throw new BadRequestException(`Vị trí cha #${parentId} không tồn tại.`);
    }
    if (parent.siteId !== siteId) {
      throw new BadRequestException('Vị trí cha phải thuộc cùng dự án (site).');
    }
  }

  // Chặn tạo vòng lặp cha-con (giống checklist)
  private async assertNoCycle(id: number, parentId: number | undefined | null) {
    let cursor = parentId ?? undefined;
    while (cursor !== undefined) {
      if (cursor === id) {
        throw new BadRequestException(
          'Vị trí cha không được là chính nó (vòng lặp).',
        );
      }
      const node: { parentId: number | null } | null =
        await this.prisma.siteLocation.findUnique({
          where: { id: cursor },
          select: { parentId: true },
        });
      cursor = node?.parentId ?? undefined;
    }
  }

  async create(dto: CreateSiteLocationDto) {
    await this.sitesService.findOne(dto.siteId);
    await this.assertParent(dto.parentId, dto.siteId);
    return this.prisma.siteLocation.create({
      data: {
        siteId: dto.siteId,
        name: dto.name,
        code: dto.code,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: number, dto: UpdateSiteLocationDto) {
    const current = await this.findOne(id);
    const siteId = dto.siteId ?? current.siteId;
    if (dto.siteId != null) {
      await this.sitesService.findOne(dto.siteId);
    }
    await this.assertParent(dto.parentId, siteId);
    if (dto.parentId != null) {
      await this.assertNoCycle(id, dto.parentId);
    }
    const { siteId: _siteId, ...rest } = dto;
    return this.prisma.siteLocation.update({
      where: { id },
      data: { ...rest, ...(dto.siteId !== undefined ? { siteId } : {}) },
    });
  }

  // Xoá mềm cả cây con (cascade xuống DB nên con cũng bị xoá)
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.siteLocation.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async restore(id: number) {
    const node = await this.prisma.siteLocation.findUnique({ where: { id } });
    if (!node)
      throw new NotFoundException(`SiteLocation #${id} không tồn tại.`);
    return this.prisma.siteLocation.update({
      where: { id },
      data: { isDeleted: false },
    });
  }
}
