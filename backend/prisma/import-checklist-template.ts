// Nạp 1 danh mục mẫu checklist (node độc lập workId null) từ file JSON vào
// DB, để dùng ở dialog "Chọn mẫu checklist" trong modal Tạo công việc.
//
// Cấu trúc 3 cấp: node gốc (workId null, parentId null) = danh mục mẫu →
// node con = nội dung cha → node cháu = nội dung con (lá). Mỗi nội dung gồm
// 8 trường nghiệp vụ:
//   title (tên) · standard (tiêu chuẩn kiểm tra) · quantity (số lượng) ·
//   value (giá trị) · attachments (đính kèm) · checkpoint (lat/long thiết bị) ·
//   result (trạng thái Đạt/Không đạt) · note (ghi chú)
// cộng valueType (BOOLEAN | TEXT | NUMBER) quyết định kiểu của cột Giá trị.
//
// Chạy (mặc định lấy file checklist-van-sinh.json):
//   node_modules/.bin/tsx prisma/import-checklist-template.ts
// Chạy file khác:
//   node_modules/.bin/tsx prisma/import-checklist-template.ts path/to/ten.json
// Đã có mẫu trùng tên thì bỏ qua; muốn xoá tạo lại:
//   FORCE=1 node_modules/.bin/tsx prisma/import-checklist-template.ts
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu DATABASE_URL trong env.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const VALUE_TYPES = ['BOOLEAN', 'TEXT', 'NUMBER'] as const;
type ValueType = (typeof VALUE_TYPES)[number];

/** 1 node trong file JSON mẫu. */
interface TemplateNode {
  title: string;
  standard?: string | null;
  valueType?: string | null;
  quantity?: number | null;
  value?: number | null;
  attachments?: string[] | null;
  checkpoint?: boolean | null;
  result?: string | null;
  note?: string | null;
  children?: TemplateNode[] | null;
}

interface TemplateFile {
  title: string;
  notes?: string | null;
  children?: TemplateNode[] | null;
}

const here = dirname(fileURLToPath(import.meta.url));
const fileArg = process.argv[2];
const filePath = resolve(
  fileArg ?? resolve(here, 'templates/checklist-van-sinh.json'),
);

function readTemplate(path: string): TemplateFile {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as TemplateFile;
  if (!raw.title?.trim()) {
    throw new Error(`${path}: thiếu trường "title" của danh mục mẫu.`);
  }
  return raw;
}

function normalizeValueType(v: string | null | undefined): ValueType | null {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'boolean' || s === 'bool' || s === 'checkbox') return 'BOOLEAN';
  if (s === 'number' || s === 'decimal' || s === 'numeric') return 'NUMBER';
  if (s === 'text' || s === 'string' || s === 'textarea') return 'TEXT';
  throw new Error(
    `valueType không hợp lệ: "${v}" (chỉ nhận BOOLEAN/TEXT/NUMBER).`,
  );
}

function normalizeResult(v: string | null | undefined): 'PASS' | 'FAIL' | null {
  const s = (v ?? '').trim().toUpperCase();
  if (!s) return null;
  if (s === 'PASS' || s === 'FAIL') return s;
  throw new Error(
    `result không hợp lệ: "${v}" (chỉ nhận PASS/FAIL hoặc null).`,
  );
}

/** Gom id 1 node gốc + toàn bộ hậu duệ (dùng khi FORCE=1 để xoá tạo lại). */
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

/** Tạo 1 node (không kèm con), tôn trọng thứ tự trong cùng cấp. */
async function createNode(
  node: TemplateNode,
  parentId: number,
  sortOrder: number,
) {
  return prisma.checklistItem.create({
    data: {
      title: node.title.trim(),
      standard: node.standard?.trim() || null,
      valueType: normalizeValueType(node.valueType),
      quantity: node.quantity ?? null,
      value: node.value ?? null,
      attachments: node.attachments ?? [],
      // checkpoint = vị trí lat/long thiết bị gửi lên; mẫu để trống.
      checkpoint: node.checkpoint ?? false,
      result: normalizeResult(node.result),
      notes: node.note?.trim() || null,
      parentId,
      sortOrder,
    },
  });
}

async function main() {
  const template = readTemplate(filePath);

  const existing = await prisma.checklistItem.findFirst({
    where: {
      title: template.title.trim(),
      workId: null,
      parentId: null,
      isDeleted: false,
    },
  });
  if (existing && process.env.FORCE !== '1') {
    console.log(
      `Đã có mẫu "${template.title}" (id=${existing.id}) — bỏ qua. ` +
        `Muốn tạo lại: FORCE=1 node_modules/.bin/tsx prisma/import-checklist-template.ts`,
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
      title: template.title.trim(),
      notes: template.notes?.trim() || null,
      sortOrder: 0,
    },
  });

  const parents = template.children ?? [];
  let childCount = 0;
  for (let i = 0; i < parents.length; i += 1) {
    const parent = await createNode(parents[i], root.id, i);
    const children = parents[i].children ?? [];
    for (let j = 0; j < children.length; j += 1) {
      await createNode(children[j], parent.id, j);
      childCount += 1;
    }
  }
  console.log(
    `Đã nạp mẫu "${template.title}" từ ${filePath}\n` +
      `  danh mục id=${root.id} · ${parents.length} nội dung cha · ` +
      `${childCount} nội dung con.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
