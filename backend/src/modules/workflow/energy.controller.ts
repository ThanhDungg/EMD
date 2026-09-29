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
import {
  CreateEnergyCheckDto,
  CreateEnergyReadingDto,
} from './dto/create-energy-check.dto.js';
import {
  UpdateEnergyCheckDto,
  UpdateEnergyMeterDto,
  UpdateEnergyReadingDto,
} from './dto/update-energy-check.dto.js';
import { EnergyChecksService } from './energy-checks.service.js';
import { EnergyMetersService } from './energy-meters.service.js';

@Controller('workflow/energy-checks')
export class EnergyChecksController {
  constructor(private readonly checksService: EnergyChecksService) {}

  @Get()
  findAll(
    @Query('workId') workId?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.checksService.findAll(
      workId !== undefined ? Number(workId) : undefined,
      includeDeleted === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.checksService.findOne(id);
  }

  // Tạo đợt kiểm tra kèm đồng hồ + chỉ số trong 1 call
  @Post()
  create(@Body() dto: CreateEnergyCheckDto) {
    return this.checksService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEnergyCheckDto) {
    return this.checksService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.checksService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.checksService.restore(id);
  }
}

@Controller('workflow/energy-meters')
export class EnergyMetersController {
  constructor(private readonly metersService: EnergyMetersService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.metersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEnergyMeterDto) {
    return this.metersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.metersService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.metersService.restore(id);
  }

  // Thêm chỉ số 1 pha (điện: thêm cao điểm/thấp điểm; nước/dầu: 1 lần duy nhất)
  @Post(':id/readings')
  addReading(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEnergyReadingDto,
  ) {
    return this.metersService.addReading(id, dto);
  }
}

@Controller('workflow/energy-readings')
export class EnergyReadingsController {
  constructor(private readonly metersService: EnergyMetersService) {}

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEnergyReadingDto) {
    return this.metersService.updateReading(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.metersService.removeReading(id);
  }
}
