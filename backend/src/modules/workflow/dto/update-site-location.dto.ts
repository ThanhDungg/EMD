import { PartialType } from '@nestjs/mapped-types';
import { CreateSiteLocationDto } from './create-site-location.dto.js';

export class UpdateSiteLocationDto extends PartialType(CreateSiteLocationDto) {}
