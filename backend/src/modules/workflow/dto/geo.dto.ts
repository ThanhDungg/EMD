import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export type GeoKey = 'country' | 'region' | 'province' | 'ward';

// 1 dòng droplist địa lý. `parentId` là id của tầng trên (quốc gia cho miền,
// miền cho tỉnh thành, tỉnh thành cho phường xã).
export class CreateGeoDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number;
}
