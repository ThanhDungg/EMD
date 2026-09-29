import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  WorkflowPriority,
  WorkflowTaskStatus,
} from '../../../generated/prisma/client.js';

export class CreateWorkflowTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  // Người thực hiện (người giao = user đang đăng nhập, tự gắn ở API)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigneeId?: number;

  @IsOptional()
  @IsEnum(WorkflowTaskStatus)
  status?: WorkflowTaskStatus;

  @IsOptional()
  @IsEnum(WorkflowPriority)
  priority?: WorkflowPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
