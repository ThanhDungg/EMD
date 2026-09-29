import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateSiteDto } from './dto/create-site.dto.js';
import type { UpdateSiteDto } from './dto/update-site.dto.js';

/** Địa lý phân cấp phải khớp tầng: tỉnh thuộc miền, miền thuộc quốc gia,
 * phường xã thuộc tỉnh. Dùng cho cả tạo và sửa hồ sơ dự án. */
export async function assertSiteGeoChain(
  prisma: PrismaService,
  dto: CreateSiteDto | UpdateSiteDto,
): Promise<void> {
  if (dto.regionId != null && dto.countryId != null) {
    const region = await prisma.region.findUnique({
      where: { id: dto.regionId },
      select: { countryId: true, isDeleted: true },
    });
    if (!region || region.isDeleted) {
      throw new BadRequestException(`Miền #${dto.regionId} không tồn tại.`);
    }
    if (region.countryId !== dto.countryId) {
      throw new BadRequestException('Miền không thuộc quốc gia đã chọn.');
    }
  }
  if (dto.provinceId != null && dto.regionId != null) {
    const province = await prisma.province.findUnique({
      where: { id: dto.provinceId },
      select: { regionId: true, isDeleted: true },
    });
    if (!province || province.isDeleted) {
      throw new BadRequestException(
        `Tỉnh thành #${dto.provinceId} không tồn tại.`,
      );
    }
    if (province.regionId !== dto.regionId) {
      throw new BadRequestException('Tỉnh thành không thuộc miền đã chọn.');
    }
  }
  if (dto.wardId != null && dto.provinceId != null) {
    const ward = await prisma.ward.findUnique({
      where: { id: dto.wardId },
      select: { provinceId: true, isDeleted: true },
    });
    if (!ward || ward.isDeleted) {
      throw new BadRequestException(`Phường xã #${dto.wardId} không tồn tại.`);
    }
    if (ward.provinceId !== dto.provinceId) {
      throw new BadRequestException(
        'Phường xã không thuộc tỉnh thành đã chọn.',
      );
    }
  }
}
