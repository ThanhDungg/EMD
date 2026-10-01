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
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { ModuleService } from './module.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';

@Controller('modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  // Sidebar rail: user chỉ thấy phân hệ được gán (trực tiếp hoặc qua nhóm).
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.moduleService.findAll(
      includeDeleted === 'true',
      user.sub,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateModuleDto) {
    return this.moduleService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModuleDto) {
    return this.moduleService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.restore(id);
  }
}
