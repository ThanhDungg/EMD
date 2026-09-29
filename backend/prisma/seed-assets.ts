// Seed dữ liệu mẫu cho module Tài sản: 4 bảng droplist, 2 dự án (site) kèm
// cây vị trí cha-con và ~24 tài sản — để test flow sự cố
// (chọn dự án → vị trí → tài sản) và màn danh sách tài sản.
// Idempotent: droplist theo code, vị trí theo code, tài sản theo code → chạy
// lại an toàn.
// Chạy: node_modules/.bin/tsx prisma/seed-assets.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu DATABASE_URL trong env.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DROPLISTS = {
  assetCategory: [
    { code: 'DIEN', name: 'Thiết bị điện' },
    { code: 'DIEN_KY_THUAT', name: 'Thiết bị điện kỹ thuật' },
    { code: 'DIEN_THAI', name: 'Thiết bị điện tử / Thái dương học' },
    { code: 'NUOC', name: 'Thiết bị nước' },
    { code: 'DIEU_HOA', name: 'Điều hoà / TĐH' },
    { code: 'BANG_LONG', name: 'Băng tải / xích nâng' },
    { code: 'BAO_HOA', name: 'Bảo hoà' },
    { code: 'PCCC', name: 'Phương tiện chữa cháy' },
    { code: 'MAY_THUY', name: 'Máy thuỷ động' },
  ],
  assetUnit: [
    { code: 'CAI', name: 'Cái' },
    { code: 'BO', name: 'Bộ' },
    { code: 'CHIEC', name: 'Chiếc' },
    { code: 'MAY', name: 'Máy' },
    { code: 'MET', name: 'Mét' },
    { code: 'M2', name: 'm²' },
    { code: 'M3', name: 'm³' },
    { code: 'KG', name: 'Kg' },
  ],
  assetUsageStatus: [
    { code: 'DANG_DUNG', name: 'Đang sử dụng' },
    { code: 'NGUNG_DUNG', name: 'Ngưng sử dụng' },
    { code: 'HU', name: 'Hư hỏng' },
    { code: 'THANH_LY', name: 'Đã thanh lý' },
  ],
  assetCondition: [
    { code: 'TOT', name: 'Tốt' },
    { code: 'KHA', name: 'Khá — có vết mài mòn' },
    { code: 'CAN_BT', name: 'Cần bảo trì' },
    { code: 'HU', name: 'Hư hỏng' },
    { code: 'NGUNG', name: 'Ngưng hoạt động' },
  ],
} as const;

interface SeedLocation {
  code: string;
  name: string;
  children?: SeedLocation[];
}

