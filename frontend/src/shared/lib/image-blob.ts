// shared/lib/image-blob — ảnh đính kèm lưu ngoài public của backend nên
// không gán thẳng path vào <img src> được. Tải qua API (có Bearer token)
// rồi đổi thành object URL, cache lại theo path để không tải 2 lần.
import { useEffect, useState } from 'react';
import { fetchBlob } from '@/shared/api';
import { getToken } from '@/shared/auth';
import { env } from '@/shared/config';

/** Path tuyệt đối (http/https) thì xem trực tiếp, không cần qua API. */
export function isExternalUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/** Đường dẫn API đọc 1 file đã lưu. */
export function storedFilePath(path: string): string {
  return `${env.apiUrl}/uploads/file?path=${encodeURIComponent(path.replace(/^\/+/, ''))}`;
}

const objectUrls = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/** object URL của 1 file (ảnh hoặc tài liệu), cache suốt phiên làm việc. */
export function loadFileUrl(path: string): Promise<string> {
  if (isExternalUrl(path)) return Promise.resolve(path);
  const cached = objectUrls.get(path);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(path);
  if (running) return running;

  const task = fetchBlob(storedFilePath(path), getToken() ?? undefined)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      objectUrls.set(path, url);
      return url;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, task);
  return task;
}

/** object URL đã tải xong, hoặc undefined nếu chưa có/lỗi. */
export function useFileUrl(
  path: string | null | undefined,
): string | undefined {
  const [loaded, setLoaded] = useState<{ path: string; url: string } | null>(
    null,
  );

  useEffect(() => {
    if (!path || isExternalUrl(path)) return;
    if (objectUrls.has(path)) return;
    let alive = true;
    loadFileUrl(path)
      .then((url) => {
        if (alive) setLoaded({ path, url });
      })
      .catch(() => {
        // Ảnh hỏng / không đọc được: giữ ô trống thay vì vỡ cả bảng.
      });
    return () => {
      alive = false;
    };
  }, [path]);

  if (!path) return undefined;
  if (isExternalUrl(path)) return path;
  if (loaded?.path === path) return loaded.url;
  return objectUrls.get(path);
}

/**
 * Mở file không phải ảnh (pdf, docx...) ở tab mới. <a href> không gắn được
 * Bearer token nên phải tải blob trước rồi mới mở.
 */
export async function openStoredFile(path: string): Promise<void> {
  const url = isExternalUrl(path)
    ? path
    : await loadFileUrl(path).catch(() => null);
  if (!url) throw new Error('Không tải được tệp.');
  if (isExternalUrl(path)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const tab = window.open(url, '_blank', 'noopener,noreferrer');
  if (!tab) window.location.href = url;
}
