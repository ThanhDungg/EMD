import { PartialType } from '@nestjs/mapped-types';
import { CreateContractDocumentDto } from './contract-document.dto.js';

export class UpdateContractDocumentDto extends PartialType(
  CreateContractDocumentDto,
) {}
