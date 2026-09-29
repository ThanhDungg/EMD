// entities/asset/model — kiểu dữ liệu module Tài sản.
// Cây vị trí thuộc site; tài sản gắn vào 1 node vị trí; 4 bảng droplist
// (danh mục tài sản · đơn vị tính · trạng thái dùng · tình trạng).

/** 1 node vị trí trong cây vị trí của 1 site. */
export interface SiteLocationNode {
  id: number;
  uuid: string;
  code?: string | null;
  name: string;
  parentId: number | null;
  siteId: number;
  sortOrder: number;
  children: SiteLocationNode[];
}

/** Bản phẳng của cây vị trí (dùng cho bảng hiển thị). */
export type SiteLocationFlat = Omit<SiteLocationNode, 'children'> & {
  depth: number;
};

/** Node droplist dùng chung (code? / name). */
export interface AssetDroplistItem {
  id: number;
  code?: string | null;
  name: string;
}

export type AssetDroplistKey =
  'category' | 'unit' | 'usageStatus' | 'condition';

export const ASSET_DROPLIST_LABEL: Record<AssetDroplistKey, string> = {
  category: 'Danh mục tài sản',
  unit: 'Đơn vị tính',
  usageStatus: 'Trạng thái dùng',
  condition: 'Tình trạng',
};

export interface AssetRef {
  id: number;
  code?: string | null;
  name: string;
}

/** 1 tài sản / thiết bị. */
export interface AssetItem {
  id: number;
  uuid: string;
  code: string;
  name: string;
  // Ngày đưa vào sử dụng
  usageDate?: string | null;
  // Trạng thái dùng (droplist)
  usageStatusId?: number | null;
  usageStatus?: AssetRef | null;
  // Danh mục tài sản (droplist)
  categoryId?: number | null;
  category?: AssetRef | null;
  // Vị trí đặt tài sản (thuộc 1 site)
  locationId?: number | null;
  location?:
    | (AssetRef & {
        parentId?: number | null;
        siteId: number;
        site?: { id: number; name: string } | null;
      })
    | null;
  // Nhà cung cấp / xuất xứ / model
  supplier?: string | null;
  origin?: string | null;
  model?: string | null;
  // Số lượng + đơn vị tính (droplist)
  quantity?: string | number | null;
  unitId?: number | null;
  unit?: AssetRef | null;
  // Hạn bảo hành
  warrantyEnd?: string | null;
  // Tình trạng (droplist)
  conditionId?: number | null;
  condition?: AssetRef | null;
  remarks?: string | null;
  detail?: string | null;
}

export interface AssetFilters {
  siteId?: number;
  locationId?: number;
  categoryId?: number;
  usageStatusId?: number;
  conditionId?: number;
  keyword?: string;
  includeDeleted?: boolean;
}

/** Payload tạo/sửa tài sản. */
export interface AssetPayload {
  code: string;
  name: string;
  usageDate?: string;
  usageStatusId?: number | null;
  categoryId?: number | null;
  locationId?: number | null;
  supplier?: string;
  origin?: string;
  model?: string;
  quantity?: number | null;
  unitId?: number | null;
  warrantyEnd?: string;
  conditionId?: number | null;
  remarks?: string;
  detail?: string;
}

export interface SiteLocationPayload {
  siteId: number;
  name: string;
  code?: string;
  parentId?: number | null;
  sortOrder?: number;
}

/** Dàn cây vị trí thành list phẳng (giữ thứ tự cha → con) + độ sâu. */
export function flattenLocations(
  nodes: SiteLocationNode[],
  depth = 0,
): SiteLocationFlat[] {
  const out: SiteLocationFlat[] = [];
  for (const n of nodes) {
    const { children, ...rest } = n;
    out.push({ ...rest, depth });
    if (children && children.length > 0) {
      out.push(...flattenLocations(children, depth + 1));
    }
  }
  return out;
}

/** Đường dẫn đầy đủ của 1 node: "Tầng 1 / Hành chính / Phòng kế toán". */
export function locationPath(
  nodes: SiteLocationNode[],
  targetId: number,
): string | null {
  const walk = (list: SiteLocationNode[], trail: string[]): string | null => {
    for (const n of list) {
      const next = [...trail, n.name];
      if (n.id === targetId) return next.join(' / ');
      const found = walk(n.children ?? [], next);
      if (found) return found;
    }
    return null;
  };
  return walk(nodes, []);
}

// ---------------- Nhập tài sản bằng Excel ----------------

/** 1 lỗi của 1 dòng khi import. Backend trả về, dùng để hiển thị bảng lỗi. */
export interface AssetImportError {
  /** Số dòng trong file Excel (dòng 1 là tiêu đề). */
  row: number;
  column: string;
  message: string;
}

/** Kết quả import thành công. */
export interface AssetImportResult {
  total: number;
  created: number;
  firstCode: string;
  lastCode: string;
}

/** Backend đã kiểm tra cả file, có lỗi thì không ghi gì. */
export interface AssetImportFailure {
  message: string;
  errors: AssetImportError[];
  hiddenErrorCount: number;
}

/** Định dạng file và dung lượng tối đa — khớp với giới hạn backend. */
export const ASSET_IMPORT_ACCEPT = '.xlsx';
export const ASSET_IMPORT_MAX_SIZE = 5 * 1024 * 1024;

/** Kết quả import cây vị trí thành công. */
export interface LocationImportResult {
  total: number;
  created: number;
  updated: number;
}
