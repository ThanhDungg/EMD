import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionDto } from './create-permission.dto.js';

export class UpdatePermissionDto extends PartialType(CreatePermissionDto) {}
