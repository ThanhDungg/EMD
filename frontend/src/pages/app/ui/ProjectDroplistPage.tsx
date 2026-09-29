// pages/app/ui/ProjectDroplistPage — module Ứng dụng: danh mục dùng cho hồ sơ
// dự án — loại hình dịch vụ và dịch vụ cung cấp.
// (Phần địa lý đã chuyển sang mục NỘI BỘ IT → Dữ liệu input; chủ đầu tư chuyển
// sang khai báo master data.)
import { PROJECT_DROPLIST_KEYS } from '@/entities/droplist';
import { DroplistCard } from '@/pages/shared';

export function ProjectDroplistPage() {
  return (
    <>
      {PROJECT_DROPLIST_KEYS.map((key) => (
        <DroplistCard key={key} droplistKey={key} />
      ))}
    </>
  );
}
