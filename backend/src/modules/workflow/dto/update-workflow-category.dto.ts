import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowCategoryDto } from './create-workflow-category.dto.js';

export class UpdateWorkflowCategoryDto extends PartialType(
  CreateWorkflowCategoryDto,
) {}
