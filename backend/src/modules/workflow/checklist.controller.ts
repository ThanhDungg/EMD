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
import { ChecklistExcelService } from './checklist-excel.service.js';
import { ChecklistService } from './checklist.service.js';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto.js';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto.js';

// Checklist cây cha-con: GET trả cây lồng nhau (cha → con).
// FE render: row cha chỉ show tiêu đề, row con show full thông tin.
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller('workflow/checklists')
export class ChecklistController {
  constructor(
    private readonly checklistService: ChecklistService,
    private readonly checklistExcelService: ChecklistExcelService,
  ) {}

  @Get()
  findTree(
    @Query('workId') workId?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('unattached') unattached?: string,
  ) {
    return this.checklistService.findTree(
      workId !== undefined ? Number(workId) : undefined,
      includeDeleted === 'true',
      unattached === 'true',
    );
  }

  // Các route import/export phải khai báo TRƯỚC `@Get(':id')`, nếu không Nest
  // sẽ hiểu "import" là tham số :id.
  // Nhập 3 bước: B1 danh mục → B2 nội dung cha → B3 nội dung con.
  @Get('import/categories/template')
  async downloadStepCategoriesTemplate() {
    const buffer =
      await this.checklistExcelService.buildStepCategoriesTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-danh-muc.xlsx"',
    });
  }

  @Post('import/categories')
  @UseInterceptors(FileInterceptor('file'))
  importStepCategories(@UploadedFile() file?: Express.Multer.File) {
    return this.checklistExcelService.importStepCategories(file);
  }

  @Get('export/categories')
  async downloadStepCategoriesExport() {
    const buffer =
      await this.checklistExcelService.buildStepCategoriesExport();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="danh-sach-danh-muc.xlsx"',
    });
  }

  @Get('import/parents/template')
  async downloadStepParentsTemplate() {
    const buffer = await this.checklistExcelService.buildStepParentsTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-noi-dung-cha.xlsx"',
    });
  }

  @Post('import/parents')
  @UseInterceptors(FileInterceptor('file'))
  importStepParents(@UploadedFile() file?: Express.Multer.File) {
    return this.checklistExcelService.importStepParents(file);
  }

  @Get('import/children/template')
  async downloadStepChildrenTemplate() {
    const buffer =
      await this.checklistExcelService.buildStepChildrenTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-noi-dung-con.xlsx"',
    });
  }

  @Post('import/children')
  @UseInterceptors(FileInterceptor('file'))
  importStepChildren(@UploadedFile() file?: Express.Multer.File) {
    return this.checklistExcelService.importStepChildren(file);
  }

  // Xuất toàn bộ mẫu checklist — file xuất nhập lại được ngay.
  @Get('export')
  async downloadExport() {
    const buffer = await this.checklistExcelService.buildExport();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-checklist.xlsx"',
    });
  }

  // Nhập/xuất cả cha + con cho 1 danh mục (file không cần cột Danh mục).
  // Path nhiều đoạn nên không đụng `@Get(':id')`.
  @Get(':id/import/template')
  async downloadCategoryTemplate(@Param('id', ParseIntPipe) id: number) {
    const buffer = await this.checklistExcelService.buildCategoryTemplate(id);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-cha-con-checklist.xlsx"',
    });
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file'))
  importCategoryFromExcel(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.checklistExcelService.importCategoryFromFile(id, file);
  }

  @Get(':id/export')
  async downloadCategoryExport(@Param('id', ParseIntPipe) id: number) {
    const buffer = await this.checklistExcelService.buildCategoryExport(id);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: `attachment; filename="danh-muc-checklist-${id}.xlsx"`,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.checklistService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateChecklistItemDto) {
    return this.checklistService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChecklistItemDto) {
    return this.checklistService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.checklistService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.checklistService.restore(id);
  }
}
