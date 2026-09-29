import { Injectable, NotFoundException } from '@nestjs/common';
import { toDateTimeInput } from '../../common/datetime.js';
import { MeterPhase } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateEnergyCheckDto,
  CreateEnergyMeterDto,
} from './dto/create-energy-check.dto.js';
import type { UpdateEnergyCheckDto } from './dto/update-energy-check.dto.js';
import {
  assertNoDuplicatePhase,
  assertPhaseAllowed,
  calcTotal,
} from './energy-phase.util.js';
import { WorksService } from './works.service.js';

const checkInclude = {
  meters: {
    where: { isDeleted: false },
    include: { readings: { where: { isDeleted: false } } },
  },
} as const;

@Injectable()
export class EnergyChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly worksService: WorksService,
  ) {}

  private prepareMeter(meter: CreateEnergyMeterDto) {
    const readings = meter.readings ?? [];
    assertNoDuplicatePhase(readings.map((r) => r.phase ?? MeterPhase.NORMAL));
    return {
      meterCode: meter.meterCode,
      meterType: meter.meterType,
      location: meter.location,
      attachments: meter.attachments,
      checkpoint: meter.checkpoint,
      notes: meter.notes,
      readings: {
        create: readings.map((r) => {
          const phase = r.phase ?? MeterPhase.NORMAL;
          assertPhaseAllowed(meter.meterType, phase);
          return {
            phase,
            startIndex: r.startIndex,
            endIndex: r.endIndex,
            total: calcTotal(r.startIndex, r.endIndex),
          };
        }),
      },
    };
  }

  findAll(workId?: number, includeDeleted = false) {
    return this.prisma.energyCheck.findMany({
      where: {
        ...(workId !== undefined ? { workId } : {}),
        ...(includeDeleted ? {} : { isDeleted: false }),
      },
      include: checkInclude,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const check = await this.prisma.energyCheck.findUnique({
      where: { id },
      include: checkInclude,
    });
    if (!check || check.isDeleted) {
      throw new NotFoundException(`EnergyCheck #${id} không tồn tại.`);
    }
    return check;
  }

  async create(dto: CreateEnergyCheckDto) {
    if (dto.workId !== undefined) {
      await this.worksService.findOne(dto.workId);
    }
    const { meters, checkTime, ...rest } = dto;
    return this.prisma.energyCheck.create({
      data: {
        ...rest,
        ...(checkTime !== undefined ? { checkTime: toDateTimeInput(checkTime) } : {}),
        ...(meters ? { meters: { create: meters.map((m) => this.prepareMeter(m)) } } : {}),
      },
      include: checkInclude,
    });
  }

  async update(id: number, dto: UpdateEnergyCheckDto) {
    await this.findOne(id);
    if (dto.workId !== undefined) {
      await this.worksService.findOne(dto.workId);
    }
    const { checkTime, ...rest } = dto;
    return this.prisma.energyCheck.update({
      where: { id },
      data: {
        ...rest,
        ...(checkTime !== undefined ? { checkTime: toDateTimeInput(checkTime) } : {}),
      },
      include: checkInclude,
    });
  }

  // Xoá mềm cả đồng hồ + chỉ số bên trong
  async remove(id: number) {
    await this.findOne(id);
    const meters = await this.prisma.energyMeter.findMany({
      where: { checkId: id },
      select: { id: true },
    });
    const meterIds = meters.map((m) => m.id);
    await this.prisma.$transaction([
      this.prisma.energyReading.updateMany({
        where: { meterId: { in: meterIds } },
        data: { isDeleted: true },
      }),
      this.prisma.energyMeter.updateMany({
        where: { id: { in: meterIds } },
        data: { isDeleted: true },
      }),
      this.prisma.energyCheck.update({ where: { id }, data: { isDeleted: true } }),
    ]);
    return { deleted: true };
  }

  async restore(id: number) {
    const check = await this.prisma.energyCheck.findUnique({ where: { id } });
    if (!check) throw new NotFoundException(`EnergyCheck #${id} không tồn tại.`);
    const meters = await this.prisma.energyMeter.findMany({
      where: { checkId: id },
      select: { id: true },
    });
    const meterIds = meters.map((m) => m.id);
    await this.prisma.$transaction([
      this.prisma.energyCheck.update({ where: { id }, data: { isDeleted: false } }),
      this.prisma.energyMeter.updateMany({
        where: { id: { in: meterIds } },
        data: { isDeleted: false },
      }),
      this.prisma.energyReading.updateMany({
        where: { meterId: { in: meterIds } },
        data: { isDeleted: false },
      }),
    ]);
    return { restored: true };
  }
}
