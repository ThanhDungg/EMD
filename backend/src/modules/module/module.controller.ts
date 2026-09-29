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
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';

@RequirePermissions('ADMIN')
@Controller('modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.moduleService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateModuleDto) {
    return this.moduleService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateModuleDto) {
    return this.moduleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.restore(id);
  }
}
