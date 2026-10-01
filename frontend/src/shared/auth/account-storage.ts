// shared/auth — hạ tầng auth dùng chung toàn app (không business logic).
// Theo FSD: token/session lưu ở shared, form đăng nhập nằm ở pages/login.

const TOKEN_KEY = 'emd_auth_token';
const REFRESH_TOKEN_KEY = 'emd_refresh_token';
const SAVED_ACCOUNT_KEY = 'emd_saved_account';

// --- access token (dùng cho các API cần xác thực) ---
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Bỏ qua khi storage không khả dụng (vd: chặn cookie)
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Bỏ qua
  }
}

// --- refresh token (đổi cặp token mới khi access hết hạn) ---
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // Bỏ qua khi storage không khả dụng (vd: chặn cookie)
  }
}

// --- tài khoản được lưu (checkbox "Lưu tài khoản" ở màn hình đăng nhập) ---
export function getSavedAccount(): string | null {
  try {
    return localStorage.getItem(SAVED_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export function saveAccount(account: string): void {
  try {
    localStorage.setItem(SAVED_ACCOUNT_KEY, account);
  } catch {
    // Bỏ qua
  }
}

export function clearSavedAccount(): void {
  try {
    localStorage.removeItem(SAVED_ACCOUNT_KEY);
  } catch {
    // Bỏ qua
  }
}
