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
import { CreateGroupDto } from './dto/create-group.dto.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { GroupsExcelService } from './groups-excel.service.js';
import { GroupsService } from './groups.service.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@RequirePermissions('ADMIN')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly groupsExcelService: GroupsExcelService,
  ) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.groupsService.findAll(includeDeleted === 'true');
  }

  // Các route import phải khai báo TRƯỚC `@Get(':id')`, nếu không Nest
  // sẽ hiểu "import" là tham số :id.
  @Get('import/template')
  async downloadTemplate() {
    const buffer = await this.groupsExcelService.buildTemplate();
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: 'attachment; filename="mau-nhap-nhom.xlsx"',
    });
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFromExcel(@UploadedFile() file?: Express.Multer.File) {
    return this.groupsExcelService.importFromFile(file);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.restore(id);
  }
}
