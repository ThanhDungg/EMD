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
import { CreateContractorDto } from './dto/create-contractor.dto.js';
import { UpdateContractorDto } from './dto/update-contractor.dto.js';
import { ContractorsService } from './contractors.service.js';

// Nhà thầu (khai báo master data): /workflow/contractors
@Controller('workflow/contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.contractorsService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contractorsService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateContractorDto) {
    return this.contractorsService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractorDto,
  ) {
    return this.contractorsService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contractorsService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.contractorsService.restore(id);
  }
}
