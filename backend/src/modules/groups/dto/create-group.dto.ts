import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  image?: string;

  // Quyền của group (add quyền HO/ADMIN/CEO/... vào đây)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  permissionIds?: number[];

  // Người dùng thuộc group (M2M)
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds?: number[];
}
