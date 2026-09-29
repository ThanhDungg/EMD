import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { ContractsService } from './contracts.service.js';
import { UpdateContractDocumentDto } from './dto/update-contract-document.dto.js';

// Sửa / xoá đường dẫn tài liệu của hợp đồng (thêm dùng chung
// POST /workflow/contracts/:id/documents trong ContractsController).
@Controller('workflow/contract-documents')
export class ContractDocumentsController {
  constructor(private readonly contractsService: ContractsService) {}

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDocumentDto,
  ) {
    return this.contractsService.updateDocument(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contractsService.removeDocument(id);
  }
}
