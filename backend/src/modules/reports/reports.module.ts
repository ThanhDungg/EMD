import { Module } from '@nestjs/common';
import { ReportsDataService } from './reports-data.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportsDataService],
  exports: [ReportsService],
})
export class ReportsModule {}
