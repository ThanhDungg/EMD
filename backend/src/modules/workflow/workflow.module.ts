import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ContractDocumentsController } from './contract-documents.controller.js';
import { ContractorsController } from './contractors.controller.js';
import { ContractorsService } from './contractors.service.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { DroplistsController } from './droplists.controller.js';
import { GeoController } from './geo.controller.js';
import { GeoService } from './geo.service.js';
import { DroplistsService } from './droplists.service.js';
import { AssetsController } from './assets.controller.js';
import { AssetsExcelService } from './assets-excel.service.js';
import { AssetsService } from './assets.service.js';
import { ChecklistController } from './checklist.controller.js';
import { ChecklistService } from './checklist.service.js';
import { CompanyProfileController } from './company-profile.controller.js';
import { CompanyProfileService } from './company-profile.service.js';
import {
  EnergyChecksController,
  EnergyMetersController,
  EnergyReadingsController,
} from './energy.controller.js';
import { EnergyChecksService } from './energy-checks.service.js';
import { EnergyMetersService } from './energy-meters.service.js';
import { IncidentDetailsController } from './incident-details.controller.js';
import { InvestorsController } from './investors.controller.js';
import { InvestorsService } from './investors.service.js';
import { IncidentDetailsService } from './incident-details.service.js';
import { IncidentTypesController } from './incident-types.controller.js';
import { IncidentTypesService } from './incident-types.service.js';
import {
  MasterplanCategoriesController,
  MasterplanSystemsController,
  MasterplanTasksController,
} from './masterplan.controller.js';
import { MasterplanCategoriesService } from './masterplan-categories.service.js';
import { MasterplanSystemsService } from './masterplan-systems.service.js';
import { MasterplanTasksService } from './masterplan-tasks.service.js';
import { SiteDetailsController } from './site-details.controller.js';
import { SiteDetailsService } from './site-details.service.js';
import { SiteLocationsController } from './site-locations.controller.js';
import { SiteLocationsExcelService } from './site-locations-excel.service.js';
import { SiteLocationsService } from './site-locations.service.js';
import { SitesController } from './sites.controller.js';
import { SitesExcelService } from './sites-excel.service.js';
import { SitesService } from './sites.service.js';
import { WorkflowCategoriesController } from './workflow-categories.controller.js';
import { WorkflowCategoriesService } from './workflow-categories.service.js';
import { WorkflowStatusesController } from './workflow-statuses.controller.js';
import { WorkflowStatusesService } from './workflow-statuses.service.js';
import { WorkflowTasksController } from './workflow-tasks.controller.js';
import { WorkflowTasksService } from './workflow-tasks.service.js';
import { WorksController } from './works.controller.js';
import { WorksService } from './works.service.js';

@Module({
  // Nhập tài sản bằng Excel: giữ file trong RAM (multer mặc định) để đọc bằng
  // exceljs, không ghi tạm xuống đĩa. Giới hạn 5 MB cho 1 file .xlsx.
  imports: [
    MulterModule.register({
      limits: { files: 1, fileSize: 5 * 1024 * 1024 },
    }),
  ],
  controllers: [
    WorkflowCategoriesController,
    WorkflowStatusesController,
    WorkflowTasksController,
    WorksController,
    ChecklistController,
    EnergyChecksController,
    EnergyMetersController,
    EnergyReadingsController,
    IncidentDetailsController,
    MasterplanSystemsController,
    MasterplanCategoriesController,
    MasterplanTasksController,
    SitesController,
    SiteLocationsController,
    AssetsController,
    DroplistsController,
    GeoController,
    SiteDetailsController,
    CustomersController,
    InvestorsController,
    ContractorsController,
    ContractsController,
    ContractDocumentsController,
    IncidentTypesController,
    CompanyProfileController,
  ],
  providers: [
    WorkflowCategoriesService,
    WorkflowStatusesService,
    WorkflowTasksService,
    WorksService,
    ChecklistService,
    EnergyChecksService,
    EnergyMetersService,
    IncidentDetailsService,
    MasterplanSystemsService,
    MasterplanCategoriesService,
    MasterplanTasksService,
    SitesService,
    SitesExcelService,
    SiteLocationsService,
    SiteLocationsExcelService,
    AssetsService,
    AssetsExcelService,
    DroplistsService,
    GeoService,
    SiteDetailsService,
    CustomersService,
    InvestorsService,
    ContractorsService,
    ContractsService,
    IncidentTypesService,
    CompanyProfileService,
  ],
  exports: [WorkflowCategoriesService, WorkflowTasksService, WorksService, ChecklistService],
})
export class WorkflowModule {}