/** 2 dự án, mỗi dự án 1 cây vị trí riêng (tầng → khu → phòng/vị trí). */
const SITES: {
  code: string;
  name: string;
  address: string;
  locations: SeedLocation[];
}[] = [
  {
    code: 'TOA',
    name: 'Tòa A - Khu văn phòng',
    address: 'Số 1 Nguyễn Văn Linh, Quận 7',
    locations: [
      {
        code: 'A-T1',
        name: 'Tầng 1',
        children: [
          {
            code: 'A-T1-HC',
            name: 'Hành chính',
            children: [
              { code: 'A-T1-HC-PKT', name: 'Phòng kế toán' },
              { code: 'A-T1-HC-HD', name: 'Phòng hành chính' },
              { code: 'A-T1-HC-TK', name: 'Phòng thu ký' },
            ],
          },
          {
            code: 'A-T1-VT',
            name: 'Văn thư',
            children: [
              { code: 'A-T1-VT-TP', name: 'Tầng trệt' },
              { code: 'A-T1-VT-T2', name: 'Tầng 2' },
            ],
          },
          { code: 'A-T1-HL', name: 'Hành lang' },
          { code: 'A-T1-SAN', name: 'Sảnh' },
        ],
      },
      {
        code: 'A-T2',
        name: 'Tầng 2',
        children: [
          {
            code: 'A-T2-VP',
            name: 'Văn phòng',
            children: [
              { code: 'A-T2-VP-GD', name: 'Phòng Giám đốc' },
              { code: 'A-T2-VP-KT', name: 'Phòng Kỹ thuật' },
              { code: 'A-T2-VP-HD', name: 'Phòng Hoà dịch' },
            ],
          },
          { code: 'A-T2-HDKT', name: 'Hành lang kỹ thuật' },
          { code: 'A-T2-PTRY', name: 'Pantry' },
        ],
      },
      {
        code: 'A-T3',
        name: 'Tầng 3',
        children: [
          { code: 'A-T3-HL', name: 'Hành lang' },
          { code: 'A-T3-PN', name: 'Phòng họp A' },
          { code: 'A-T3-PN-B', name: 'Phòng họp B' },
        ],
      },
    ],
  },
  {
    code: 'TOB',
    name: 'Tòa B - Nhà xưởng',
    address: 'KCN Tân Thuận, Quận 7',
    locations: [
      {
        code: 'B-T1',
        name: 'Xưởng sản xuất 1',
        children: [
          { code: 'B-T1-DL', name: 'Dây chuyền đóng gói' },
          { code: 'B-T1-KC', name: 'Kho thành phẩm' },
          { code: 'B-T1-VT', name: 'Vòng vây thao tác' },
        ],
      },
      {
        code: 'B-T2',
        name: 'Xưởng sản xuất 2',
        children: [
          { code: 'B-T2-DL', name: 'Dây chuyền lắp ráp' },
          { code: 'B-T2-NVL', name: 'Kho nguyên liệu' },
        ],
      },
      {
        code: 'B-YTE',
        name: 'Y tế',
        children: [
          { code: 'B-YTE-PH', name: 'Phòng y tế' },
          { code: 'B-YTE-HNT', name: 'Hội trường' },
        ],
      },
      { code: 'B-MAY', name: 'Nhà máy thủy điện' },
    ],
  },
];

interface SeedAsset {
  code: string;
  name: string;
  site: string;
  location: string;
  category: string;
  usageStatus: string;
  condition: string;
  unit: string;
  usageDate: string;
  quantity: number;
  supplier: string;
  origin: string;
  model: string;
  warrantyEnd: string;
  remarks?: string;
  detail?: string;
}

