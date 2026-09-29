import { env } from '@/shared/config';
import {
  clearToken,
  getRefreshToken,
  setRefreshToken,
  setToken,
} from '@/shared/auth';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  /** Gửi FormData (multipart) — tự bỏ Content-Type để browser tự set boundary */
  formData?: FormData;
  headers?: Record<string, string>;
  token?: string;
  /** Đã thử refresh 1 lần (chống lặp vô hạn) */
  retried?: boolean;
}

// Giữ 1 promise refresh duy nhất để không bắn N request /auth/refresh cùng lúc
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return null;
        const res = await fetch(`${env.apiUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          accessToken: string;
          refreshToken?: string;
        };
        setToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/** Gửi request kèm Bearer token, tự refresh 1 lần nếu access token hết hạn. */
async function send(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const {
    method = 'GET',
    body,
    formData,
    headers = {},
    token,
    retried = false,
  } = options;

  const res = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers: {
      // FormData phải để browser tự sinh Content-Type kèm boundary.
      ...(formData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(formData
      ? { body: formData }
      : body
        ? { body: JSON.stringify(body) }
        : {}),
  });

  // Access token hết hạn (15 phút): tự đổi cặp token mới rồi gọi lại 1 lần.
  // Bỏ qua chính API auth để không lặp (sai pass vẫn 401 bình thường).
  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    const fresh = await refreshAccessToken();
    if (fresh) return send(path, { ...options, token: fresh, retried: true });
    // Refresh cũng hết hạn → về màn hình đăng nhập
    clearToken();
    window.location.reload();
    throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  }

  return res;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await send(path, options);

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${message}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body, token }),
  put: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PUT', body, token }),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body, token }),
  remove: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
  upload: <T>(path: string, formData: FormData, token?: string) =>
    request<T>(path, { method: 'POST', formData, token }),
};

/**
 * Tải file dạng blob (ảnh đính kèm, tài liệu) — ảnh nằm ngoài public nên
 * không gán thẳng URL vào <img src> được, phải qua đây để có Bearer token.
 */
export async function fetchBlob(path: string, token?: string): Promise<Blob> {
  const res = await send(path, { method: 'GET', token });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${message}`);
  }
  return res.blob();
}
