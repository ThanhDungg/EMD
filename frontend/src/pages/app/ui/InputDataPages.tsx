// pages/app/ui/InputDataPages — "Dữ liệu input" (mục NỘI BỘ IT): các danh mục
// địa lý dùng làm dữ liệu đầu vào cho hồ sơ (quốc gia, tỉnh thành, phường xã).
import { GeoLevelTable } from './GeoLevelTable';

/** Danh sách quốc gia. */
export function InputDataCountryPage() {
  return <GeoLevelTable level="country" title="Danh sách quốc gia" />;
}

/** Danh sách miền (tầng giữa của địa lý phân cấp). */
export function InputDataRegionPage() {
  return (
    <GeoLevelTable
      level="region"
      title="Danh sách miền"
      parentKey="country"
      parentLabel="Quốc gia"
    />
  );
}

/**
 * Danh sách tỉnh thành. Tỉnh thuộc miền nên phải chọn miền ở ô lọc bên trên
 * (danh mục miền quản lý ở trang "Danh sách miền" cùng mục Dữ liệu input).
 */
export function InputDataProvincePage() {
  return (
    <GeoLevelTable
      level="province"
      title="Danh sách tỉnh thành"
      parentKey="region"
      parentLabel="Miền"
    />
  );
}

/** Danh sách phường xã (thuộc tỉnh thành). */
export function InputDataWardPage() {
  return (
    <GeoLevelTable
      level="ward"
      title="Danh sách phường xã"
      parentKey="province"
      parentLabel="Tỉnh thành"
    />
  );
}
