import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SaveCompanyProfileDto {
  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoPath?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Giới thiệu ứng dụng phần mềm (hiện tab Trang chủ)
  @IsOptional()
  @IsString()
  appIntro?: string;
}
