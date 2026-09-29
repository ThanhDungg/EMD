import { PartialType } from '@nestjs/mapped-types';
import { CreateContractorDto } from './create-contractor.dto.js';

export class UpdateContractorDto extends PartialType(CreateContractorDto) {}
