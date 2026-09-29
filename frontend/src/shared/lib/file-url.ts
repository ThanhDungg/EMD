// Phân biệt ảnh với tệp khác để render đúng kiểu (xem shared/ui/image-gallery).
// Ảnh nằm ngoài public của backend nên không gán path thẳng vào src được —
// dùng useFileUrl/openStoredFile trong ./image-blob.
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|heic|avif|svg)$/i;

export function isImageFile(path: string): boolean {
  return IMAGE_EXT.test(path);
}

/** Tải Blob về máy (dùng cho xuất Excel, file mẫu...). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
