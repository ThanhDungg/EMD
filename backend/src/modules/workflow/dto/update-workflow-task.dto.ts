import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowTaskDto } from './create-workflow-task.dto.js';

export class UpdateWorkflowTaskDto extends PartialType(CreateWorkflowTaskDto) {}
