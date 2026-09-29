// shared/api/upload — API lưu ảnh đính kèm.
// Ảnh nằm ngoài thư mục public của backend nên xem ảnh phải qua
// GET /uploads/file?path=... (có Bearer token), không gán thẳng vào <img src>.
import { getToken } from '@/shared/auth';
import { apiClient } from './client';

/** 1 ảnh backend vừa lưu. */
export interface UploadedImage {
  /** Path tương đối, đưa vào mảng `attachments` của checklist/energy. */
  path: string;
  name: string;
  mimeType: string;
  size: number;
  photoLat?: number;
  photoLng?: number;
  photoTakenAt?: string;
}

/** Lat/long + giờ chụp do client (điện thoại) gửi kèm, backend chỉ echo lại. */
export interface UploadImageMeta {
  photoLat?: number;
  photoLng?: number;
  photoTakenAt?: string;
}

export const UPLOAD_ACCEPT = 'image/*';
export const UPLOAD_MAX_FILES = 10;
export const UPLOAD_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload nhiều ảnh 1 lần. Backend giới hạn 10 file/request và 10MB mỗi file —
 * client tự chia nhỏ nên không cần gửi vượt.
 */
export async function uploadImages(
  files: File[],
  meta: UploadImageMeta = {},
): Promise<UploadedImage[]> {
  const chunks: UploadedImage[] = [];
  for (let i = 0; i < files.length; i += UPLOAD_MAX_FILES) {
    const form = new FormData();
    for (const file of files.slice(i, i + UPLOAD_MAX_FILES)) {
      form.append('files', file);
    }
    if (meta.photoLat !== undefined)
      form.append('photoLat', String(meta.photoLat));
    if (meta.photoLng !== undefined)
      form.append('photoLng', String(meta.photoLng));
    if (meta.photoTakenAt) form.append('photoTakenAt', meta.photoTakenAt);
    const res = await apiClient.upload<{ files: UploadedImage[] }>(
      '/uploads/images',
      form,
      getToken() ?? undefined,
    );
    chunks.push(...res.files);
  }
  return chunks;
}
