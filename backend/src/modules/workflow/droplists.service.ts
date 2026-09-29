import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateDroplistDto } from './dto/create-droplist.dto.js';
import type { UpdateDroplistDto } from './dto/update-droplist.dto.js';

// Các bảng droplist của hệ thống đều cùng shape (uuid / code? / name /
// isDeleted) nên dùng chung 1 service, phân biệt bằng key. Prisma không cho
// gọp delegate qua union type nên mỗi nhánh switch gọi thẳng model.
//
// - Module Tài sản: category · unit · usageStatus · condition
// - Module Ứng dụng: repairType · damageType · picUnit
export const DROPLISTS = {
  category: {
    model: 'assetCategory',
    table: 'asset_categories',
    label: 'Danh mục tài sản',
    module: 'ASSETS',
  },
  unit: {
    model: 'assetUnit',
    table: 'asset_units',
    label: 'Đơn vị tính',
    module: 'ASSETS',
  },
  usageStatus: {
    model: 'assetUsageStatus',
    table: 'asset_usage_statuses',
    label: 'Trạng thái dùng',
    module: 'ASSETS',
  },
  condition: {
    model: 'assetCondition',
    table: 'asset_conditions',
    label: 'Tình trạng tài sản',
    module: 'ASSETS',
  },
  repairType: {
    model: 'repairType',
    table: 'repair_types',
    label: 'Phân loại sửa chữa',
    module: 'APPLICATIONS',
  },
  damageType: {
    model: 'damageType',
    table: 'damage_types',
    label: 'Phân loại hư hỏng',
    module: 'APPLICATIONS',
  },
  picUnit: {
    model: 'picUnit',
    table: 'pic_units',
    label: 'Đơn vị phụ trách (PIC)',
    module: 'APPLICATIONS',
  },
  // Hồ sơ dự án (module Ứng dụng)
  investor: {
    model: 'investor',
    table: 'investors',
    label: 'Chủ đầu tư',
    module: 'APPLICATIONS',
  },
  serviceType: {
    model: 'serviceType',
    table: 'service_types',
    label: 'Loại hình dịch vụ',
    module: 'APPLICATIONS',
  },
  service: {
    model: 'providedService',
    table: 'provided_services',
    label: 'Dịch vụ cung cấp',
    module: 'APPLICATIONS',
  },
  // Chủ đầu tư cha (khai báo master data) — droplist có thêm tên viết tắt
  investorGroup: {
    model: 'investorGroup',
    table: 'investor_groups',
    label: 'Chủ đầu tư cha',
    module: 'APPLICATIONS',
  },
  // Loại nhà thầu (khai báo master data)
  contractorType: {
    model: 'contractorType',
    table: 'contractor_types',
    label: 'Loại nhà thầu',
    module: 'APPLICATIONS',
  },
  // Danh mục kiểm tra năng lượng
  factory: {
    model: 'factory',
    table: 'factories',
    label: 'Nhà xưởng',
    module: 'APPLICATIONS',
  },
} as const;

export type DroplistKey = keyof typeof DROPLISTS;

