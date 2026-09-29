import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { SaveIncidentDetailDto } from './dto/save-incident-detail.dto.js';
import { IncidentDetailsService } from './incident-details.service.js';

function isAdminOf(user: JwtPayload): boolean {
  return user.permissions.includes('ADMIN');
}

// Chi tiết sự cố hư hỏng của 1 work (1-1)
@Controller('workflow/works/:workId/incident-detail')
export class IncidentDetailsController {
  constructor(private readonly detailsService: IncidentDetailsService) {}

  @Get()
  get(@Param('workId', ParseIntPipe) workId: number) {
    return this.detailsService.getByWorkId(workId);
  }

  @Put()
  save(
    @CurrentUser() user: JwtPayload,
    @Param('workId', ParseIntPipe) workId: number,
    @Body() dto: SaveIncidentDetailDto,
  ) {
    return this.detailsService.save(workId, dto, user.sub, isAdminOf(user));
  }

  @Delete()
  remove(@CurrentUser() user: JwtPayload, @Param('workId', ParseIntPipe) workId: number) {
    return this.detailsService.remove(workId, user.sub, isAdminOf(user));
  }
}
