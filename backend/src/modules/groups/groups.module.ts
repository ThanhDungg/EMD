import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller.js';
import { GroupsService } from './groups.service.js';

import { GroupsExcelService } from './groups-excel.service.js';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupsExcelService],
  exports: [GroupsService],
})
export class GroupsModule {}
