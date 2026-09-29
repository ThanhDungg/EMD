import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';

// Update: tất cả field optional, accountName/email/password vẫn validate khi có
export class UpdateUserDto extends PartialType(CreateUserDto) {}
