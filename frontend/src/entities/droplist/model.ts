// entities/droplist/model — các bảng droplist dùng chung của hệ thống.
// Cùng shape (code? / name), mỗi bảng 1 key; backend phục vụ chung 1 endpoint
// /workflow/droplists/:key (xem DROPLISTS trong droplists.service.ts).

export type DroplistKey =
  // Module Tài sản
  | 'category'
  | 'unit'
  | 'usageStatus'
  | 'condition'
  // Module Ứng dụng (chi tiết sự cố hư hỏng)
  | 'repairType'
  | 'damageType'
  | 'picUnit'
  // Hồ sơ dự án (module Ứng dụng)
  | 'investor'
  | 'serviceType'
  | 'service'
  // Danh mục kiểm tra năng lượng
  | 'factory'
  // Chủ đầu tư cha (khai báo master data)
  | 'investorGroup'
  // Nhà thầu (khai báo master data)
  | 'contractorType';

export type ModuleCode =
  | 'WORKFLOW'
  | 'APPLICATIONS'
  | 'REPORTS'
  | 'ASSETS'
  | 'SYSTEM_ADMIN'
  | 'APP_CONFIG'
  | 'INTERNAL_CHAT'
  | 'INVESTOR_PORTAL';

export const DROPLIST_META: Record<
  DroplistKey,
  { label: string; module: ModuleCode; description: string }
> = {
  category: {
    label: 'Danh mục tài sản',
    module: 'ASSETS',
    description: 'Nhóm tài sản/thiết bị (điện, nước, điều hoà, băng tải...)',
  },
  unit: {
    label: 'Đơn vị tính',
    module: 'ASSETS',
    description: 'Đơn vị đo của số lượng tài sản (cái, bộ, mét, m³...)',
  },
  usageStatus: {
    label: 'Trạng thái dùng',
    module: 'ASSETS',
    description: 'Tài sản đang dùng / ngưng / hư hỏng / đã thanh lý',
  },
  condition: {
    label: 'Tình trạng tài sản',
    module: 'ASSETS',
    description: 'Tình trạng kỹ thuật của tài sản (tốt, khá, cần bảo trì...)',
  },
  repairType: {
    label: 'Phân loại sửa chữa',
    module: 'APPLICATIONS',
    description: 'Dùng ở trường Phân loại sửa chữa của chi tiết sự cố',
  },
  damageType: {
    label: 'Phân loại hư hỏng',
    module: 'APPLICATIONS',
    description: 'Dùng ở trường Phân loại hư hỏng của chi tiết sự cố',
  },
  picUnit: {
    label: 'Đơn vị phụ trách (PIC)',
    module: 'APPLICATIONS',
    description: 'Dùng ở trường Đơn vị phụ trách của chi tiết sự cố',
  },
  investor: {
    label: 'Chủ đầu tư',
    module: 'APPLICATIONS',
    description: 'Chủ đầu tư của dự án',
  },
  serviceType: {
    label: 'Loại hình dịch vụ',
    module: 'APPLICATIONS',
    description: 'Loại hình dịch vụ của dự án (văn phòng, thương mại, công nghiệp...)',
  },
  service: {
    label: 'Dịch vụ cung cấp',
    module: 'APPLICATIONS',
    description: 'Dịch vụ dự án đang sử dụng (điện, nước, điều hòa, thang máy...)',
  },
  factory: {
    label: 'Nhà xưởng',
    module: 'APPLICATIONS',
    description: 'Nhà xưởng của khách hàng (danh mục kiểm tra năng lượng)',
  },
  investorGroup: {
    label: 'Chủ đầu tư cha',
    module: 'APPLICATIONS',
    description: 'Nhóm chủ đầu tư cha — mỗi chủ đầu tư thuộc 1 nhóm',
  },
  contractorType: {
    label: 'Loại nhà thầu',
    module: 'APPLICATIONS',
    description: 'Phân loại nhà thầu (xây lắp, bảo trì, cung cấp thiết bị...)',
  },
};

export interface DroplistItem {
  id: number;
  code?: string | null;
  name: string;
  /** Chỉ có ở chủ đầu tư cha. */
  shortName?: string | null;
}

/** Key của droplist dùng cho 1 field cụ thể. */
export const ASSET_DROPLIST_KEYS: DroplistKey[] = [
  'category',
  'unit',
  'usageStatus',
  'condition',
];

export const INCIDENT_DROPLIST_KEYS: DroplistKey[] = [
  'repairType',
  'damageType',
  'picUnit',
];

/** Droplist dùng ở hồ sơ dự án (không có cấp cha).
 * Chủ đầu tư không nằm ở đây nữa — đã chuyển sang "Danh sách chủ đầu tư"
 * trong khai báo master data (xem INVESTOR_DROPLIST_KEYS). */
export const PROJECT_DROPLIST_KEYS: DroplistKey[] = [
  'serviceType',
  'service',
];

/** Droplist trong trang "Danh mục chủ đầu tư cha". */
export const INVESTOR_DROPLIST_KEYS: DroplistKey[] = ['investorGroup'];

/** Droplist dùng ở danh mục kiểm tra năng lượng. */
export const ENERGY_DROPLIST_KEYS: DroplistKey[] = ['factory'];
