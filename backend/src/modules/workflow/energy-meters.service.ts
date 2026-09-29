import { Injectable, NotFoundException } from '@nestjs/common';
import { MeterPhase } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateEnergyReadingDto } from './dto/create-energy-check.dto.js';
import type {
  UpdateEnergyMeterDto,
  UpdateEnergyReadingDto,
} from './dto/update-energy-check.dto.js';
import {
  assertNoDuplicatePhase,
  assertPhaseAllowed,
  calcTotal,
} from './energy-phase.util.js';

const readingInclude = {
  readings: { where: { isDeleted: false } },
} as const;

@Injectable()
export class EnergyMetersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const meter = await this.prisma.energyMeter.findUnique({
      where: { id },
      include: readingInclude,
    });
    if (!meter || meter.isDeleted) {
      throw new NotFoundException(`EnergyMeter #${id} không tồn tại.`);
    }
    return meter;
  }

  async update(id: number, dto: UpdateEnergyMeterDto) {
    await this.findOne(id);
    return this.prisma.energyMeter.update({
      where: { id },
      data: dto,
      include: readingInclude,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.energyReading.updateMany({
        where: { meterId: id },
        data: { isDeleted: true },
      }),
      this.prisma.energyMeter.update({ where: { id }, data: { isDeleted: true } }),
    ]);
    return { deleted: true };
  }

  async restore(id: number) {
    const meter = await this.prisma.energyMeter.findUnique({ where: { id } });
    if (!meter) throw new NotFoundException(`EnergyMeter #${id} không tồn tại.`);
    await this.prisma.$transaction([
      this.prisma.energyMeter.update({ where: { id }, data: { isDeleted: false } }),
      this.prisma.energyReading.updateMany({
        where: { meterId: id },
        data: { isDeleted: false },
      }),
    ]);
    return { restored: true };
  }

  // Thêm chỉ số 1 pha cho đồng hồ (điện thêm pha mới, nước/dầu chỉ 1 lần)
  async addReading(meterId: number, dto: CreateEnergyReadingDto) {
    const meter = await this.findOne(meterId);
    const phase = dto.phase ?? MeterPhase.NORMAL;
    assertPhaseAllowed(meter.meterType, phase);
    const existing = meter.readings.map((r) => r.phase);
    assertNoDuplicatePhase(existing, phase);
    return this.prisma.energyReading.create({
      data: {
        phase,
        startIndex: dto.startIndex,
        endIndex: dto.endIndex,
        total: calcTotal(dto.startIndex, dto.endIndex),
        meter: { connect: { id: meterId } },
      },
    });
  }

  async updateReading(id: number, dto: UpdateEnergyReadingDto) {
    const reading = await this.prisma.energyReading.findUnique({
      where: { id },
      include: { meter: { include: { readings: { where: { isDeleted: false } } } } },
    });
    if (!reading || reading.isDeleted || reading.meter.isDeleted) {
      throw new NotFoundException(`EnergyReading #${id} không tồn tại.`);
    }
    const phase = dto.phase ?? reading.phase;
    assertPhaseAllowed(reading.meter.meterType, phase);
    const siblings = reading.meter.readings.filter((r) => r.id !== id).map((r) => r.phase);
    assertNoDuplicatePhase(siblings, phase);
    const start = dto.startIndex !== undefined ? dto.startIndex : Number(reading.startIndex);
    const end = dto.endIndex !== undefined ? dto.endIndex : Number(reading.endIndex);
    return this.prisma.energyReading.update({
      where: { id },
      data: {
        phase,
        startIndex: start,
        endIndex: end,
        total: calcTotal(start, end),
      },
    });
  }

  async removeReading(id: number) {
    const reading = await this.prisma.energyReading.findUnique({ where: { id } });
    if (!reading || reading.isDeleted) {
      throw new NotFoundException(`EnergyReading #${id} không tồn tại.`);
    }
    // Giữ bản ghi để đối chiếu lịch sử, chỉ ẩn khỏi danh sách
    await this.prisma.energyReading.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { deleted: true };
  }
}
