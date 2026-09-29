import { IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
