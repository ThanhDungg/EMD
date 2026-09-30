// Chỉ nhận ảnh. Extension lấy từ mime (không tin tên file gốc) để không bị
// đặt nhầm đuôi — file tải lên tên kiểu "shell.php" vẫn lưu thành ".jpg".
export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/heic': 'heic',
  'image/avif': 'avif',
};

// Nội dung file phải khớp mime khai báo, nếu không 1 file .jpg giả mạo
// vẫn có thể bị render lại thành script (stored XSS).
export const IMAGE_MAGIC_BYTES: { mime: string; bytes: number[] }[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  {
    mime: 'image/webp',
    // "RIFF" .... "WEBP"
    bytes: [0x52, 0x49, 0x46, 0x46],
  },
  { mime: 'image/bmp', bytes: [0x42, 0x4d] },
  {
    mime: 'image/avif',
    // .... "ftyp" + "avif"/"avis"
    bytes: [0x66, 0x74, 0x79, 0x70],
  },
];

// heic/avif đều dùng hộp "ftyp" nên kiểm tra chung một nhóm.
export const FYP_BOX_MIMES = new Set(['image/heic', 'image/avif']);

// Path lưu trong DB: [<basePath>/]<YYYY>/<MM>/<uuid>.<ext>
// Nhóm 1 = basePath, nhóm 2 = năm, nhóm 3 = tháng, nhóm 4 = tên file.
// Dấu / đầu tuỳ chọn vì path đi qua query string. Hình dạng 4 đoạn là cứng
// nên không lọc được path traversal; thêm kiểm tra nằm trong thư mục upload
// ở UploadsService.openStored.
export const STORED_PATH_RE =
  /^\/?([A-Za-z0-9_-]+)\/(\d{4})\/(\d{2})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp|gif|bmp|heic|avif)$/;
