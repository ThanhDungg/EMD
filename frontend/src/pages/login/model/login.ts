// pages/login/model — types + chuẩn hoá dữ liệu của riêng trang đăng nhập.
// (Chỉ dùng ở đây nên giữ trong page, chưa extract lên entities/features.)

// Giá trị form đăng nhập (tài khoản + mật khẩu + lưu tài khoản)
export interface LoginFormValues {
  account: string;
  password: string;
  remember: boolean;
}

// Payload gửi lên API
export interface LoginPayload {
  account: string;
  password: string;
}

// Kết quả đăng nhập do backend trả về (khớp khi backend làm API /auth/login)
export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: number;
    email: string;
    name?: string | null;
  };
}

export function toLoginPayload(values: LoginFormValues): LoginPayload {
  return {
    account: values.account.trim(),
    password: values.password,
  };
}
