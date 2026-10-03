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
import {
  canViewAll,
  isTechnicianOnly,
} from '../../common/access.js';
import { CreateWorkDto } from './dto/create-work.dto.js';
import { UpdateWorkDto } from './dto/update-work.dto.js';
import { WorksService } from './works.service.js';
import type { WorkScope } from './works.service.js';

// ADMIN/CEO/HO xem toàn bộ; kỹ thuật thuần tuý chỉ thấy việc được giao.
function accessOf(user: JwtPayload) {
  return {
    isAdmin: canViewAll(user.permissions),
    handledOnly: isTechnicianOnly(user.permissions),
  };
}

@Controller('workflow/works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  // Lọc theo loại việc (?categoryId) + trạng thái của loại (?statusId) + trễ hạn
  // (?overdue=true: quá endDate mà chưa đóng) + mẫu lặp (?isRecurrence) + phạm vi
  // (?scope=assigned: tôi giao | handled: tôi thực hiện | followed: tôi theo dõi)
  // + lọc nâng cao drawer FE (?siteId=dự án, ?userId=nhân viên giao/thực hiện,
  // ?from/?to=YYYY-MM-DD khoảng Từ → Đến).
  // (?assetId=1: chỉ sự cố gắn với tài sản đó — dùng cho trang chi tiết tài sản
  // mở từ tem QR.)
  // Xoá mềm: mặc định chỉ isDeleted = false. ADMIN có thêm ?includeDeleted=true
  // (thấy tất cả) và ?deletedOnly=true (chỉ bản đã xoá — thùng rác).
  // Phân trang: ?page=1&limit=20 (max 100) — bắt buộc vì ~1000 việc/ngày.
  // Trả envelope { data, total, page, limit, totalPages } kiểu source cũ.
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('scope') scope?: WorkScope,
    @Query('categoryId') categoryId?: string,
    @Query('statusId') statusId?: string,
    @Query('overdue') overdue?: string,
    @Query('isRecurrence') isRecurrence?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('deletedOnly') deletedOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('siteId') siteId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('assetId') assetId?: string,
  ) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.findAll({
      scope,
      meId: user.sub,
      isAdmin,
      handledOnly,
      categoryId: categoryId !== undefined ? Number(categoryId) : undefined,
      statusId: statusId !== undefined ? Number(statusId) : undefined,
      overdue: overdue === 'true',
      isRecurrence: isRecurrence === undefined ? undefined : isRecurrence === 'true',
      includeDeleted: includeDeleted === 'true',
      deletedOnly: deletedOnly === 'true',
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      siteId: siteId !== undefined ? Number(siteId) : undefined,
      userId: userId !== undefined ? Number(userId) : undefined,
      from,
      to,
      assetId: assetId !== undefined ? Number(assetId) : undefined,
    });
  }

  // Xem trước các kỳ sẽ sinh của 1 mẫu (không ghi DB)
  @Get(':id/recurrence-preview')
  previewTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Query('count') count?: string,
  ) {
    return this.worksService.previewTemplate(
      id,
      count !== undefined ? Number(count) : undefined,
      { meId: user.sub, isAdmin: accessOf(user).isAdmin },
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.findOne(id, user.sub, isAdmin, handledOnly);
  }

  // Timeline lịch sử chuyển trạng thái của 1 work (mới nhất trước).
  // Mỗi lần tạo/đổi status service tự ghi 1 mốc.
  @Get(':id/history')
  history(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.history(id, user.sub, isAdmin, handledOnly);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWorkDto) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.create(dto, user.sub, {
      viewAll: isAdmin,
      handledOnly,
    });
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkDto,
  ) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.update(id, dto, user.sub, isAdmin, handledOnly);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.remove(id, user.sub, isAdmin, handledOnly);
  }

  // Mở lại công việc đã xoá mềm (người trong cuộc hoặc ADMIN — service check).
  @Post(':id/restore')
  restore(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { isAdmin, handledOnly } = accessOf(user);
    return this.worksService.restore(id, user.sub, isAdmin, handledOnly);
  }

  // Sinh ngay các kỳ tới hạn của 1 mẫu (không chờ cron giờ).
  // Chỉ người giao của mẫu hoặc ADMIN.
  @Post(':id/generate')
  generate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.worksService
      .generateForTemplate(id, new Date(), { meId: user.sub, isAdmin: accessOf(user).isAdmin })
      .then((created) => ({ templateId: id, created }));
  }
}
