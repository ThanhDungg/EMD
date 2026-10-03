import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { canViewAll, isTechnicianOnly } from '../../common/access.js';
import { QueryReportDto, DrillReportDto, SaveBoardDto } from './dto/query-report.dto.js';
import { ReportsService } from './reports.service.js';

function accessOf(user: JwtPayload) {
  return {
    meId: user.sub,
    isAdmin: canViewAll(user.permissions),
    handledOnly: isTechnicianOnly(user.permissions),
  };
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Catalogue datasets + dimensions/metrics + chart gợi ý cho builder FE.
  @Get('datasets')
  datasets() {
    return this.reports.datasets();
  }

  // Danh mục 3 NHÓM báo cáo cha + các báo cáo con (báo cáo hằng ngày /
  // báo cáo hoạt động / báo cáo tổng quan). FE render động theo preset.
  @Get('presets')
  presets() {
    return this.reports.presets();
  }

  // Tổng quan mặc định: KPIs + series vẽ sẵn dashboard (không cần builder).
  // ?from=YYYY-MM-DD&to=YYYY-MM-DD&siteId=
  @Get('overview')
  overview(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.reports.overview(
      {
        from,
        to,
        siteId: siteId !== undefined ? Number(siteId) : undefined,
      },
      accessOf(user),
    );
  }

  // Query engine linh hoạt kiểu Power BI: FE gửi dataset + dimensions +
  // metrics + filters, BE group-by + tính toán trả rows cho mọi loại chart.
  @Post('query')
  query(@CurrentUser() user: JwtPayload, @Body() dto: QueryReportDto) {
    return this.reports.query(dto, accessOf(user));
  }

  // Drill-through: click vào 1 chỉ số trên biểu đồ → danh sách bản ghi gốc.
  @Post('drill')
  drill(@CurrentUser() user: JwtPayload, @Body() dto: DrillReportDto) {
    return this.reports.drill(dto, accessOf(user));
  }

  @Get('boards')
  boards(@CurrentUser() user: JwtPayload) {
    return this.reports.listBoards(user.sub, canViewAll(user.permissions));
  }

  @Get('boards/:id')
  async board(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const found = await this.reports.getBoard(id, user.sub, canViewAll(user.permissions));
    if (!found) throw new NotFoundException(`Dashboard #${id} không tồn tại.`);
    return found;
  }

  @Post('boards')
  createBoard(@CurrentUser() user: JwtPayload, @Body() dto: SaveBoardDto) {
    return this.reports.createBoard(user.sub, dto);
  }

  @Patch('boards/:id')
  async updateBoard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<SaveBoardDto>,
  ) {
    const updated = await this.reports.updateBoard(
      id,
      user.sub,
      canViewAll(user.permissions),
      dto,
    );
    if (!updated) throw new NotFoundException(`Dashboard #${id} không tồn tại.`);
    return updated;
  }

  @Delete('boards/:id')
  async removeBoard(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const ok = await this.reports.removeBoard(id, user.sub, canViewAll(user.permissions));
    if (!ok) throw new NotFoundException(`Dashboard #${id} không tồn tại.`);
    return { deleted: true };
  }
}