const ASSETS: SeedAsset[] = [
  // --- Tòa A: điều hoà, điện, chiếu sáng ---
  {
    code: 'AC-001',
    name: 'Điều hoà 2 chiều 18000BTU',
    site: 'TOA',
    location: 'A-T1-HC-PKT',
    category: 'DIEU_HOA',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2024-03-10',
    quantity: 2,
    supplier: 'Daikin',
    origin: 'Nhật Bản',
    model: 'FTV-B50',
    warrantyEnd: '2027-03-10',
    remarks: 'Lắp trên tường, điều khiển remote chung',
    detail: 'Công suất 18000BTU, 1 chiều mát. Vệ sinh định kỳ 6 tháng/lần.',
  },
  {
    code: 'AC-002',
    name: 'Điều hoàn phòng Giám đốc',
    site: 'TOA',
    location: 'A-T2-VP-GD',
    category: 'DIEU_HOA',
    usageStatus: 'NGUNG_DUNG',
    condition: 'HU',
    unit: 'CAI',
    usageDate: '2021-08-05',
    quantity: 1,
    supplier: 'Carrier',
    origin: 'Mỹ',
    model: '42NQV18',
    warrantyEnd: '2024-08-05',
    remarks: 'Hư máy nén, chờ linh kiện thay thế',
    detail: 'Cần kiểm tra board mạch và tủ điện phụ.',
  },
  {
    code: 'AC-003',
    name: 'Điều hoà trung tâm phòng họp A',
    site: 'TOA',
    location: 'A-T3-PN',
    category: 'DIEU_HOA',
    usageStatus: 'DANG_DUNG',
    condition: 'CAN_BT',
    unit: 'CAI',
    usageDate: '2022-05-20',
    quantity: 4,
    supplier: 'Mitsubishi',
    origin: 'Nhật Bản',
    model: 'PUHY-40HG',
    warrantyEnd: '2025-05-20',
    remarks: 'Gửi bảo trì 1 lần/năm',
    detail: 'Gas R410A, dàn nối 2 tầng.',
  },
  {
    code: 'CB-002',
    name: 'Tủ điện tổng tầng 1',
    site: 'TOA',
    location: 'A-T1-HL',
    category: 'DIEN_KY_THUAT',
    usageStatus: 'DANG_DUNG',
    condition: 'KHA',
    unit: 'BO',
    usageDate: '2023-01-20',
    quantity: 1,
    supplier: 'Schneider',
    origin: 'Pháp',
    model: 'Prisma iPM',
    warrantyEnd: '2028-01-20',
    remarks: 'Cần lịch định kỳ kiểm tra tiếp điểm nối',
    detail: 'Tổng 400A, 3 pha. Sơ đồ điện lưu tại phòng kỹ thuật.',
  },
  {
    code: 'TB-004',
    name: 'Tủ điện tầng 2',
    site: 'TOA',
    location: 'A-T2-HDKT',
    category: 'DIEN_KY_THUAT',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'BO',
    usageDate: '2023-01-20',
    quantity: 1,
    supplier: 'Schneider',
    origin: 'Pháp',
    model: 'Prisma iPM',
    warrantyEnd: '2028-01-20',
    detail: 'Tổng 250A, 3 pha.',
  },
  {
    code: 'DL-006',
    name: 'Đèn led âm trần hành lang',
    site: 'TOA',
    location: 'A-T1-HL',
    category: 'DIEN_THAI',
    usageStatus: 'DANG_DUNG',
    condition: 'KHA',
    unit: 'CAI',
    usageDate: '2024-12-01',
    quantity: 24,
    supplier: 'Philips',
    origin: 'Hà Lan',
    model: 'DLBS-18W',
    warrantyEnd: '2026-12-01',
    remarks: '2 bóng hỏng đang chờ thay',
    detail: 'Nhiệt màu 4000K, quang thông 1800lm.',
  },
  {
    code: 'DL-007',
    name: 'Đèn led panel văn phòng',
    site: 'TOA',
    location: 'A-T2-VP-KT',
    category: 'DIEN_THAI',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2024-12-01',
    quantity: 36,
    supplier: 'Philips',
    origin: 'Hà Lan',
    model: 'RC125B',
    warrantyEnd: '2026-12-01',
  },
  {
    code: 'BH-008',
    name: 'Bình chữa cháy CO2 5kg',
    site: 'TOA',
    location: 'A-T1-SAN',
    category: 'PCCC',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2024-06-01',
    quantity: 4,
    supplier: 'Hapro',
    origin: 'Việt Nam',
    model: 'KZ-5',
    warrantyEnd: '2027-06-01',
    remarks: 'Kiểm tra hạn thay bình hằng năm',
    detail: 'Đặt tại sảnh và hành lang tầng 1.',
  },
  {
    code: 'BCT-009',
    name: 'Bình chữa cháy nước 9L',
    site: 'TOA',
    location: 'A-T2-HDKT',
    category: 'PCCC',
    usageStatus: 'DANG_DUNG',
    condition: 'CAN_BT',
    unit: 'CAI',
    usageDate: '2023-06-01',
    quantity: 6,
    supplier: 'Vinafilm',
    origin: 'Việt Nam',
    model: 'VE45ML',
    warrantyEnd: '2026-06-01',
    remarks: '1 bình áp suất thấp, cần thay',
  },
  {
    code: 'CAM-010',
    name: 'Camera an ninh sảnh',
    site: 'TOA',
    location: 'A-T1-SAN',
    category: 'DIEN_THAI',
    usageStatus: 'DANG_DUNG',
    condition: 'KHA',
    unit: 'CAI',
    usageDate: '2023-09-15',
    quantity: 8,
    supplier: 'Hikvision',
    origin: 'Trung Quốc',
    model: 'DS-2CD2T',
    warrantyEnd: '2026-09-15',
    detail: 'Full HD, PoE, lưu NAS tầng 2.',
  },
  {
    code: 'DH-003',
    name: 'Đồng hồ nước tầng 2',
    site: 'TOA',
    location: 'A-T2-HDKT',
    category: 'NUOC',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2023-06-01',
    quantity: 1,
    supplier: 'Sensus',
    origin: 'Anh',
    model: 'Sensus R-420',
    warrantyEnd: '2026-06-01',
    remarks: 'Kiểm tra chỉ số hằng tháng',
    detail: 'Đường ống DN20, đặt trong hố kỹ thuật.',
  },
  {
    code: 'BT-004',
    name: 'Băng tải chạy bốn máng',
    site: 'TOA',
    location: 'A-T2-VP-KT',
    category: 'BANG_LONG',
    usageStatus: 'DANG_DUNG',
    condition: 'CAN_BT',
    unit: 'CAI',
    usageDate: '2022-11-15',
    quantity: 1,
    supplier: 'Interroll',
    origin: 'Đức',
    model: '2400-800',
    warrantyEnd: '2025-11-15',
    remarks: 'Đã quá hạn bảo hành, cần lên kế hoạch thay thế',
    detail: 'Tải trọng 50kg/m, tốc độ 0.6 m/s, nguồn 3 pha 380V.',
  },
  // --- Tòa B: xưởng ---
  {
    code: 'XUONG-001',
    name: 'Băng tải xích nâng sản phẩm',
    site: 'TOB',
    location: 'B-T1-DL',
    category: 'BANG_LONG',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2021-04-10',
    quantity: 1,
    supplier: 'Dematic',
    origin: 'Đức',
    model: 'COL-2000',
    warrantyEnd: '2026-04-10',
    detail: 'Tải trọng 2000kg, cao 6m, tốc độ 30 m/phút.',
  },
  {
    code: 'XUONG-002',
    name: 'Băng tải vận chuyển thùng carton',
    site: 'TOB',
    location: 'B-T2-DL',
    category: 'BANG_LONG',
    usageStatus: 'DANG_DUNG',
    condition: 'KHA',
    unit: 'CAI',
    usageDate: '2021-04-10',
    quantity: 2,
    supplier: 'Interroll',
    origin: 'Đức',
    model: '1400-600',
    warrantyEnd: '2025-04-10',
    remarks: 'Rò rỉ dầu bôi trục con lăn số 3',
    detail: 'Rộng 600mm, tốc độ 12 m/phút.',
  },
  {
    code: 'XUONG-003',
    name: 'Máy nén khí nén kiểu tôi',
    site: 'TOB',
    location: 'B-MAY',
    category: 'MAY_THUY',
    usageStatus: 'DANG_DUNG',
    condition: 'CAN_BT',
    unit: 'MAY',
    usageDate: '2019-08-01',
    quantity: 1,
    supplier: 'Atlas Copco',
    origin: 'Thụy Điển',
    model: 'GA-90',
    warrantyEnd: '2024-08-01',
    remarks: 'Rò rỉ khí, lịch thay gối tháng tới',
    detail: 'Công suất 90kW, áp suất 8bar.',
  },
  {
    code: 'XUONG-004',
    name: 'Bơm nước công nghiệp',
    site: 'TOB',
    location: 'B-MAY',
    category: 'MAY_THUY',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'MAY',
    usageDate: '2020-02-15',
    quantity: 2,
    supplier: 'Grundfos',
    origin: 'Đan Mạch',
    model: 'NB65-200',
    warrantyEnd: '2025-02-15',
    detail: 'Lưu lượng 65 m³/h, cột áp 32m.',
  },
  {
    code: 'XUONG-005',
    name: 'Xi-lô thủy lực xưởng 1',
    site: 'TOB',
    location: 'B-T1-DL',
    category: 'MAY_THUY',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2020-09-01',
    quantity: 2,
    supplier: 'Bosch Rexroth',
    origin: 'Đức',
    model: 'R-4-series',
    warrantyEnd: '2027-09-01',
    detail: 'Áp suất 250bar, đường kính xi-lô 100mm.',
  },
  {
    code: 'XUONG-006',
    name: 'Xe nâng tay điện kho thành phẩm',
    site: 'TOB',
    location: 'B-T1-KC',
    category: 'MAY_THUY',
    usageStatus: 'HU',
    condition: 'HU',
    unit: 'CAI',
    usageDate: '2018-03-20',
    quantity: 1,
    supplier: 'Toyota',
    origin: 'Nhật Bản',
    model: '8FBE18',
    warrantyEnd: '2023-03-20',
    remarks: 'Sạc không nhận, đang chờ linh kiện',
    detail: 'Tải 1.8 tấn, cần kiểm tra bộ sạc và ắc quy.',
  },
  {
    code: 'XUONG-007',
    name: 'Cân điện tử sảnh kho',
    site: 'TOB',
    location: 'B-T1-KC',
    category: 'DIEN_THAI',
    usageStatus: 'DANG_DUNG',
    condition: 'KHA',
    unit: 'BO',
    usageDate: '2021-10-05',
    quantity: 1,
    supplier: 'Mettler Toledo',
    origin: 'Thụy Sĩ',
    model: 'IND-560',
    warrantyEnd: '2026-10-05',
    remarks: 'Lệch 1.2kg so với cân chuẩn, cần hiệu chuẩn lại',
    detail: 'Max 3000kg, độ phân giải 0.5kg.',
  },
  {
    code: 'XUONG-008',
    name: 'Đèn chiếu xưởng LED high bay',
    site: 'TOB',
    location: 'B-T2-NVL',
    category: 'DIEN_THAI',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2023-02-01',
    quantity: 60,
    supplier: 'LEDVANCE',
    origin: 'Đức',
    model: 'HBU-150W',
    warrantyEnd: '2028-02-01',
    detail: '150W, 15000lm, IP65.',
  },
  {
    code: 'XUONG-009',
    name: 'Máy đóng gói bao bì tự động',
    site: 'TOB',
    location: 'B-T1-DL',
    category: 'BAO_HOA',
    usageStatus: 'DANG_DUNG',
    condition: 'CAN_BT',
    unit: 'MAY',
    usageDate: '2019-11-30',
    quantity: 1,
    supplier: 'Krones',
    origin: 'Đức',
    model: 'Contiroll',
    warrantyEnd: '2024-11-30',
    remarks: 'Hỏng cảm biến nhiệt, lịch sửa chữa tháng 3',
  },
  {
    code: 'YTE-001',
    name: 'Tủ thuốc y tế',
    site: 'TOB',
    location: 'B-YTE-PH',
    category: 'BAO_HOA',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2022-01-10',
    quantity: 1,
    supplier: 'Karrex',
    origin: 'Việt Nam',
    model: 'KR-6K',
    warrantyEnd: '2027-01-10',
  },
  {
    code: 'YTE-002',
    name: 'Điều hoà phòng y tế',
    site: 'TOB',
    location: 'B-YTE-PH',
    category: 'DIEU_HOA',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2022-01-10',
    quantity: 2,
    supplier: 'Panasonic',
    origin: 'Nhật Bản',
    model: 'XPS13-TH',
    warrantyEnd: '2027-01-10',
  },
  {
    code: 'XUONG-010',
    name: 'Máy phát điện dự phòng',
    site: 'TOB',
    location: 'B-MAY',
    category: 'DIEN_KY_THUAT',
    usageStatus: 'NGUNG_DUNG',
    condition: 'CAN_BT',
    unit: 'BO',
    usageDate: '2017-06-01',
    quantity: 1,
    supplier: 'Cummins',
    origin: 'Mỹ',
    model: 'C500D5',
    warrantyEnd: '2023-06-01',
    remarks: 'Chưa chạy 8 tháng, cần chạy thử 30 phút',
    detail: '500kVA, chạy 8 giờ, nhiên liệu diesel.',
  },
  {
    code: 'XUONG-011',
    name: 'Thang nhấp 6m',
    site: 'TOB',
    location: 'B-T2-DL',
    category: 'BAO_HOA',
    usageStatus: 'DANG_DUNG',
    condition: 'TOT',
    unit: 'CAI',
    usageDate: '2020-12-01',
    quantity: 2,
    supplier: 'Altrex',
    origin: 'Việt Nam',
    model: 'AL6-60',
    warrantyEnd: '2025-12-01',
  },
  {
    code: 'XUONG-012',
    name: 'Bảng điện tử hiển thị KPI xưởng',
    site: 'TOB',
    location: 'B-T1-VT',
    category: 'DIEN_THAI',
    usageStatus: 'DANG_DUNG',
    condition: 'KHA',
    unit: 'CAI',
    usageDate: '2023-05-20',
    quantity: 1,
    supplier: 'Samsung',
    origin: 'Hàn Quốc',
    model: 'QM55B',
    warrantyEnd: '2026-05-20',
    detail: '55 inch, độ phân giải 4K, chạy 16h/ngày.',
  },
];

