import { apiClient } from '@/shared/api';
import type { AuthResponse, LoginPayload } from '../model/login';

// API đăng nhập của trang này. Backend sẽ cung cấp POST /auth/login sau.
export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login', payload);
}
