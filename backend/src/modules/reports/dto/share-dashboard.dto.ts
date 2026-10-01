import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional } from 'class-validator';

// Gán lại toàn bộ danh sách chia sẻ của dashboard (thay thế, không cộng dồn).
export class ShareDashboardDto {
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  userIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  groupIds?: number[];
}
