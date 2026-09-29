import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { SaveCompanyProfileDto } from './dto/save-company-profile.dto.js';

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // Tab Trang chủ: 1 bản ghi duy nhất chưa xoá, chưa có thì null (admin tạo sau)
  get() {
    return this.prisma.companyProfile.findFirst({
      where: { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  async save(dto: SaveCompanyProfileDto) {
    const existing = await this.prisma.companyProfile.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!existing) {
      return this.prisma.companyProfile.create({ data: dto });
    }
    return this.prisma.companyProfile.update({
      where: { id: existing.id },
      data: { ...dto, isDeleted: false },
    });
  }
}
