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
import {
  CreateMasterplanCategoryDto,
  CreateMasterplanSystemDto,
  CreateMasterplanTaskDto,
} from './dto/create-masterplan.dto.js';
import {
  UpdateMasterplanCategoryDto,
  UpdateMasterplanSystemDto,
  UpdateMasterplanTaskDto,
} from './dto/update-masterplan.dto.js';
import { MasterplanCategoriesService } from './masterplan-categories.service.js';
import { MasterplanSystemsService } from './masterplan-systems.service.js';
import { MasterplanTasksService } from './masterplan-tasks.service.js';

const AdminOnly = () => RequirePermissions('ADMIN');

// Level 1: hệ thống (GET detail trả full cây system → hạng mục → công việc)
@Controller('workflow/masterplan-systems')
export class MasterplanSystemsController {
  constructor(private readonly systemsService: MasterplanSystemsService) {}

  @Get()
  findAll(
    @Query('workId') workId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.systemsService.findAll(
      workId !== undefined ? Number(workId) : undefined,
      includeDeleted === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.systemsService.findOne(id);
  }

  @AdminOnly()
  @Post()
  create(@Body() dto: CreateMasterplanSystemDto) {
    return this.systemsService.create(dto);
  }

  @AdminOnly()
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMasterplanSystemDto) {
    return this.systemsService.update(id, dto);
  }

  @AdminOnly()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.systemsService.remove(id);
  }

  @AdminOnly()
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.systemsService.restore(id);
  }
}

// Level 2: hạng mục
@Controller('workflow/masterplan-categories')
export class MasterplanCategoriesController {
  constructor(private readonly categoriesService: MasterplanCategoriesService) {}

  @Get()
  findAll(
    @Query('systemId') systemId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.categoriesService.findAll(
      systemId !== undefined ? Number(systemId) : undefined,
      includeDeleted === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @AdminOnly()
  @Post()
  create(@Body() dto: CreateMasterplanCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @AdminOnly()
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMasterplanCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @AdminOnly()
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }

  @AdminOnly()
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.restore(id);
  }
}

// Level 3: công việc thực hiện + planData
@Controller('workflow/masterplan-tasks')
export class MasterplanTasksController {
  constructor(private readonly tasksService: MasterplanTasksService) {}

  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.tasksService.findAll(
      categoryId !== undefined ? Number(categoryId) : undefined,
      includeDeleted === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMasterplanTaskDto) {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMasterplanTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.restore(id);
  }
}
