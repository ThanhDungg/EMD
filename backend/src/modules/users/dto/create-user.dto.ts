import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Gender } from '../../../generated/prisma/client.js';

export class CreateUserDto {
  @IsString()
  accountName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  internalPhone?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userLevel?: number;

  // Ảnh đại diện / chữ ký điện tử: lưu path file
  @IsOptional()
  @IsString()
  avatarPath?: string;

  @IsOptional()
  @IsString()
  signaturePath?: string;

  // --- Droplist FK ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  positionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  coDepartmentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusId?: number;

  // --- Quản lý trực tiếp: id của user khác ---
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerId?: number;

  // --- Droplist chọn nhiều: dự án ---
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  projectIds?: number[];

  // --- Nhóm (M2M) ---
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  groupIds?: number[];

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  // true = chủ đầu tư (hiện tab riêng), false = nhân viên
  @IsOptional()
  @IsBoolean()
  isInvestor?: boolean;
}
