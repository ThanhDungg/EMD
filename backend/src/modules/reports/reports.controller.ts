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
import { CreateChartDto } from './dto/create-chart.dto.js';
import { CreateDashboardDto } from './dto/create-dashboard.dto.js';
import { QueryDataDto } from './dto/query-data.dto.js';
import { ShareDashboardDto } from './dto/share-dashboard.dto.js';
import { UpdateChartDto } from './dto/update-chart.dto.js';
import { UpdateDashboardDto } from './dto/update-dashboard.dto.js';
import { DATASET_META, ReportsDataService } from './reports-data.service.js';
import { ReportsService } from './reports.service.js';

// Báo cáo tự phục vụ: dashboard đi theo người dùng (sở hữu + chia sẻ),
// mỗi biểu đồ mang bộ lọc riêng. Mọi route yêu cầu đăng nhập (guard toàn cục).
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly dataService: ReportsDataService,
  ) {}

  // Mô tả datasets/metrics/dimensions/filters để UI builder tự dựng form.
  @Get('meta')
  meta() {
    return DATASET_META;
  }

  // Số liệu cho 1 biểu đồ (kể cả preview lúc tạo chưa lưu).
  @Post('query')
  query(@CurrentUser() user: JwtPayload, @Body() dto: QueryDataDto) {
    return this.dataService.query(user, {
      dataset: dto.dataset,
      metric: dto.metric,
      dimension: dto.dimension,
      filters: dto.filters,
      limit: dto.limit,
    });
  }

  @Get('dashboards')
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('scope') scope?: string,
  ) {
    return this.reportsService.findAll(user, scope);
  }

  @Post('dashboards')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDashboardDto) {
    return this.reportsService.create(user, dto);
  }

  @Get('dashboards/:id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportsService.findOne(id, user);
  }

  @Patch('dashboards/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.reportsService.update(id, user, dto);
  }

  @Delete('dashboards/:id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportsService.remove(id, user);
  }

  // Gán lại toàn bộ chia sẻ (user + nhóm).
  @Post('dashboards/:id/shares')
  share(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShareDashboardDto,
  ) {
    return this.reportsService.share(id, user, dto);
  }

  @Post('dashboards/:id/charts')
  createChart(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateChartDto,
  ) {
    return this.reportsService.createChart(id, user, dto);
  }

  @Patch('charts/:id')
  updateChart(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChartDto,
  ) {
    return this.reportsService.updateChart(id, user, dto);
  }

  @Delete('charts/:id')
  removeChart(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.reportsService.removeChart(id, user);
  }
}
