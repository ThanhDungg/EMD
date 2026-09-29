import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CreateGeoDto } from './dto/geo.dto.js';
import type { GeoKey } from './dto/geo.dto.js';
import { UpdateGeoDto } from './dto/update-geo.dto.js';
import { GEO_LEVELS, GeoService } from './geo.service.js';

const KEYS = Object.keys(GEO_LEVELS) as GeoKey[];

function toKey(value: string): GeoKey {
  const key = value as GeoKey;
  if (!KEYS.includes(key)) {
    throw new NotFoundException(`Tầng địa lý "${value}" không tồn tại.`);
  }
  return key;
}

// Địa lý phân cấp: /workflow/geo/:key?parentId=
// key ∈ country | region | province | ward
@Controller('workflow/geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('meta')
  meta() {
    return KEYS.map((key) => ({ key, ...GEO_LEVELS[key] }));
  }

  @Get(':key')
  findAll(
    @Param('key') key: string,
    @Query('parentId') parentId?: string,
    @Query('countryId') countryId?: string,
  ) {
    const parent =
      parentId === undefined || parentId === '' ? undefined : Number(parentId);
    const country =
      countryId === undefined || countryId === '' ? undefined : Number(countryId);
    return this.geoService.findAll(
      toKey(key),
      Number.isNaN(parent) ? undefined : parent,
      Number.isNaN(country) ? undefined : country,
    );
  }

  @Get(':key/:id')
  findOne(@Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.geoService.findOne(toKey(key), id);
  }

  @RequirePermissions('ADMIN')
  @Post(':key')
  create(@Param('key') key: string, @Body() dto: CreateGeoDto) {
    return this.geoService.create(toKey(key), dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':key/:id')
  update(
    @Param('key') key: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGeoDto,
  ) {
    return this.geoService.update(toKey(key), id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':key/:id')
  remove(@Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.geoService.remove(toKey(key), id);
  }
}
