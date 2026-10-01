import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';

// Helper phân quyền theo vai trò dùng chung cho các service:
// - canViewAll: ADMIN / CEO / HO xem toàn bộ dữ liệu (không lọc theo dự án).
// - isTechnicianOnly: nhân viên kỹ thuật thuần tuý (không có quyền cao hơn)
//   chỉ thấy công việc được giao cho mình thực hiện.
// - userSiteIds: các dự án user được thấy = quản lý (managerId) hoặc thành
//   viên (site_members). QLDA thấy dự án mình quản lý, Giám sát vùng thấy
//   các dự án được gán (qua bảng thành viên dự án).
export function canViewAll(permissions: string[] | undefined): boolean {
  if (!permissions) return false;
  return (
    permissions.includes('ADMIN') ||
    permissions.includes('CEO') ||
    permissions.includes('HO')
  );
}

/** true = quản trị hệ thống hoặc CEO (ẩn menu quản trị với các vai trò còn lại). */
export function canAdminister(permissions: string[] | undefined): boolean {
  if (!permissions) return false;
  return permissions.includes('ADMIN') || permissions.includes('CEO');
}

export function isTechnicianOnly(permissions: string[] | undefined): boolean {
  if (!permissions || canViewAll(permissions)) return false;
  return permissions.includes('TECHNICIAN');
}

/** Được quản lý dữ liệu trong dự án của mình (QLDA/GSV + các vai trò xem tất cả). */
export function canManageSites(permissions: string[] | undefined): boolean {
  if (!permissions) return false;
  return (
    canViewAll(permissions) ||
    permissions.includes('PROJECT_MANAGER') ||
    permissions.includes('REGION_SUPERVISOR')
  );
}

/** Id các site chưa xoá mà user là quản lý hoặc thành viên. */
export async function userSiteIds(
  prisma: PrismaService,
  userId: number,
): Promise<number[]> {
  const sites = await prisma.site.findMany({
    where: {
      isDeleted: false,
      OR: [{ managerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return sites.map((s) => s.id);
}

/** Chặn khi site nằm ngoài phạm vi của user (dùng cho read + create). */
export function assertSiteInScope(
  siteId: number,
  scopeSiteIds: number[] | null,
): void {
  // null = xem tất cả (ADMIN/CEO/HO), không cần kiểm tra.
  if (scopeSiteIds === null) return;
  if (!scopeSiteIds.includes(siteId)) {
    throw new ForbiddenException(
      `Bạn không có quyền truy cập dự án #${siteId}.`,
    );
  }
}
