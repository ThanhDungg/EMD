// Seed droplist cho chi tiết sự cố hư hỏng (module Ứng dụng):
// phân loại sửa chữa · phân loại hư hỏng · đơn vị phụ trách (PIC).
// Idempotent theo code → chạy lại an toàn.
// Chạy: node_modules/.bin/tsx prisma/seed-incident-droplists.ts
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

const REPAIR_TYPES = [
  { code: 'SC_KHAN_CAP', name: 'Sửa chữa khẩn cấp' },
  { code: 'SC_THUONG', name: 'Sửa chữa thường' },
  { code: 'BAO_TRI', name: 'Bảo trì định kỳ' },
  { code: 'SC_LON', name: 'Sửa chữa lớn / thay thế thiết bị' },
  { code: 'SC_TAM', name: 'Sửa chữa tạm thời' },
];

const DAMAGE_TYPES = [
  { code: 'HUT_DIEN', name: 'Mất điện / mất nguồn' },
  { code: 'HONG_CAM', name: 'Hỏng cơ / cam biến' },
  { code: 'RO_CHAI', name: 'Rò rỉ / rò chảy' },
  { code: 'ONG', name: 'Ống / đường ống vỡ' },
  { code: 'NHANH_HONG', name: 'Nhanh hư hỏng' },
  { code: 'SAI_TT', name: 'Sai số liệu / sai thông số' },
];

const PIC_UNITS = [
  { code: 'KHACH_HANG', name: 'Khách hàng' },
  { code: 'KHACH_HANG_VT', name: 'Khách hàng — Vận tư' },
  { code: 'DON_VI_BT', name: 'Đơn vị bảo trì nội bộ' },
  { code: 'NHA_CUNG_CAP', name: 'Nhà cung cấp' },
  { code: 'DON_VI_THUE', name: 'Đơn vị thuê ngoài' },
];

const TABLES = {
  repairType: REPAIR_TYPES,
  damageType: DAMAGE_TYPES,
  picUnit: PIC_UNITS,
} as const;

async function main() {
  for (const [model, rows] of Object.entries(TABLES)) {
    const delegate = (
      prisma as unknown as Record<
        string,
        { upsert: (args: unknown) => Promise<{ id: number }> }
      >
    )[model];
    for (const row of rows) {
      await delegate.upsert({
        where: { code: row.code },
        update: { name: row.name },
        create: { code: row.code, name: row.name },
      });
    }
    console.log(`Seeded ${rows.length} dòng cho ${model}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
