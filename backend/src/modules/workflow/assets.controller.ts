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
import { AssetsExcelService } from './assets-excel.service.js';
import { AssetsService } from './assets.service.js';
import { CreateAssetDto } from './dto/create-asset.dto.js';
import { UpdateAssetDto } from './dto/update-asset.dto.js';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function toInt(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

// Tài sản / thiết bị. Lọc theo dự án (siteId) hoặc theo vị trí (locationId) —
// màn sự cố dùng 2 API này sau khi người dùng chọn dự án.
@Controller('workflow/assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly assetsExcelService: AssetsExcelService,
  ) {}

  @Get()
  findAll(
    @Query('siteId') siteId?: string,
    @Query('locationId') locationId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('usageStatusId') usageStatusId?: string,
    @Query('conditionId') conditionId?: string,
    @Query('keyword') keyword?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.assetsService.findAll({
      siteId: toInt(siteId),
      locationId: toInt(locationId),
      categoryId: toInt(categoryId),
      usageStatusId: toInt(usageStatusId),
      conditionId: toInt(conditionId),
      keyword: keyword?.trim() || undefined,
      includeDeleted: includeDeleted === 'true',
    });
  }

  // Hai route import/export phải khai báo TRƯỚC `@Get(':id')`, nếu không Nest sẽ
  // hiểu "import" và "template" là tham số :id.
  @RequirePermissions('ADMIN')
  @Get('import/template')
  async downloadTemplate() {
    const buffer = await this.assetsExcelService.buildTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-tai-san.xlsx"',
    });
  }

  @RequirePermissions('ADMIN')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFromExcel(@UploadedFile() file?: Express.Multer.File) {
    return this.assetsExcelService.importFromFile(file);
  }

  // Xuất đúng tập đang lọc — file xuất nhập lại được ngay (dạng Tên (id) + mã TS).
  @RequirePermissions('ADMIN')
  @Get('export')
  async downloadExport(
    @Query('siteId') siteId?: string,
    @Query('locationId') locationId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('usageStatusId') usageStatusId?: string,
    @Query('conditionId') conditionId?: string,
    @Query('keyword') keyword?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const buffer = await this.assetsExcelService.buildExport({
      siteId: toInt(siteId),
      locationId: toInt(locationId),
      categoryId: toInt(categoryId),
      usageStatusId: toInt(usageStatusId),
      conditionId: toInt(conditionId),
      keyword: keyword?.trim() || undefined,
      includeDeleted: includeDeleted === 'true',
    });
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="danh-sach-tai-san.xlsx"',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.assetsService.restore(id);
  }
}
