import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../../prisma/prisma.service.js';

// Địa lý 3 tầng không qua miền: quốc gia → tỉnh thành → phường xã.
// Dùng cho khách hàng và chủ đầu tư.
export interface GeoChainFields {
  countryId?: number | null;
  provinceId?: number | null;
  wardId?: number | null;
}

export async function assertGeoChain3(
  prisma: PrismaService,
  dto: GeoChainFields,
): Promise<void> {
  if (dto.provinceId != null) {
    const province = await prisma.province.findUnique({
      where: { id: dto.provinceId },
      select: {
        isDeleted: true,
        region: { select: { countryId: true } },
      },
    });
    if (!province || province.isDeleted) {
      throw new BadRequestException(
        `Tỉnh thành #${dto.provinceId} không tồn tại.`,
      );
    }
    if (dto.countryId != null && province.region.countryId !== dto.countryId) {
      throw new BadRequestException('Tỉnh thành không thuộc quốc gia đã chọn.');
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
      throw new BadRequestException('Phường xã không thuộc tỉnh thành đã chọn.');
    }
  }
}
