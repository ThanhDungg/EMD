import { Body, Controller, Get, Put } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CompanyProfileService } from './company-profile.service.js';
import { SaveCompanyProfileDto } from './dto/save-company-profile.dto.js';

@Controller('workflow/company-profile')
export class CompanyProfileController {
  constructor(private readonly companyService: CompanyProfileService) {}

  @Get()
  get() {
    return this.companyService.get();
  }

  @RequirePermissions('ADMIN')
  @Put()
  save(@Body() dto: SaveCompanyProfileDto) {
    return this.companyService.save(dto);
  }
}
