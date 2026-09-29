import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { SaveIncidentDetailDto } from './dto/save-incident-detail.dto.js';
import { WorksService, isWorkInvolved } from './works.service.js';

@Injectable()
export class IncidentDetailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly worksService: WorksService,
  ) {}

  // Chi tiết của 1 work (null khi chưa nhập)
  async getByWorkId(workId: number) {
    const detail = await this.prisma.incidentDetail.findUnique({
      where: { workId },
    });
    if (!detail || detail.isDeleted) return null;
    return detail;
  }

  /**
   * Flow sự cố: chọn Dự án (site) → Vị trí sự cố (node cây vị trí của site đó)
   * → Tài sản/Thiết bị (thuộc vị trí đã chọn). Chặn sai quy tắc ở đây:
   * - vị trí phải thuộc đúng site của work;
   * - tài sản phải thuộc đúng vị trí của sự cố.
   */
  private async assertRefs(
    workId: number,
    dto: SaveIncidentDetailDto,
  ): Promise<void> {
    if (dto.locationId == null) return;
    const location = await this.prisma.siteLocation.findUnique({
      where: { id: dto.locationId },
      select: { id: true, siteId: true, isDeleted: true },
    });
    if (!location || location.isDeleted) {
      throw new BadRequestException(`Vị trí #${dto.locationId} không tồn tại.`);
    }
    const work = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { siteId: true },
    });
    if (!work) throw new NotFoundException(`Work #${workId} không tồn tại.`);
    if (work.siteId !== location.siteId) {
      throw new BadRequestException(
        'Vị trí sự cố không thuộc dự án đang chọn. Hãy chọn lại vị trí.',
      );
    }
    if (dto.assetId != null) {
      const asset = await this.prisma.asset.findUnique({
        where: { id: dto.assetId },
        select: { id: true, locationId: true, isDeleted: true },
      });
      if (!asset || asset.isDeleted) {
        throw new BadRequestException(`Tài sản #${dto.assetId} không tồn tại.`);
      }
      if (asset.locationId !== location.id) {
        throw new BadRequestException(
          'Tài sản/Thiết bị không thuộc vị trí sự cố đã chọn.',
        );
      }
    }
  }

  /**
   * 3 field droplist của sự cố (phân loại sửa chữa / hư hỏng / đơn vị phụ
   * trách) đều phải tồn tại; đồng thời điền nhãn denormalize từ droplist để
   * client không cần join mới hiện được tên.
   */
  private async withDroplistNames(
    dto: SaveIncidentDetailDto,
  ): Promise<SaveIncidentDetailDto & Record<string, unknown>> {
    const out: Record<string, unknown> = { ...dto };
    const pairs = [
      {
        id: dto.repairTypeId,
        field: 'repairType',
        load: (id: number) =>
          this.prisma.repairType.findUnique({
            where: { id },
            select: { name: true, isDeleted: true },
          }),
      },
      {
        id: dto.damageTypeId,
        field: 'damageType',
        load: (id: number) =>
          this.prisma.damageType.findUnique({
            where: { id },
            select: { name: true, isDeleted: true },
          }),
      },
      {
        id: dto.picUnitId,
        field: 'picUnit',
        load: (id: number) =>
          this.prisma.picUnit.findUnique({
            where: { id },
            select: { name: true, isDeleted: true },
          }),
      },
    ] as const;
    for (const pair of pairs) {
      if (pair.id == null) continue;
      const row = await pair.load(pair.id);
      if (!row || row.isDeleted) {
        throw new BadRequestException(
          `Danh mục #${pair.id} của "${pair.field}" không tồn tại.`,
        );
      }
      out[pair.field] = row.name;
    }
    return out as SaveIncidentDetailDto & Record<string, unknown>;
  }

  // Tạo mới hoặc cập nhật theo work — cùng quyền sửa work
  // (người giao, người xử lý hoặc ADMIN)
  async save(
    workId: number,
    dto: SaveIncidentDetailDto,
    meId: number,
    isAdmin: boolean,
  ) {
    const work = await this.worksService.findOne(workId);
    if (!isWorkInvolved(work, meId) && !isAdmin) {
      throw new ForbiddenException(
        'Chỉ người giao, người thực hiện hoặc ADMIN được sửa.',
      );
    }
    await this.assertRefs(workId, dto);
    const data = await this.withDroplistNames(dto);
    const existing = await this.prisma.incidentDetail.findUnique({
      where: { workId },
    });
    if (!existing) {
      // workId (scalar) thay vì work: { connect } để Prisma chọn nhánh
      // UncheckedCreateInput — nhánh này cho phép kèm luôn locationId/assetId.
      return this.prisma.incidentDetail.create({
        data: { ...data, workId },
      });
    }
    if (existing.isDeleted) {
      throw new NotFoundException(
        `IncidentDetail của Work #${workId} đã bị xoá.`,
      );
    }
    return this.prisma.incidentDetail.update({
      where: { workId },
      data,
    });
  }

  async remove(workId: number, meId: number, isAdmin: boolean) {
    const work = await this.worksService.findOne(workId);
    if (!isWorkInvolved(work, meId) && !isAdmin) {
      throw new ForbiddenException(
        'Chỉ người giao, người thực hiện hoặc ADMIN được xoá.',
      );
    }
    const existing = await this.prisma.incidentDetail.findUnique({
      where: { workId },
    });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException(
        `IncidentDetail của Work #${workId} không tồn tại.`,
      );
    }
    return this.prisma.incidentDetail.update({
      where: { workId },
      data: { isDeleted: true },
    });
  }
}
