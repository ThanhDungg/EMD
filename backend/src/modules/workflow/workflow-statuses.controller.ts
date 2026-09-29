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
import { CreateWorkflowStatusDto } from './dto/create-workflow-status.dto.js';
import { UpdateWorkflowStatusDto } from './dto/update-workflow-status.dto.js';
import { WorkflowStatusesService } from './workflow-statuses.service.js';

// Bộ trạng thái riêng của từng loại việc.
// Xem (?categoryId) ai đăng nhập cũng được; thêm/sửa/xoá cần ADMIN.
@Controller('workflow/statuses')
export class WorkflowStatusesController {
  constructor(private readonly statusesService: WorkflowStatusesService) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.statusesService.findAll(
      categoryId !== undefined ? Number(categoryId) : undefined,
      includeDeleted === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.statusesService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateWorkflowStatusDto) {
    return this.statusesService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkflowStatusDto) {
    return this.statusesService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.statusesService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.statusesService.restore(id);
  }
}
