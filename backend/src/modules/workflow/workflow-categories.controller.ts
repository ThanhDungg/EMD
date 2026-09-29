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
import { CreateWorkflowCategoryDto } from './dto/create-workflow-category.dto.js';
import { UpdateWorkflowCategoryDto } from './dto/update-workflow-category.dto.js';
import { WorkflowCategoriesService } from './workflow-categories.service.js';

@Controller('workflow/categories')
export class WorkflowCategoriesController {
  constructor(private readonly categoriesService: WorkflowCategoriesService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.categoriesService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateWorkflowCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateWorkflowCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.restore(id);
  }
}
