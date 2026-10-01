import { Module } from '@nestjs/common';
import { PasswordService } from '../../common/crypto/index.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

import { UsersExcelService } from './users-excel.service.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersExcelService, PasswordService],
  exports: [UsersService, PasswordService],
})
export class UsersModule {}
