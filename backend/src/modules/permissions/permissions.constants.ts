// Nguồn chân lý duy nhất cho hệ thống quyền:
// - prisma/seed.ts dùng để nạp quyền mặc định
// - JwtAuthGuard dùng rank để so thứ bậc
// Thứ tự (rank cao hơn = quyền lớn hơn):
// ADMIN > CEO > HO > PROJECT_MANAGER > TECHNICIAN > SECURITY_GUARD > INVESTOR
// Đây là quyền theo VAI TRÒ. Quyền chức năng theo module sẽ thêm sau khi
// bảng quyền được mở rộng.
export interface SystemPermission {
  code: string;
  name: string;
  rank: number;
}

export const SYSTEM_PERMISSIONS: SystemPermission[] = [
  { code: 'ADMIN', name: 'Quản trị viên', rank: 100 },
  { code: 'CEO', name: 'CEO', rank: 90 },
  { code: 'HO', name: 'HO', rank: 80 },
  { code: 'PROJECT_MANAGER', name: 'Quản lý dự án', rank: 70 },
  { code: 'TECHNICIAN', name: 'Nhân viên kỹ thuật', rank: 60 },
  { code: 'SECURITY_GUARD', name: 'Nhân viên bảo vệ', rank: 50 },
  { code: 'INVESTOR', name: 'Chủ đầu tư', rank: 10 },
];

const RANK_BY_CODE = new Map(SYSTEM_PERMISSIONS.map((p) => [p.code, p.rank]));

// Rank cao nhất trong danh sách code quyền (code lạ = 0)
export function highestRankOf(codes: string[]): number {
  let max = 0;
  for (const code of codes) {
    const rank = RANK_BY_CODE.get(code) ?? 0;
    if (rank > max) max = rank;
  }
  return max;
}
