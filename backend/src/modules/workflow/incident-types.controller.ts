import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CreateIncidentTypeDto } from './dto/create-incident-type.dto.js';
import { UpdateIncidentTypeDto } from './dto/update-incident-type.dto.js';
import { IncidentTypesService } from './incident-types.service.js';

@Controller('workflow/incident-types')
export class IncidentTypesController {
  constructor(private readonly incidentTypesService: IncidentTypesService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.incidentTypesService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.incidentTypesService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateIncidentTypeDto) {
    return this.incidentTypesService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIncidentTypeDto) {
    return this.incidentTypesService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.incidentTypesService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.incidentTypesService.restore(id);
  }
}
