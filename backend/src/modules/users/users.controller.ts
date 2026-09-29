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
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';

// Quản trị user chỉ dành cho ADMIN
@RequirePermissions('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Tab giao diện: ?isInvestor=true (chủ đầu tư) | false (nhân viên)
  @Get()
  findAll(
    @Query('includeDeleted') includeDeleted?: string,
    @Query('isInvestor') isInvestor?: string,
  ) {
    return this.usersService.findAll({
      includeDeleted: includeDeleted === 'true',
      isInvestor: isInvestor === undefined ? undefined : isInvestor === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // Xoá mềm (isDeleted = true)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.restore(id);
  }
}