async function main() {
  // 1. Droplist
  const ids: Record<string, number> = {};
  for (const [model, rows] of Object.entries(DROPLISTS)) {
    const delegate = (
      prisma as unknown as Record<
        string,
        { upsert: (args: unknown) => Promise<{ id: number }> }
      >
    )[model];
    for (const row of rows) {
      const saved = await delegate.upsert({
        where: { code: row.code },
        update: { name: row.name },
        create: { code: row.code, name: row.name },
      });
      ids[`${model}:${row.code}`] = saved.id;
    }
  }
  console.log(
    `Seeded droplists: ${Object.values(DROPLISTS).flat().length} dòng.`,
  );

  // 2. Dự án + cây vị trí
  const siteIdByCode = new Map<string, number>();
  const locationIdByCode = new Map<string, number>();
  for (const s of SITES) {
    // Tái dùng dự án đã có (theo code trước, rồi theo tên) để không tạo
    // trùng "Tòa A" khi chạy lại seed trên DB đã có sẵn dữ liệu.
    const existing =
      (await prisma.site.findFirst({ where: { code: s.code } })) ??
      (await prisma.site.findFirst({ where: { name: s.name } }));
    const site = existing
      ? await prisma.site.update({
          where: { id: existing.id },
          data: { code: s.code, name: s.name, address: s.address },
        })
      : await prisma.site.create({
          data: { code: s.code, name: s.name, address: s.address },
        });
    siteIdByCode.set(s.code, site.id);
    const walk = async (
      nodes: SeedLocation[],
      parentId: number | null,
    ): Promise<void> => {
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const saved = await prisma.siteLocation.upsert({
          where: { code: node.code },
          update: { name: node.name, siteId: site.id, parentId, sortOrder: i },
          create: {
            code: node.code,
            name: node.name,
            siteId: site.id,
            parentId,
            sortOrder: i,
          },
        });
        locationIdByCode.set(node.code, saved.id);
        if (node.children) await walk(node.children, saved.id);
      }
    };
    await walk(s.locations, null);
  }
  console.log(
    `Seeded ${siteIdByCode.size} dự án + ${locationIdByCode.size} vị trí.`,
  );

  // 3. Tài sản
  for (const a of ASSETS) {
    // Asset không có cột siteId: site suy ra từ vị trí (locationId).
    const data = {
      name: a.name,
      locationId: locationIdByCode.get(a.location) ?? null,
      categoryId: ids[`assetCategory:${a.category}`],
      usageStatusId: ids[`assetUsageStatus:${a.usageStatus}`],
      conditionId: ids[`assetCondition:${a.condition}`],
      unitId: ids[`assetUnit:${a.unit}`],
      usageDate: new Date(a.usageDate),
      quantity: a.quantity,
      supplier: a.supplier,
      origin: a.origin,
      model: a.model,
      warrantyEnd: new Date(a.warrantyEnd),
      remarks: a.remarks ?? null,
      detail: a.detail ?? null,
    };
    await prisma.asset.upsert({
      where: { code: a.code },
      update: data,
      create: { code: a.code, ...data },
    });
  }
  console.log(`Seeded ${ASSETS.length} tài sản.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
