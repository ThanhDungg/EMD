import { PartialType } from '@nestjs/mapped-types';
import { CreateSiteDetailDto } from './site-detail.dto.js';

// Sửa dòng của 5 bảng con: không đổi dự án (siteId) — muốn chuyển dự án thì
// xoá rồi thêm lại.
export class UpdateSiteDetailDto extends PartialType(CreateSiteDetailDto) {}
