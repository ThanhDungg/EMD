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
import { CreateSiteDetailDto } from './dto/site-detail.dto.js';
import type { SiteDetailKind } from './dto/site-detail.dto.js';
import { UpdateSiteDetailDto } from './dto/update-site-detail.dto.js';
import {
  SITE_DETAIL_KINDS,
  SiteDetailsService,
} from './site-details.service.js';

const KINDS = Object.keys(SITE_DETAIL_KINDS) as SiteDetailKind[];

function toKind(value: string): SiteDetailKind {
  const kind = value as SiteDetailKind;
  if (!KINDS.includes(kind)) {
    throw new NotFoundException(`Bảng con "${value}" không tồn tại.`);
  }
  return kind;
}

// 5 bảng con theo dự án: /workflow/site-details/:kind?siteId=
// kind ∈ members | serviceProviders | contractors | partnerContacts | units
@Controller('workflow/site-details')
export class SiteDetailsController {
  constructor(private readonly siteDetailsService: SiteDetailsService) {}

  @Get('meta')
  meta() {
    return KINDS.map((kind) => ({ key: kind, ...SITE_DETAIL_KINDS[kind] }));
  }

  @Get(':kind')
  findAll(
    @Param('kind') kind: string,
    @Query('siteId', ParseIntPipe) siteId: number,
  ) {
    return this.siteDetailsService.findAll(toKind(kind), siteId);
  }

  @Get(':kind/:id')
  findOne(@Param('kind') kind: string, @Param('id', ParseIntPipe) id: number) {
    return this.siteDetailsService.findOne(toKind(kind), id);
  }

  @Post(':kind')
  create(@Param('kind') kind: string, @Body() dto: CreateSiteDetailDto) {
    return this.siteDetailsService.create(toKind(kind), dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':kind/:id')
  update(
    @Param('kind') kind: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteDetailDto,
  ) {
    return this.siteDetailsService.update(toKind(kind), id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':kind/:id')
  remove(@Param('kind') kind: string, @Param('id', ParseIntPipe) id: number) {
    return this.siteDetailsService.remove(toKind(kind), id);
  }
}
