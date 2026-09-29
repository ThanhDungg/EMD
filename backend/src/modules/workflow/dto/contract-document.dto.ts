import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

// Đường dẫn tài liệu của hợp đồng: tên tài liệu + url/path gốc
// (sau khi lưu, client hiển thị bằng thẻ <a>).
export class CreateContractDocumentDto {
  @IsString()
  name!: string;

  @IsString()
  path!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
