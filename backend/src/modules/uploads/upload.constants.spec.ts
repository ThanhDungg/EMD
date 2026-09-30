import { describe, expect, it } from 'vitest';
import { STORED_PATH_RE } from './upload.constants.js';

const VALID = '/uploads/2026/09/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.jpg';

describe('STORED_PATH_RE', () => {
  it('chấp nhận path lưu đúng định dạng', () => {
    expect(STORED_PATH_RE.test(VALID)).toBe(true);
    expect(STORED_PATH_RE.test('/uploads/2026/09/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.png')).toBe(
      true,
    );
  });

  it('tách được basePath / năm / tháng / tên file', () => {
    const m = STORED_PATH_RE.exec(VALID);
    expect(m?.[1]).toBe('uploads');
    expect(m?.[2]).toBe('2026');
    expect(m?.[3]).toBe('09');
    expect(m?.[4]).toBe('3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607');
    expect(m?.[5]).toBe('jpg');
  });

  it('chặn path traversal', () => {
    expect(STORED_PATH_RE.test('/uploads/2026/09/../../etc/passwd')).toBe(false);
    expect(STORED_PATH_RE.test('/uploads/../secrets.jpg')).toBe(false);
    expect(STORED_PATH_RE.test('/uploads/2026/09/%2e%2e/x.jpg')).toBe(false);
    expect(STORED_PATH_RE.test('/uploads/2026/09/..%2f..%2fetc%2fpasswd')).toBe(false);
  });

  it('chặn file không phải ảnh', () => {
    expect(STORED_PATH_RE.test('/uploads/2026/09/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.pdf')).toBe(
      false,
    );
    expect(STORED_PATH_RE.test('/uploads/2026/09/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.html')).toBe(
      false,
    );
    expect(STORED_PATH_RE.test('/uploads/2026/09/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.svg')).toBe(
      false,
    );
  });

  it('chặn thư mục tự do và đường dẫn tuyệt đối', () => {
    expect(STORED_PATH_RE.test('/etc/passwd')).toBe(false);
    expect(STORED_PATH_RE.test('C:/Windows/win.ini')).toBe(false);
    expect(STORED_PATH_RE.test('/uploads/2026/09/notauuid.jpg')).toBe(false);
    expect(STORED_PATH_RE.test('/uploads/2026/9/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.jpg')).toBe(
      false,
    );
    // Thiếu dấu / ở đầu: vẫn chấp nhận vì path đi qua query string
    expect(STORED_PATH_RE.test('uploads/2026/09/3f2a1b6c-4d5e-4f70-8a91-b2c3d4e5f607.jpg')).toBe(
      true,
    );
  });
});
