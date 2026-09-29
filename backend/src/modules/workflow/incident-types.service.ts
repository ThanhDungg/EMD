import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateIncidentTypeDto } from './dto/create-incident-type.dto.js';
import type { UpdateIncidentTypeDto } from './dto/update-incident-type.dto.js';

@Injectable()
export class IncidentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeDeleted = false) {
    return this.prisma.incidentType.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, includeDeleted = false) {
    const type = await this.prisma.incidentType.findUnique({ where: { id } });
    if (!type || (!includeDeleted && type.isDeleted)) {
      throw new NotFoundException(`IncidentType #${id} không tồn tại.`);
    }
    return type;
  }

  create(dto: CreateIncidentTypeDto) {
    return this.prisma.incidentType.create({ data: dto });
  }

  async update(id: number, dto: UpdateIncidentTypeDto) {
    await this.findOne(id, true);
    return this.prisma.incidentType.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.incidentType.update({ where: { id }, data: { isDeleted: true } });
  }

  async restore(id: number) {
    await this.findOne(id, true);
    return this.prisma.incidentType.update({ where: { id }, data: { isDeleted: false } });
  }
}
