// pages/assets/ui/AssetDroplistPage — module Tài sản: các card nhập dữ liệu
// danh mục (danh mục tài sản · đơn vị tính · trạng thái dùng · tình trạng)
// và card "Vị trí" quản lý cây vị trí theo dự án.
// Card "Vị trí" dùng lại đúng component với trang sidebar "Vị trí" để không
// có 2 chỗ sửa cùng 1 bảng site_locations.
import { ASSET_DROPLIST_KEYS } from '@/entities/droplist';
import { DroplistCard } from '@/pages/shared';
import { SiteLocationManager } from './SiteLocationManager';

export function AssetDroplistPage() {
  return (
    <>
      {ASSET_DROPLIST_KEYS.map((key) => (
        <DroplistCard key={key} droplistKey={key} />
      ))}
      <SiteLocationManager description="Cây vị trí theo từng dự án (tầng → phòng → vị trí nhỏ). Tài sản và sự cố đều gắn vào 1 vị trí trong cây này." />
    </>
  );
}
