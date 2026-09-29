import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowStatusDto } from './create-workflow-status.dto.js';

export class UpdateWorkflowStatusDto extends PartialType(
  CreateWorkflowStatusDto,
) {}
