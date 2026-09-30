import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

// Vị trí (node cây) trong 1 site. parentId null = vị trí gốc của site.
export class CreateSiteLocationDto {
  // Bắt buộc: vị trí luôn thuộc 1 site
  @Type(() => Number)
  @IsInt()
  siteId!: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  // null = vị trí gốc
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;
}
