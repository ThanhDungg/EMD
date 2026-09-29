import { PartialType } from '@nestjs/mapped-types';
import { CreateDroplistDto } from './create-droplist.dto.js';

export class UpdateDroplistDto extends PartialType(CreateDroplistDto) {}
