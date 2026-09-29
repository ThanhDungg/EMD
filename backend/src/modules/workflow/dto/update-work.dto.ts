import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateWorkDto } from './create-work.dto.js';
import { UpdateRecurrenceScheduleDto } from './recurrence-schedule.dto.js';

export class UpdateWorkDto extends PartialType(
  OmitType(CreateWorkDto, ['recurrence']),
) {
  // Ghi đè nested để PATCH schedule từng phần (VD chỉ { isActive: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateRecurrenceScheduleDto)
  recurrence?: UpdateRecurrenceScheduleDto;

  // Ghi chú kèm khi chuyển trạng thái — không phải cột works,
  // service tách ra lưu vào work_status_histories.note.
  @IsOptional()
  @IsString()
  statusNote?: string;
}
