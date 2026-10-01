import { PartialType } from '@nestjs/mapped-types';
import { CreateDashboardDto } from './create-dashboard.dto.js';

export class UpdateDashboardDto extends PartialType(CreateDashboardDto) {}
