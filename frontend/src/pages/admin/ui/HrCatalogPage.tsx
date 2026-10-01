// pages/admin/ui/HrCatalogPage — danh mục nhân sự: chức vụ, cấp bậc,
// đơn vị, trạng thái. Dùng chung DroplistCard (thêm/sửa/xoá mã + tên).
import { Tabs, Typography } from 'antd';
import { HR_DROPLIST_KEYS } from '@/entities/droplist';
import { DROPLIST_META } from '@/entities/droplist';
import { DroplistCard } from '@/pages/shared';
import { BodyCard } from '@/shared/ui';

const { Text } = Typography;

export function HrCatalogPage() {
  return (
    <BodyCard title="Danh mục nhân sự">
      <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
        Các danh mục dùng trong hồ sơ nhân viên và tài khoản chủ đầu tư: thêm
        mã + tên, xoá mềm khi không dùng nữa.
      </Text>
      <Tabs
        defaultActiveKey="position"
        items={HR_DROPLIST_KEYS.map((key) => ({
          key,
          label: DROPLIST_META[key].label,
          children: <DroplistCard droplistKey={key} />,
        }))}
      />
    </BodyCard>
  );
}
