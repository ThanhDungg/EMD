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
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersExcelService } from './users-excel.service.js';
import { UsersService } from './users.service.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Quản trị user chỉ dành cho ADMIN
@RequirePermissions('ADMIN')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersExcelService: UsersExcelService,
  ) {}

  // Tab giao diện: ?isInvestor=true (chủ đầu tư) | false (nhân viên)
  @Get()
  findAll(
    @Query('includeDeleted') includeDeleted?: string,
    @Query('isInvestor') isInvestor?: string,
  ) {
    return this.usersService.findAll({
      includeDeleted: includeDeleted === 'true',
      isInvestor: isInvestor === undefined ? undefined : isInvestor === 'true',
    });
  }

  // Danh mục cho form + file mẫu: chức vụ / đơn vị / trạng thái.
  // Khai báo TRƯỚC `@Get(':id')` để Nest không hiểu "references" là :id.
  @Get('references')
  references() {
    return this.usersService.references();
  }

  // Các route import phải khai báo TRƯỚC `@Get(':id')`, nếu không Nest
  // sẽ hiểu "import" là tham số :id.
  @Get('import/template')
  async downloadTemplate(@Query('isInvestor') isInvestor?: string) {
    const investor = isInvestor === 'true';
    const buffer = await this.usersExcelService.buildTemplate(investor);
    return new StreamableFile(buffer, {
      type: XLSX_MIME,
      disposition: `attachment; filename="${
        investor ? 'mau-nhap-tai-khoan-cdt' : 'mau-nhap-nhan-vien'
      }.xlsx"`,
    });
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importFromExcel(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('isInvestor') isInvestor?: string,
  ) {
    return this.usersExcelService.importFromFile(file, isInvestor === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // Xoá mềm (isDeleted = true)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restore(id);
  }
}
