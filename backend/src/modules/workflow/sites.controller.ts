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
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { SitesService } from './sites.service.js';

@Controller('workflow/sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.sitesService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sitesService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateSiteDto) {
    return this.sitesService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sitesService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.sitesService.restore(id);
  }
}
