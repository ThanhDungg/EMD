import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  CreateEnergyCheckDto,
  CreateEnergyMeterDto,
  CreateEnergyReadingDto,
} from './create-energy-check.dto.js';

export class UpdateEnergyCheckDto extends OmitType(
  PartialType(CreateEnergyCheckDto),
  ['meters'] as const,
) {}

export class UpdateEnergyMeterDto extends OmitType(
  PartialType(CreateEnergyMeterDto),
  ['readings'] as const,
) {}

export class UpdateEnergyReadingDto extends PartialType(
  CreateEnergyReadingDto,
) {}
