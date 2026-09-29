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
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CreateSiteLocationDto } from './dto/create-site-location.dto.js';
import { UpdateSiteLocationDto } from './dto/update-site-location.dto.js';
import { SiteLocationsExcelService } from './site-locations-excel.service.js';
import { SiteLocationsService } from './site-locations.service.js';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Cây vị trí theo site. GET /workflow/site-locations?siteId= là API mà màn
// sự cố gọi sau khi người dùng chọn dự án.
@Controller('workflow/site-locations')
export class SiteLocationsController {
  constructor(
    private readonly siteLocationsService: SiteLocationsService,
    private readonly siteLocationsExcelService: SiteLocationsExcelService,
  ) {}

  @Get()
  findTree(
    @Query('siteId') siteId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.siteLocationsService.findTree(
      siteId !== undefined ? Number(siteId) : undefined,
      includeDeleted === 'true',
    );
  }

  // Phải khai báo TRƯỚC `@Get(':id')`, nếu không "import/template" bị hiểu là :id.
  @RequirePermissions('ADMIN')
  @Get('import/template')
  async downloadTemplate() {
    const buffer = await this.siteLocationsExcelService.buildTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-vi-tri.xlsx"',
    });
  }

  @RequirePermissions('ADMIN')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFromExcel(@UploadedFile() file?: Express.Multer.File) {
    return this.siteLocationsExcelService.importFromFile(file);
  }

  // Xuất đúng cây đang xem — file xuất nhập lại được ngay (kèm ID).
  @RequirePermissions('ADMIN')
  @Get('export')
  async downloadExport(@Query('siteId') siteId?: string) {
    const buffer = await this.siteLocationsExcelService.buildExport(
      siteId !== undefined && siteId !== '' ? Number(siteId) : undefined,
    );
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="danh-sach-vi-tri.xlsx"',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.siteLocationsService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateSiteLocationDto) {
    return this.siteLocationsService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSiteLocationDto,
  ) {
    return this.siteLocationsService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.siteLocationsService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.siteLocationsService.restore(id);
  }
}
