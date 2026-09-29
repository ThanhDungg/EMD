import { PartialType } from '@nestjs/mapped-types';
import {
  CreateMasterplanCategoryDto,
  CreateMasterplanSystemDto,
  CreateMasterplanTaskDto,
} from './create-masterplan.dto.js';

export class UpdateMasterplanSystemDto extends PartialType(
  CreateMasterplanSystemDto,
) {}
export class UpdateMasterplanCategoryDto extends PartialType(
  CreateMasterplanCategoryDto,
) {}
export class UpdateMasterplanTaskDto extends PartialType(
  CreateMasterplanTaskDto,
) {}
