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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { WorkflowTaskStatus } from '../../generated/prisma/client.js';
import { CreateWorkflowTaskDto } from './dto/create-workflow-task.dto.js';
import { UpdateWorkflowTaskDto } from './dto/update-workflow-task.dto.js';
import { WorkflowTasksService } from './workflow-tasks.service.js';
import type { TaskScope } from './workflow-tasks.service.js';

function isAdminOf(user: JwtPayload): boolean {
  return user.permissions.includes('ADMIN');
}

@Controller('workflow/tasks')
export class WorkflowTasksController {
  constructor(private readonly tasksService: WorkflowTasksService) {}

  // Tab "Công việc của tôi": ?scope=assigned (tôi giao) | executed (tôi thực hiện)
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('scope') scope?: TaskScope,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: WorkflowTaskStatus,
  ) {
    return this.tasksService.findAll({
      scope,
      meId: user.sub,
      categoryId: categoryId !== undefined ? Number(categoryId) : undefined,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWorkflowTaskDto) {
    return this.tasksService.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowTaskDto,
  ) {
    return this.tasksService.update(id, dto, user.sub, isAdminOf(user));
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id, user.sub, isAdminOf(user));
  }
}
