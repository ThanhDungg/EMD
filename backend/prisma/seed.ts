// Seed dữ liệu mặc định:
//  1. Quyền hệ thống (từ constants dùng chung với code)
//  2. Group "Quản trị viên" gắn quyền ADMIN
//  3. Tài khoản admin đầu tiên (lấy từ env SEED_ADMIN_*)
//  4. 8 module core (group admin được xem tất cả)
// Chạy sau migrate: pnpm prisma:seed (upsert nên chạy lại an toàn).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import { CORE_MODULES } from '../src/modules/module/module.constants.js';
import { SYSTEM_PERMISSIONS } from '../src/modules/permissions/permissions.constants.js';
import { WORKFLOW_CATEGORIES } from '../src/modules/workflow/workflow.constants.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu DATABASE_URL trong env.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const pepper = process.env.PASSWORD_PEPPER ?? 'dev_pepper';
const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

async function main() {
  // 1. Quyền
  for (const p of SYSTEM_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, rank: p.rank },
      create: p,
    });
  }
  console.log(`Seeded ${SYSTEM_PERMISSIONS.length} permissions.`);

  // 2. 6 nhóm vai trò chuẩn + quyền + phân hệ được xem.
  // - ADMIN/CEO: toàn quyền, xem tất cả phân hệ.
  // - HO: full dự án nhưng không xem Quản trị/ Cấu hình / Portal CĐT.
  // - Giám sát vùng ~ QLDA nhưng nhiều dự án (gán qua thành viên dự án).
  // - QLDA: full trong dự án của mình (Quy trình), Ứng dụng chỉ xem.
  // - Kỹ thuật: chỉ Quy trình (việc được giao) + Chat nội bộ.
  // Upsert nên chạy lại an toàn (connect M2M đã có thì bỏ qua).
  const ALL_MODULES = CORE_MODULES.map((m) => m.code);
  const ROLE_GROUPS: Array<{
    code: string;
    name: string;
    permissionCodes: string[];
    modules: string[];
  }> = [
    {
      code: 'ADMINISTRATORS',
      name: 'Quản trị viên',
      permissionCodes: ['ADMIN'],
      modules: ALL_MODULES,
    },
    { code: 'CEO', name: 'CEO', permissionCodes: ['CEO'], modules: ALL_MODULES },
    {
      code: 'HO',
      name: 'HO',
      permissionCodes: ['HO'],
      modules: ['WORKFLOW', 'APPLICATIONS', 'ASSETS', 'REPORTS', 'INTERNAL_CHAT'],
    },
    {
      code: 'REGION_SUPERVISORS',
      name: 'Giám sát vùng',
      permissionCodes: ['REGION_SUPERVISOR'],
      modules: ['WORKFLOW', 'APPLICATIONS', 'ASSETS', 'REPORTS'],
    },
    {
      code: 'PROJECT_MANAGERS',
      name: 'Quản lý dự án',
      permissionCodes: ['PROJECT_MANAGER'],
      modules: ['WORKFLOW', 'APPLICATIONS', 'ASSETS', 'REPORTS'],
    },
    {
      code: 'TECHNICIANS',
      name: 'Nhân viên kỹ thuật',
      permissionCodes: ['TECHNICIAN'],
      modules: ['WORKFLOW', 'APPLICATIONS', 'REPORTS', 'ASSETS'],
    },
  ];
  const permissionByCode = new Map<string, number>();
  for (const code of new Set(ROLE_GROUPS.flatMap((g) => g.permissionCodes))) {
    const perm = await prisma.permission.findUniqueOrThrow({ where: { code } });
    permissionByCode.set(code, perm.id);
  }
  const groupByCode = new Map<string, number>();
  for (const g of ROLE_GROUPS) {
    const group = await prisma.group.upsert({
      where: { code: g.code },
      update: {
        name: g.name,
        permissions: {
          connect: g.permissionCodes.map((code) => ({
            id: permissionByCode.get(code) as number,
          })),
        },
      },
      create: {
        code: g.code,
        name: g.name,
        permissions: {
          connect: g.permissionCodes.map((code) => ({
            id: permissionByCode.get(code) as number,
          })),
        },
      },
    });
    groupByCode.set(g.code, group.id);
  }
  console.log(`Ensured ${ROLE_GROUPS.length} role groups.`);
  const adminGroup = { id: groupByCode.get('ADMINISTRATORS') as number };

  // 3. Tài khoản admin đầu tiên (có là nhân viên, không phải chủ đầu tư)
  const account = process.env.SEED_ADMIN_ACCOUNT ?? 'admin';
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@emd.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const existing = await prisma.user.findFirst({
    where: { OR: [{ accountName: account }, { email }] },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        accountName: account,
        email,
        password: await bcrypt.hash(password + pepper, rounds),
        fullName: 'Quản trị viên',
        isInvestor: false,
        groups: { connect: { id: adminGroup.id } },
      },
    });
    console.log(`Created admin account "${account}".`);
  } else {
    console.log(`Admin account "${account}" already exists, skipped.`);
  }

  // 4. 8 module core + gán phân hệ được xem cho từng nhóm vai trò.
  // Dùng `set` (thay vì `connect`) để mapping trong seed là nguồn chân lý:
  // chạy lại seed sẽ gỡ đúng các phân hệ không còn trong danh sách.
  for (const m of CORE_MODULES) {
    const viewers = ROLE_GROUPS.filter((g) => g.modules.includes(m.code)).map(
      (g) => ({ id: groupByCode.get(g.code) as number }),
    );
    await prisma.module.upsert({
      where: { code: m.code },
      update: {
        vnName: m.vnName,
        engName: m.engName,
        viewerGroups: { set: viewers },
      },
      create: {
        ...m,
        viewerGroups: { connect: viewers },
      },
    });
  }
  console.log(`Seeded ${CORE_MODULES.length} core modules.`);

  // 5. Loại công việc tab Ứng dụng (module Quy trình)
  for (const c of WORKFLOW_CATEGORIES) {
    await prisma.workflowCategory.upsert({
      where: { code: c.code },
      update: { vnName: c.vnName, engName: c.engName },
      create: c,
    });
  }
  console.log(`Seeded ${WORKFLOW_CATEGORIES.length} workflow categories.`);

  // 5b. Bộ trạng thái riêng cho từng loại việc (admin tùy biến sau qua API).
  // Mỗi loại 1 list: code unique trong loại, màu hiển thị, isClosed = trạng thái kết thúc.
  const STATUSES_BY_CATEGORY: Record<
    string,
    { code: string; name: string; color: string; isDefault?: boolean; isClosed?: boolean }[]
  > = {
    CHECKLIST: [
      { code: 'MOI', name: 'Mới', color: '#2174cd', isDefault: true },
      { code: 'DANG_XU_LY', name: 'Đang xử lý', color: '#f5b128' },
      { code: 'HOAN_THANH', name: 'Hoàn thành', color: '#3f9b53', isClosed: true },
      { code: 'YEU_CAU_MO_LAI', name: 'Yêu cầu mở lại', color: '#f42020' },
    ],
    OFFICE_WORK: [
      { code: 'MOI', name: 'Mới', color: '#2174cd', isDefault: true },
      { code: 'DANG_XU_LY', name: 'Đang xử lý', color: '#f5b128' },
      { code: 'HOAN_THANH', name: 'Hoàn thành', color: '#3f9b53', isClosed: true },
      { code: 'YEU_CAU_MO_LAI', name: 'Yêu cầu mở lại', color: '#f42020' },
    ],
    ENERGY_CHECK: [
      { code: 'MOI', name: 'Mới', color: '#2174cd', isDefault: true },
      { code: 'DANG_XU_LY', name: 'Đang xử lý', color: '#f5b128' },
      { code: 'HOAN_THANH', name: 'Hoàn thành', color: '#3f9b53', isClosed: true },
    ],
    MASTERPLAN: [
      { code: 'MOI', name: 'Mới', color: '#2174cd', isDefault: true },
      { code: 'TRINH_DUYET', name: 'Trình duyệt', color: '#7aace1' },
      { code: 'TRIEN_KHAI', name: 'Triển khai', color: '#f5b128' },
      { code: 'HOAN_THANH', name: 'Hoàn thành', color: '#3f9b53', isClosed: true },
      { code: 'TU_CHOI', name: 'Từ chối', color: '#f42020', isClosed: true },
      { code: 'HUY', name: 'Hủy', color: '#888e94', isClosed: true },
    ],
    INCIDENT: [
      { code: 'MOI', name: 'Mới', color: '#2174cd', isDefault: true },
      { code: 'DANG_XU_LY', name: 'Đang xử lý', color: '#f5b128' },
      { code: 'DA_XU_LY', name: 'Đã xử lý', color: '#4d90d7' },
      { code: 'HOAN_THANH', name: 'Hoàn thành', color: '#3f9b53', isClosed: true },
      { code: 'YEU_CAU_MO_LAI', name: 'Yêu cầu mở lại', color: '#f42020' },
      { code: 'TU_CHOI', name: 'Từ chối', color: '#f42020', isClosed: true },
      { code: 'TU_CHOI_MO_LAI', name: 'Từ chối mở lại', color: '#7d1a1a', isClosed: true },
    ],
  };
  for (const c of WORKFLOW_CATEGORIES) {
    const category = await prisma.workflowCategory.findUnique({ where: { code: c.code } });
    if (!category) continue;
    const wanted = STATUSES_BY_CATEGORY[c.code] ?? [];
    let order = 0;
    for (const s of wanted) {
      await prisma.workflowStatus.upsert({
        where: { categoryId_code: { categoryId: category.id, code: s.code } },
        update: { name: s.name, color: s.color, sortOrder: order },
        // isDefault/isClosed chỉ set lúc tạo — admin đổi sau không bị seed ghi đè
        create: {
          code: s.code,
          name: s.name,
          color: s.color,
          sortOrder: order,
          isDefault: s.isDefault ?? false,
          isClosed: s.isClosed ?? false,
          categoryId: category.id,
        },
      });
      order += 1;
    }
    // Dọn bộ seed cũ (TODO/DOING/DONE/CANCELLED...): xoá mềm status không còn
    // trong danh sách mới và không có work nào đang dùng.
    const keepCodes = wanted.map((s) => s.code);
    const stale = await prisma.workflowStatus.findMany({
      where: { categoryId: category.id, code: { notIn: keepCodes }, isDeleted: false },
      select: { id: true, code: true },
    });
    for (const s of stale) {
      // Chỉ tính work còn hiệu lực (bỏ qua work đã xoá mềm)
      const used = await prisma.work.count({ where: { statusId: s.id, isDeleted: false } });
      if (used === 0) {
        await prisma.workflowStatus.update({ where: { id: s.id }, data: { isDeleted: true } });
      }
    }
  }
  console.log('Seeded per-category statuses.');

  // 5c. Bật lịch lặp cho Checklist + Kiểm tra năng lượng (tab Việc lặp ở FE).
  await prisma.workflowCategory.updateMany({
    where: { code: { in: ['CHECKLIST', 'ENERGY_CHECK'] } },
    data: { supportsRecurrence: true },
  });
  console.log('Enabled recurrence for checklist + energy categories.');

  // 6. Thông tin công ty + giới thiệu phần mềm (tab Trang chủ, 1 bản ghi duy nhất).
  // Admin sửa sau qua PUT /workflow/company-profile.
  const existingProfile = await prisma.companyProfile.findFirst({
    orderBy: { id: 'asc' },
  });
  const profileData = {
    companyName: 'Công ty EMD',
    address: 'Địa chỉ công ty (admin cập nhật sau)',
    phone: '',
    email: '',
    website: '',
    description:
      'EMD là hệ thống quản lý vận hành và bảo trì: quản lý công việc theo quy trình, ' +
      'checklist kiểm tra, theo dõi năng lượng, kế hoạch masterplan và xử lý sự cố hư hỏng.',
    appIntro:
      'Phần mềm EMD giúp giao việc — thực hiện — theo dõi trên một nền tảng duy nhất: ' +
      'mỗi công việc có người giao, nhiều người thực hiện và người theo dõi; tiến độ, ' +
      'hình ảnh hiện trường và báo cáo được cập nhật theo thời gian thực.',
  };
  if (!existingProfile) {
    await prisma.companyProfile.create({ data: profileData });
    console.log('Created default company profile.');
  } else {
    console.log('Company profile already exists, skipped.');
  }
}

await main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
