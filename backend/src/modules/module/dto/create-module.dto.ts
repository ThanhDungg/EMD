import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  vnName!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  engName?: string;

  @IsOptional()
  @IsString()
  image?: string;

  // Quyền xem: danh sách user (M2M)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  viewerUserIds?: number[];

  // Quyền xem: danh sách group (M2M)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  viewerGroupIds?: number[];
}
