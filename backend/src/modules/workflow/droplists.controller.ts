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
import { DROPLISTS, DroplistsService } from './droplists.service.js';
import type { DroplistKey } from './droplists.service.js';
import { CreateDroplistDto } from './dto/create-droplist.dto.js';
import { UpdateDroplistDto } from './dto/update-droplist.dto.js';

const KEYS = Object.keys(DROPLISTS) as DroplistKey[];

// Chuyển segment URL thành key, chặn key lạ (vd /workflow/droplists/xxx).
function toKey(value: string): DroplistKey {
  const key = value as DroplistKey;
  if (!KEYS.includes(key)) {
    throw new NotFoundException(`Droplist "${value}" không tồn tại.`);
  }
  return key;
}

// Một controller cho toàn bộ bảng droplist của hệ thống (module Tài sản +
// module Ứng dụng). Key theo bảng: category · unit · usageStatus · condition ·
// repairType · damageType · picUnit.
@Controller('workflow/droplists')
export class DroplistsController {
  constructor(private readonly droplistsService: DroplistsService) {}

  /** Danh sách key + label để client dựng card nhập liệu theo module. */
  @Get('meta')
  meta() {
    return KEYS.map((key) => ({ key, ...DROPLISTS[key] }));
  }

  @Get(':key')
  findAll(
    @Param('key') key: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.droplistsService.findAll(toKey(key), includeDeleted === 'true');
  }

  @Get(':key/:id')
  findOne(@Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.droplistsService.findOne(toKey(key), id);
  }

  @RequirePermissions('ADMIN')
  @Post(':key')
  create(@Param('key') key: string, @Body() dto: CreateDroplistDto) {
    return this.droplistsService.create(toKey(key), dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':key/:id')
  update(
    @Param('key') key: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDroplistDto,
  ) {
    return this.droplistsService.update(toKey(key), id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':key/:id')
  remove(@Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.droplistsService.remove(toKey(key), id);
  }

  @RequirePermissions('ADMIN')
  @Post(':key/:id/restore')
  restore(@Param('key') key: string, @Param('id', ParseIntPipe) id: number) {
    return this.droplistsService.restore(toKey(key), id);
  }
}
