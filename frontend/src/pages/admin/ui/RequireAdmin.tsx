// pages/admin/ui/RequireAdmin — chặn trang quản trị với vai trò không
// phải ADMIN/CEO (dù menu đã ẩn, người dùng vẫn có thể gõ URL trực tiếp).
import { Spin, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useMyPermissions } from '@/entities/user';
import { BodyCard } from '@/shared/ui';

const { Text } = Typography;

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: codes, isLoading } = useMyPermissions();

  if (isLoading) {
    return (
      <BodyCard title="Nhân sự & Phân quyền">
        <Spin />
      </BodyCard>
    );
  }

  const ok = (codes ?? []).some((c) => c === 'ADMIN' || c === 'CEO');
  if (!ok) {
    return (
      <BodyCard title="Không có quyền truy cập">
        <Text type="secondary">
          Trang này chỉ dành cho Quản trị viên và CEO. Mọi thao tác quản trị
          (người dùng, nhóm, danh mục nhân sự) đều cần quyền ADMIN ở server.
        </Text>
      </BodyCard>
    );
  }

  return <>{children}</>;
}
