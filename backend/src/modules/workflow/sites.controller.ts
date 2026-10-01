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
import { canViewAll } from '../../common/access.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CreateSiteDto } from './dto/create-site.dto.js';
import { UpdateSiteDto } from './dto/update-site.dto.js';
import { SitesExcelService } from './sites-excel.service.js';
import { SitesService } from './sites.service.js';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('workflow/sites')
export class SitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly sitesExcelService: SitesExcelService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.sitesService.findAll(includeDeleted === 'true', {
      meId: user.sub,
      viewAll: canViewAll(user.permissions),
    });
  }

  // Các route import/export phải khai báo TRƯỚC `@Get(':id')`, nếu không Nest
  // sẽ hiểu "import" và "export" là tham số :id.
  @RequirePermissions('ADMIN')
  @Get('import/template')
  async downloadTemplate() {
    const buffer = await this.sitesExcelService.buildTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-du-an.xlsx"',
    });
  }

  @RequirePermissions('ADMIN')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFromExcel(@UploadedFile() file?: Express.Multer.File) {
    return this.sitesExcelService.importFromFile(file);
  }

  // Xuất toàn bộ dự án — file xuất nhập lại được ngay (kèm mã + Tên (id)).
  @RequirePermissions('ADMIN')
  @Get('export')
  async downloadExport(@Query('includeDeleted') includeDeleted?: string) {
    const buffer = await this.sitesExcelService.buildExport(
      includeDeleted === 'true',
    );
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="danh-sach-du-an.xlsx"',
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.sitesService.findOne(id, false, {
      meId: user.sub,
      viewAll: canViewAll(user.permissions),
    });
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
