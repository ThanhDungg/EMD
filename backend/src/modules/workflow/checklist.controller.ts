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
import { ChecklistService } from './checklist.service.js';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto.js';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto.js';

// Checklist cây cha-con: GET trả cây lồng nhau (cha → con).
// FE render: row cha chỉ show tiêu đề, row con show full thông tin.
@Controller('workflow/checklists')
export class ChecklistController {
  constructor(private readonly checklistService: ChecklistService) {}

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
