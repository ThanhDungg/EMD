import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { ContractsService } from './contracts.service.js';
import { CreateContractDocumentDto } from './dto/contract-document.dto.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { UpdateContractDto } from './dto/update-contract.dto.js';

// Hợp đồng (khai báo master data): /workflow/contracts
// GET trả kèm dự án (siteLinks) và đường dẫn tài liệu (documents).
@Controller('workflow/contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  findAll(@Query('includeDeleted') includeDeleted?: string) {
    return this.contractsService.findAll(includeDeleted === 'true');
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contractsService.findOne(id);
  }

  @RequirePermissions('ADMIN')
  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contractsService.create(dto);
  }

  @RequirePermissions('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContractDto) {
    return this.contractsService.update(id, dto);
  }

  @RequirePermissions('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contractsService.remove(id);
  }

  @RequirePermissions('ADMIN')
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.contractsService.restore(id);
  }

  // ---------- Đường dẫn tài liệu ----------

  @RequirePermissions('ADMIN')
  @Post(':id/documents')
  addDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateContractDocumentDto,
  ) {
    return this.contractsService.addDocument(id, dto);
  }
}
