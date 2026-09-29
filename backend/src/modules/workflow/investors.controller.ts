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
import { CreateInvestorDto } from './dto/create-investor.dto.js';
import { UpdateInvestorDto } from './dto/update-investor.dto.js';
import { InvestorsService } from './investors.service.js';

// Chủ đầu tư (khai báo master data): /workflow/investors
@Controller('workflow/investors')
export class InvestorsController {
  constructor(private readonly investorsService: InvestorsService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.investorsService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.investorsService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateInvestorDto) {
    return this.investorsService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvestorDto) {
    return this.investorsService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.investorsService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.investorsService.restore(id);
  }
}
