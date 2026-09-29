import { PartialType } from '@nestjs/mapped-types';
import { CreateChecklistItemDto } from './create-checklist-item.dto.js';

export class UpdateChecklistItemDto extends PartialType(
  CreateChecklistItemDto,
) {}
