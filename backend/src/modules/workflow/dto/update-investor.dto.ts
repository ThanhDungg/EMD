import { PartialType } from '@nestjs/mapped-types';
import { CreateInvestorDto } from './create-investor.dto.js';

export class UpdateInvestorDto extends PartialType(CreateInvestorDto) {}
