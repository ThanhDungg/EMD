import { IsString, MinLength } from 'class-validator';

// Đăng nhập quốc tế: 1 field "account" nhận cả accountName lẫn email
export class LoginDto {
  @IsString()
  account!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
