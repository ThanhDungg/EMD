// Seed droplist cho hồ sơ dự án (module Ứng dụng):
// địa lý (quốc gia → miền → tỉnh thành → phường xã) + chủ đầu tư +
// loại hình dịch vụ + dịch vụ cung cấp. Idempotent theo code.
// Chạy: node_modules/.bin/tsx prisma/seed-site-profile.ts
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

const COUNTRIES = [
  { code: 'VN', name: 'Việt Nam' },
  { code: 'SG', name: 'Singapore' },
];

const REGIONS = [
  { code: 'VN-MD', name: 'Miền Bắc', countryCode: 'VN' },
  { code: 'VN-MT', name: 'Miền Trung', countryCode: 'VN' },
  { code: 'VN-MN', name: 'Miền Nam', countryCode: 'VN' },
];

const PROVINCES = [
  { code: 'HN', name: 'Hà Nội', regionCode: 'VN-MD' },
  { code: 'HP', name: 'Hải Phòng', regionCode: 'VN-MD' },
  { code: 'DN', name: 'Đà Nẵng', regionCode: 'VN-MT' },
  { code: 'KH', name: 'Khánh Hòa', regionCode: 'VN-MT' },
  { code: 'HCM', name: 'TP. Hồ Chí Minh', regionCode: 'VN-MN' },
  { code: 'BHN', name: 'Bình Dương', regionCode: 'VN-MN' },
];

const WARDS = [
  { code: 'HN-ND', name: 'Phường Ngọc Đồng', provinceCode: 'HN' },
  { code: 'HN-MT', name: 'Phường Mỹ Đình', provinceCode: 'HN' },
  { code: 'HP-HC', name: 'Phường Hồ Cương', provinceCode: 'HP' },
  { code: 'DN-HC', name: 'Phường Hải Châu', provinceCode: 'DN' },
  { code: 'DN-TH', name: 'Phường Thanh Khê', provinceCode: 'DN' },
  { code: 'HCM-1', name: 'Phường Nguyễn Thái Bình', provinceCode: 'HCM' },
  { code: 'BHN-PT', name: 'Phường Phú Cường', provinceCode: 'BHN' },
];

const INVESTORS = [
  { code: 'CTY_TDL', name: 'Công ty CP Đầu tư Tân Đại Lộc' },
  { code: 'CTY_VNG', name: 'Công ty CP Vươn Gia' },
  { code: 'CTY_SG', name: 'Tập đoàn Sino Group' },
];

const SERVICE_TYPES = [
  { code: 'VP', name: 'Văn phòng' },
  { code: 'TM', name: 'Thương mại' },
  { code: 'CN', name: 'Công nghiệp' },
  { code: 'YT', name: 'Y tế' },
  { code: 'GD', name: 'Giáo dục' },
  { code: 'DV', name: 'Dịch vụ' },
];

const PROVIDED_SERVICES = [
  { code: 'DV_DIEN', name: 'Điện' },
  { code: 'DV_NUOC', name: 'Nước' },
  { code: 'DV_DIEU_HOA', name: 'Điều hòa không khí' },
  { code: 'DV_THANGMAY', name: 'Thang máy' },
  { code: 'DV_ANHINH', name: 'An ninh trật tự' },
  { code: 'DV_VESINH', name: 'Vệ sinh chung' },
  { code: 'DV_BAOTRI', name: 'Bảo trì hạ tầng' },
  { code: 'DV_CAU', name: 'Câu cảnh quan' },
];

async function main() {
  const countryIds = new Map<string, number>();
  for (const c of COUNTRIES) {
    const row = await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
    countryIds.set(c.code, row.id);
  }
  console.log(`Seeded ${COUNTRIES.length} quốc gia.`);

  const regionIds = new Map<string, number>();
  for (const r of REGIONS) {
    const row = await prisma.region.upsert({
      where: { code: r.code },
      update: { name: r.name, countryId: countryIds.get(r.countryCode)! },
      create: {
        code: r.code,
        name: r.name,
        countryId: countryIds.get(r.countryCode)!,
      },
    });
    regionIds.set(r.code, row.id);
  }
  console.log(`Seeded ${REGIONS.length} miền.`);

  const provinceIds = new Map<string, number>();
  for (const p of PROVINCES) {
    const row = await prisma.province.upsert({
      where: { code: p.code },
      update: { name: p.name, regionId: regionIds.get(p.regionCode)! },
      create: {
        code: p.code,
        name: p.name,
        regionId: regionIds.get(p.regionCode)!,
      },
    });
    provinceIds.set(p.code, row.id);
  }
  console.log(`Seeded ${PROVINCES.length} tỉnh thành.`);

  for (const w of WARDS) {
    await prisma.ward.upsert({
      where: { code: w.code },
      update: { name: w.name, provinceId: provinceIds.get(w.provinceCode)! },
      create: {
        code: w.code,
        name: w.name,
        provinceId: provinceIds.get(w.provinceCode)!,
      },
    });
  }
  console.log(`Seeded ${WARDS.length} phường xã.`);

  const simpleTables: [string, { code: string; name: string }[]][] = [
    ['investor', INVESTORS],
    ['serviceType', SERVICE_TYPES],
    ['providedService', PROVIDED_SERVICES],
  ];
  for (const [model, rows] of simpleTables) {
    const delegate = (
      prisma as unknown as Record<
        string,
        { upsert: (args: unknown) => Promise<unknown> }
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
