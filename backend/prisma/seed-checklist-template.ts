// Seed 1 danh mục mẫu checklist (node độc lập workId null) để test picker
// chọn mẫu trong modal Tạo công việc: chọn "Checklist A" → nạp cây cha/con
// vào bảng → bấm Thêm là tạo việc luôn.
// Idempotent: đã có root cùng tên thì bỏ qua (FORCE=1 để xoá tạo lại).
// Chạy: node_modules/.bin/tsx prisma/seed-checklist-template.ts
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

// Mẫu chỉ mang field cấu trúc: tên, tiêu chuẩn kiểm tra, loại giá trị
// (BOOLEAN | TEXT | NUMBER). Giá trị / trạng thái Đạt-Không đạt / ghi chú
// để rỗng khi nạp vào công việc, nhập lúc đi kiểm tra.
interface SeedNode {
  title: string;
  standard?: string;
  valueType?: 'BOOLEAN' | 'TEXT' | 'NUMBER';
  itemPriority?: string;
  required?: boolean;
  requiredImage?: boolean;
  notes?: string;
  children?: SeedNode[];
}

const TEMPLATE_TITLE = 'Checklist A — Vệ sinh văn phòng';

const TREE: SeedNode[] = [
  {
    title: 'Khu vực làm việc chung',
    notes: 'Nhóm đầu việc khu vực làm việc',
    children: [
      {
        title: 'Lau bàn ghế',
        standard: 'Mặt bàn ghế không bụi bẩn, sắp xếp gọn gàng',
        valueType: 'TEXT',
        itemPriority: 'Bình thường',
        required: true,
      },
      {
        title: 'Đổ rác, thay túi mới',
        standard: 'Thùng rác trống, đã thay túi mới',
        valueType: 'BOOLEAN',
        itemPriority: 'Bình thường',
        required: true,
      },
      {
        title: 'Lau sàn',
        standard: 'Sàn khô ráo, không trơn trượt',
        valueType: 'TEXT',
        itemPriority: 'Ưu tiên',
        required: true,
        requiredImage: true,
      },
    ],
  },
  {
    title: 'Nhà vệ sinh',
    notes: 'Nhóm đầu việc nhà vệ sinh',
    children: [
      {
        title: 'Cọ rửa bồn cầu, lavabo',
        standard: 'Thiết bị trắng sạch, không ố vàng',
        valueType: 'TEXT',
        itemPriority: 'Ưu tiên',
        required: true,
      },
      {
        title: 'Bổ sung giấy và xà phòng',
        standard: 'Hộp giấy đầy, bình xà phòng còn trên 50%',
        valueType: 'NUMBER',
        itemPriority: 'Bình thường',
      },
      {
        title: 'Khử mùi, mở thông gió',
        standard: 'Không còn mùi hôi',
        valueType: 'BOOLEAN',
        itemPriority: 'Bình thường',
      },
    ],
  },
  {
    title: 'Khu vực pantry',
    notes: 'Nhóm đầu việc pantry',
    children: [
      {
        title: 'Vệ sinh tủ lạnh',
        standard: 'Không đồ hết hạn, khay kệ sạch',
        valueType: 'TEXT',
        itemPriority: 'Bình thường',
      },
      {
        title: 'Lau lò vi sóng',
        standard: 'Lòng lò sạch, không mùi thức ăn',
        valueType: 'TEXT',
        itemPriority: 'Bình thường',
        required: true,
        requiredImage: true,
      },
    ],
  },
];

/** Gom id root + toàn bộ hậu duệ (để FORCE=1 xoá tạo lại). */
async function collectSubtreeIds(rootId: number): Promise<number[]> {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await prisma.checklistItem.findMany({
      where: { parentId: current },
      select: { id: true },
    });
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

async function main() {
  const existing = await prisma.checklistItem.findFirst({
    where: {
      title: TEMPLATE_TITLE,
      workId: null,
      parentId: null,
      isDeleted: false,
    },
  });
  if (existing && process.env.FORCE !== '1') {
    console.log(
      `Đã có mẫu "${TEMPLATE_TITLE}" (id=${existing.id}) — bỏ qua. ` +
        `Muốn tạo lại: FORCE=1 node_modules/.bin/tsx prisma/seed-checklist-template.ts`,
    );
    return;
  }
  if (existing) {
    const ids = await collectSubtreeIds(existing.id);
    await prisma.checklistItem.deleteMany({ where: { id: { in: ids } } });
    console.log(`Đã xoá mẫu cũ (${ids.length} node), tạo lại...`);
  }

  const root = await prisma.checklistItem.create({
    data: {
      title: TEMPLATE_TITLE,
      notes: 'Mẫu kiểm tra vệ sinh văn phòng hằng ngày (3 nhóm, 8 đầu việc)',
      sortOrder: 0,
    },
  });
  let groupCount = 0;
  let itemCount = 0;
  let order = 0;
  for (const g of TREE) {
    const group = await prisma.checklistItem.create({
      data: {
        title: g.title,
        notes: g.notes,
        parentId: root.id,
        sortOrder: order++,
      },
    });
    groupCount += 1;
    let childOrder = 0;
    for (const c of g.children ?? []) {
      await prisma.checklistItem.create({
        data: {
          title: c.title,
          standard: c.standard,
          valueType: c.valueType,
          itemPriority: c.itemPriority,
          required: c.required ?? false,
          requiredImage: c.requiredImage ?? false,
          parentId: group.id,
          sortOrder: childOrder++,
        },
      });
      itemCount += 1;
    }
  }
  console.log(
    `Đã tạo mẫu "${TEMPLATE_TITLE}" (root id=${root.id}): ` +
      `${groupCount} nhóm cha + ${itemCount} đầu việc con.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