export type DroplistRow = {
  id: number;
  uuid: string;
  code: string | null;
  name: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DroplistsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(key: DroplistKey, includeDeleted = false) {
    const where = includeDeleted ? undefined : { isDeleted: false };
    switch (key) {
      case 'category':
        return this.prisma.assetCategory.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'unit':
        return this.prisma.assetUnit.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'usageStatus':
        return this.prisma.assetUsageStatus.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'condition':
        return this.prisma.assetCondition.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'repairType':
        return this.prisma.repairType.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'damageType':
        return this.prisma.damageType.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'picUnit':
        return this.prisma.picUnit.findMany({ where, orderBy: { id: 'asc' } });
      case 'investor':
        return this.prisma.investor.findMany({ where, orderBy: { id: 'asc' } });
      case 'serviceType':
        return this.prisma.serviceType.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'service':
        return this.prisma.providedService.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'factory':
        return this.prisma.factory.findMany({ where, orderBy: { id: 'asc' } });
      case 'investorGroup':
        return this.prisma.investorGroup.findMany({
          where,
          orderBy: { id: 'asc' },
        });
      case 'contractorType':
        return this.prisma.contractorType.findMany({
          where,
          orderBy: { id: 'asc' },
        });
    }
  }

  private async findUnique(
    key: DroplistKey,
    id: number,
  ): Promise<DroplistRow | null> {
    switch (key) {
      case 'category':
        return this.prisma.assetCategory.findUnique({ where: { id } });
      case 'unit':
        return this.prisma.assetUnit.findUnique({ where: { id } });
      case 'usageStatus':
        return this.prisma.assetUsageStatus.findUnique({ where: { id } });
      case 'condition':
        return this.prisma.assetCondition.findUnique({ where: { id } });
      case 'repairType':
        return this.prisma.repairType.findUnique({ where: { id } });
      case 'damageType':
        return this.prisma.damageType.findUnique({ where: { id } });
      case 'picUnit':
        return this.prisma.picUnit.findUnique({ where: { id } });
      case 'investor':
        return this.prisma.investor.findUnique({ where: { id } });
      case 'serviceType':
        return this.prisma.serviceType.findUnique({ where: { id } });
      case 'service':
        return this.prisma.providedService.findUnique({ where: { id } });
      case 'factory':
        return this.prisma.factory.findUnique({ where: { id } });
      case 'investorGroup':
        return this.prisma.investorGroup.findUnique({ where: { id } });
      case 'contractorType':
        return this.prisma.contractorType.findUnique({ where: { id } });
    }
  }

  async findOne(key: DroplistKey, id: number): Promise<DroplistRow> {
    const row = await this.findUnique(key, id);
    if (!row || row.isDeleted) {
      throw new NotFoundException(
        `${DROPLISTS[key].label} #${id} không tồn tại.`,
      );
    }
    return row;
  }

  create(key: DroplistKey, dto: CreateDroplistDto) {
    const data = { name: dto.name, code: dto.code };
    switch (key) {
      case 'category':
        return this.prisma.assetCategory.create({ data });
      case 'unit':
        return this.prisma.assetUnit.create({ data });
      case 'usageStatus':
        return this.prisma.assetUsageStatus.create({ data });
      case 'condition':
        return this.prisma.assetCondition.create({ data });
      case 'repairType':
        return this.prisma.repairType.create({ data });
      case 'damageType':
        return this.prisma.damageType.create({ data });
      case 'picUnit':
        return this.prisma.picUnit.create({ data });
      case 'investor':
        return this.prisma.investor.create({ data });
      case 'serviceType':
        return this.prisma.serviceType.create({ data });
      case 'service':
        return this.prisma.providedService.create({ data });
      case 'factory':
        return this.prisma.factory.create({ data });
      case 'investorGroup':
        // Chủ đầu tư cha có thêm tên viết tắt.
        return this.prisma.investorGroup.create({
          data: { ...data, shortName: dto.shortName },
        });
      case 'contractorType':
        return this.prisma.contractorType.create({ data });
    }
  }

  async update(key: DroplistKey, id: number, dto: UpdateDroplistDto) {
    const row = await this.findUnique(key, id);
    if (!row) {
      throw new NotFoundException(
        `${DROPLISTS[key].label} #${id} không tồn tại.`,
      );
    }
    // shortName chỉ có ở chủ đầu tư cha.
    const { shortName, ...rest } = dto;
    const data = { ...rest };
    switch (key) {
      case 'category':
        return this.prisma.assetCategory.update({ where: { id }, data });
      case 'unit':
        return this.prisma.assetUnit.update({ where: { id }, data });
      case 'usageStatus':
        return this.prisma.assetUsageStatus.update({ where: { id }, data });
      case 'condition':
        return this.prisma.assetCondition.update({ where: { id }, data });
      case 'repairType':
        return this.prisma.repairType.update({ where: { id }, data });
      case 'damageType':
        return this.prisma.damageType.update({ where: { id }, data });
      case 'picUnit':
        return this.prisma.picUnit.update({ where: { id }, data });
      case 'investor':
        return this.prisma.investor.update({ where: { id }, data });
      case 'serviceType':
        return this.prisma.serviceType.update({ where: { id }, data });
      case 'service':
        return this.prisma.providedService.update({ where: { id }, data });
      case 'factory':
        return this.prisma.factory.update({ where: { id }, data });
      case 'investorGroup':
        return this.prisma.investorGroup.update({
          where: { id },
          data: { ...data, ...(shortName !== undefined ? { shortName } : {}) },
        });
      case 'contractorType':
        return this.prisma.contractorType.update({ where: { id }, data });
    }
  }

  // Xoá mềm: dữ liệu đang tham chiếu vẫn giữ FK, droplist chỉ ẩn khỏi
  // danh sách chọn.
  async remove(key: DroplistKey, id: number) {
    await this.findOne(key, id);
    return this.setDeleted(key, id, true);
  }

  async restore(key: DroplistKey, id: number) {
    const row = await this.findUnique(key, id);
    if (!row) {
      throw new NotFoundException(
        `${DROPLISTS[key].label} #${id} không tồn tại.`,
      );
    }
    return this.setDeleted(key, id, false);
  }

  private setDeleted(key: DroplistKey, id: number, isDeleted: boolean) {
    const data = { isDeleted };
    switch (key) {
      case 'category':
        return this.prisma.assetCategory.update({ where: { id }, data });
      case 'unit':
        return this.prisma.assetUnit.update({ where: { id }, data });
      case 'usageStatus':
        return this.prisma.assetUsageStatus.update({ where: { id }, data });
      case 'condition':
        return this.prisma.assetCondition.update({ where: { id }, data });
      case 'repairType':
        return this.prisma.repairType.update({ where: { id }, data });
      case 'damageType':
        return this.prisma.damageType.update({ where: { id }, data });
      case 'picUnit':
        return this.prisma.picUnit.update({ where: { id }, data });
      case 'investor':
        return this.prisma.investor.update({ where: { id }, data });
      case 'serviceType':
        return this.prisma.serviceType.update({ where: { id }, data });
      case 'service':
        return this.prisma.providedService.update({ where: { id }, data });
      case 'factory':
        return this.prisma.factory.update({ where: { id }, data });
      case 'investorGroup':
        return this.prisma.investorGroup.update({ where: { id }, data });
      case 'contractorType':
        return this.prisma.contractorType.update({ where: { id }, data });
    }
  }
}
