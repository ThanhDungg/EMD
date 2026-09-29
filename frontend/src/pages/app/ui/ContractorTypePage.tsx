// pages/app/ui/ContractorTypePage — danh mục loại nhà thầu: mã loại, tên loại.
// Dùng chung DroplistCard với các bảng droplist khác.
import { Typography } from 'antd';
import { DroplistCard } from '@/pages/shared';

const { Text } = Typography;

export function ContractorTypePage() {
  return (
    <div style={{ marginBottom: 16 }}>
      <Text type="secondary">
        Danh mục loại nhà thầu dùng chung cho danh sách nhà thầu: mã loại và
        tên loại.
      </Text>
    </div>
  );
}

export function ContractorTypeTable() {
  return <DroplistCard droplistKey="contractorType" />;
}
