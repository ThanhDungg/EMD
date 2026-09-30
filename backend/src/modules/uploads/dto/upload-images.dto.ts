import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

// Client đính kèm ảnh chụp trên điện thoại nên gửi kèm toạ độ + giờ chụp.
// API chỉ echo lại để client gửi tiếp sang POST /workflow/checklists
// (checklist_items.photo_lat / photo_lng / photo_taken_at).
export class UploadImagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  photoLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  photoLng?: number;

  @IsOptional()
  @IsString()
  photoTakenAt?: string;
}
