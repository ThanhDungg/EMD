import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Cell, Worksheet } from 'exceljs';
import {
  buildImportError,
  cellText,
  columnLetter,
  normalizeText,
  splitNameId,
  withIdSuffix,
} from '../../common/excel.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Nhập nhóm người dùng bằng file Excel theo khuôn mẫu do backend sinh ra.
//
// Nguyên tắc:
// - "Mã nhóm" là duy nhất: dòng có mã trùng nhóm đã có thì CẬP NHẬT nhóm đó
//   (kể cả bản đã xoá mềm sẽ được khôi phục); không có mã thì luôn tạo mới.
// - Nhóm chưa có mã mà trùng tên vẫn tạo mới (tên không duy nhất) — nên điền
//   mã để nhập nhiều lần không trùng.
// - Cột "Quyền" nhập mã quyền cách nhau bằng dấu phẩy (ví dụ "ADMIN, TASKS").
// - Cột "Thành viên" nhập tên đăng nhập cách nhau bằng dấu phẩy.
// - Validate toàn bộ file trước, chỉ khi sạch lỗi mới ghi trong 1 transaction.

const MAX_IMPORT_ROWS = 2000;
const MAX_TEMPLATE_ROWS = 500;

const DATA_SHEET = 'Nhóm';
const REF_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

type ColumnKey = 'name' | 'code' | 'permissionCodes' | 'memberNames';

type GroupRefColumn = 'permission' | 'member';

interface ColumnDef {
  key: ColumnKey;
  header: string;
  width: number;
  required?: boolean;
  /** Cột lấy danh sách gợi ý (dropdown) từ sheet 'Danh mục'. */
  refColumn?: GroupRefColumn;
  example?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'name',
    header: 'Tên nhóm',
    width: 30,
    required: true,
    example: 'Ban quản lý',
  },
  { key: 'code', header: 'Mã nhóm', width: 18, example: 'BQL' },
  {
    key: 'permissionCodes',
    header: 'Quyền',
    width: 40,
    example: 'ADMIN, TASKS',
  },
  {
    key: 'memberNames',
    header: 'Thành viên',
    width: 40,
    example: 'admin (1), nv001 (2)',
  },
];

/** Danh sách gợi ý nằm ở cột nào của sheet 'Danh mục' (1 = A). */
const REF_COLUMN_INDEX: Record<GroupRefColumn, number> = {
  permission: 1,
  member: 2,
};

/** Tra cột theo key thay vì chỉ số mảng — tránh lệch khi thêm/bớt cột. */
const COLUMN_BY_KEY = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col]),
) as Record<ColumnKey, ColumnDef>;

const GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Nhóm". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng dữ liệu là một nhóm. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật.',
  ],
  ['3', 'Cột "Tên nhóm" là bắt buộc.'],
  [
    '4',
    '"Mã nhóm" là duy nhất: dòng có mã trùng nhóm đã có thì cập nhật nhóm đó (kể cả bản đã xoá sẽ được khôi phục). Không có mã thì luôn tạo mới — nhập lại file sẽ tạo trùng. Nên điền mã để nhập nhiều lần không trùng.',
  ],
  [
    '5',
    'Cột "Quyền" nhập mã quyền cách nhau bằng dấu phẩy — ví dụ "ADMIN, TASKS". Xem sheet "Danh mục" để biết mã quyền.',
  ],
  [
    '6',
    'Cột "Thành viên" nhập tên đăng nhập cách nhau bằng dấu phẩy — ví dụ "admin (1), nv001 (2)". Phần (id) giúp lấy đúng tài khoản.',
  ],
  [
    '7',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không nhóm nào được tạo hay sửa.',
  ],
];

export interface GroupImportError {
  /** Số dòng trong Excel (1 = dòng tiêu đề). */
  row: number;
  column: string;
  message: string;
}

export interface GroupImportResult {
  total: number;
  created: number;
  updated: number;
}

interface PermissionRef {
  id: number;
  code: string;
  name: string;
}

interface MemberRef {
  id: number;
  accountName: string;
  fullName: string | null;
}

interface GroupCodeRef {
  id: number;
  code: string;
  isDeleted: boolean;
}

interface ReferenceData {
  permissions: PermissionRef[];
  members: MemberRef[];
  groups: GroupCodeRef[];
}

interface ReferenceLookups {
  permissionsByCode: Map<string, PermissionRef>;
  membersByAccount: Map<string, MemberRef[]>;
  membersById: Map<number, MemberRef>;
  groupsByCode: Map<string, GroupCodeRef>;
}

interface ParsedGroupRow {
  existingId: number | null;
  name: string;
  code: string | null;
  permissionIds: number[];
  userIds: number[];
}

@Injectable()
export class GroupsExcelService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= Danh mục tham chiếu =================

  private async loadReferenceData(): Promise<ReferenceData> {
    const [permissions, members, groups] = await Promise.all([
      this.prisma.permission.findMany({
        where: { isDeleted: false },
        orderBy: { code: 'asc' },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { isDeleted: false },
        orderBy: { accountName: 'asc' },
        select: { id: true, accountName: true, fullName: true },
      }),
      this.prisma.group.findMany({
        select: { id: true, code: true, isDeleted: true },
      }),
    ]);

    return {
      permissions,
      members,
      groups: groups
        .filter((g) => g.code)
        .map((g) => ({ id: g.id, code: g.code as string, isDeleted: g.isDeleted })),
    };
  }

  // ================= File mẫu =================

  async buildTemplate(): Promise<Buffer> {
    const ref = await this.loadReferenceData();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Quản trị hệ thống';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(DATA_SHEET, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = COLUMNS.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2174CD' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 28;

    // Dòng 2 là ví dụ — người dùng xoá trước khi nhập dữ liệu thật.
    COLUMNS.forEach((col, index) => {
      if (col.example) sheet.getRow(2).getCell(index + 1).value = col.example;
    });

    // Dropdown cho cột "Thành viên" trên MAX_TEMPLATE_ROWS dòng.
    // (Cột "Quyền" nhập mã, không dropdown vì có thể nhiều mã/phân cách phẩy.)
    const memberValues = ref.members.map((m) =>
      withIdSuffix(m.accountName, m.id),
    );
    if (memberValues.length > 0) {
      const cellIndex =
        COLUMNS.findIndex((col) => col.key === 'memberNames') + 1;
      const last = memberValues.length + 1;
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(cellIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'${REF_SHEET}'!$B$2:$B$${last}`],
        };
      }
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNS.length },
    };

    this.writeReferenceSheet(workbook, ref);
    this.writeGuideSheet(workbook);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private writeReferenceSheet(
    workbook: ExcelJS.Workbook,
    ref: ReferenceData,
  ) {
    const sheet = workbook.addWorksheet(REF_SHEET);
    const columns: Array<{ header: string; values: string[] }> = [
      {
        header: 'Quyền (mã — cách nhau bằng dấu phẩy)',
        values: ref.permissions.map((p) => `${p.code} — ${p.name}`),
      },
      {
        header: 'Thành viên',
        values: ref.members.map((m) => withIdSuffix(m.accountName, m.id)),
      },
    ];

    sheet.columns = columns.map((col, index) => ({
      header: col.header,
      key: `c${index}`,
      width: 42,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F5FF' },
    };
    headerRow.height = 22;

    const height = Math.max(...columns.map((col) => col.values.length), 0);
    for (let row = 0; row < height; row += 1) {
      columns.forEach((col, index) => {
        const value = col.values[row];
        if (value !== undefined)
          sheet.getRow(row + 2).getCell(index + 1).value = value;
      });
    }

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private writeGuideSheet(workbook: ExcelJS.Workbook) {
    const sheet = workbook.addWorksheet(GUIDE_SHEET);
    sheet.columns = [
      { header: 'Bước', key: 'step', width: 8 },
      { header: 'Hướng dẫn', key: 'text', width: 96 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.height = 22;

    for (const [step, text] of GUIDE_ROWS) sheet.addRow([step, text]);
    sheet.addRow(['', '']);
    sheet.addRow([
      '',
      'Cột bắt buộc: Tên nhóm. Các cột còn lại không bắt buộc.',
    ]);

    for (const col of COLUMNS) {
      sheet.addRow([
        '',
        `${col.header}${col.required ? ' (bắt buộc)' : ''}${
          col.example ? ` — ví dụ: ${col.example}` : ''
        }`,
      ]);
    }

    sheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // ================= Nhập dữ liệu =================

  async importFromFile(file: Express.Multer.File | undefined) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException(
        'Chưa chọn file. Vui lòng chọn file Excel theo mẫu để nhập.',
      );
    }

    const originalName = file.originalname ?? '';
    if (!/\.xlsx$/i.test(originalName)) {
      throw new BadRequestException(
        'Chỉ hỗ trợ file .xlsx. Nếu bạn đang dùng .xls hoặc .csv, hãy lưu lại dưới dạng .xlsx.',
      );
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException(
        'Không đọc được file. File có thể bị hỏng hoặc không phải định dạng .xlsx.',
      );
    }

    const sheet =
      workbook.getWorksheet(DATA_SHEET) ?? workbook.worksheets[0] ?? null;
    if (!sheet) {
      throw new BadRequestException('File không có sheet dữ liệu nào.');
    }

    const ref = await this.loadReferenceData();
    const lookup = this.buildLookups(ref);

    const headerMap = this.readHeader(sheet);
    const errors: GroupImportError[] = [];
    const parsedRows = this.parseRows(sheet, headerMap, lookup, errors);

    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập nhóm bắt đầu từ dòng 2.',
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không nhóm nào được nhập.`,
          errors,
        ),
      );
    }

    return this.persist(parsedRows);
  }

  /** Ghi tất cả nhóm trong 1 transaction: có mã trùng thì cập nhật. */
  private async persist(rows: ParsedGroupRow[]): Promise<GroupImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const { existingId, permissionIds, userIds, ...data } = row;
        if (existingId !== null) {
          await tx.group.update({
            where: { id: existingId },
            data: {
              ...data,
              permissions: { set: permissionIds.map((id) => ({ id })) },
              users: { set: userIds.map((id) => ({ id })) },
              isDeleted: false,
            },
          });
          updated += 1;
        } else {
          await tx.group.create({
            data: {
              ...data,
              permissions:
                permissionIds.length > 0
                  ? { connect: permissionIds.map((id) => ({ id })) }
                  : undefined,
              users:
                userIds.length > 0
                  ? { connect: userIds.map((id) => ({ id })) }
                  : undefined,
            },
          });
          created += 1;
        }
      }
      return { total: rows.length, created, updated };
    });
    return result;
  }

  private readHeader(sheet: Worksheet): Map<string, number> {
    const known = new Set(COLUMNS.map((col) => normalizeText(col.header)));
    const headerRow = sheet.getRow(1);
    const map = new Map<string, number>();
    const unknown: string[] = [];

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell);
      if (!text) return;
      const key = normalizeText(text);
      if (!known.has(key)) unknown.push(text);
      else if (!map.has(key)) map.set(key, colNumber);
    });

    if (unknown.length > 0) {
      throw new BadRequestException({
        message:
          `File không đúng mẫu: có cột không hợp lệ "${unknown.join('", "')}". ` +
          `Các cột hợp lệ: ${COLUMNS.map((col) => col.header).join(', ')}. ` +
          'Hãy tải lại file mẫu mới nhất.',
      });
    }

    const missing = COLUMNS.filter(
      (col) => col.required && !map.has(normalizeText(col.header)),
    );
    if (missing.length > 0) {
      throw new BadRequestException({
        message: `File không đúng mẫu: thiếu cột bắt buộc "${missing
          .map((col) => col.header)
          .join('", "')}". Hãy tải lại file mẫu mới nhất.`,
      });
    }
    return map;
  }

  private buildLookups(ref: ReferenceData): ReferenceLookups {
    const membersByAccount = new Map<string, MemberRef[]>();
    for (const member of ref.members) {
      const key = normalizeText(member.accountName);
      const list = membersByAccount.get(key);
      if (list) list.push(member);
      else membersByAccount.set(key, [member]);
    }
    return {
      permissionsByCode: new Map(
        ref.permissions.map((p) => [normalizeText(p.code), p]),
      ),
      membersByAccount,
      membersById: new Map(ref.members.map((m) => [m.id, m])),
      groupsByCode: new Map(ref.groups.map((g) => [g.code, g])),
    };
  }

  private parseRows(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    lookup: ReferenceLookups,
    errors: GroupImportError[],
  ): ParsedGroupRow[] {
    const column = {} as Record<ColumnKey, number | undefined>;
    for (const col of COLUMNS) {
      column[col.key] = headerMap.get(normalizeText(col.header));
    }

    const rows: ParsedGroupRow[] = [];

    const totalRows = sheet.rowCount;
    let dataRowCount = 0;
    const stagedCodes = new Map<string, number>();

    for (let rowNumber = 2; rowNumber <= totalRows; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const cell = (key: ColumnKey): Cell | undefined => {
        const index = column[key];
        return index ? row.getCell(index) : undefined;
      };
      const text = (key: ColumnKey) => cellText(cell(key));

      if (COLUMNS.every((col) => !text(col.key))) continue;

      dataRowCount += 1;
      if (dataRowCount > MAX_IMPORT_ROWS) {
        throw new BadRequestException(
          `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu. Hãy chia nhỏ thành nhiều file.`,
        );
      }

      const rowErrors: GroupImportError[] = [];
      const push = (key: ColumnKey, message: string) =>
        rowErrors.push({
          row: rowNumber,
          column: COLUMN_BY_KEY[key].header,
          message,
        });

      const name = text('name');
      if (!name) push('name', 'Tên nhóm là bắt buộc.');

      const code = text('code') || null;
      if (code) {
        const stagedRow = stagedCodes.get(code);
        if (stagedRow !== undefined && stagedRow !== rowNumber) {
          push('code', `Mã "${code}" đã dùng ở dòng ${stagedRow}.`);
        } else {
          stagedCodes.set(code, rowNumber);
        }
      }
      const existingId = code ? (lookup.groupsByCode.get(code)?.id ?? null) : null;

      const permissionIds = this.resolvePermissions(
        text('permissionCodes'),
        push,
        lookup,
      );
      const userIds = this.resolveMembers(text('memberNames'), push, lookup);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      rows.push({ existingId, name, code, permissionIds, userIds });
    }

    return rows;
  }

  /** Cột "Quyền": nhiều mã quyền cách nhau bằng dấu phẩy. */
  private resolvePermissions(
    raw: string,
    push: (key: ColumnKey, message: string) => void,
    lookup: ReferenceLookups,
  ): number[] {
    if (!raw) return [];
    const ids: number[] = [];
    const seen = new Set<string>();
    for (const part of raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      // Cho phép "ADMIN — Quản trị" (copy từ sheet Danh mục): chỉ lấy mã trước " — ".
      const code = part.split(/\s+[—–-]\s+/)[0].trim();
      const key = normalizeText(code);
      if (seen.has(key)) continue;
      seen.add(key);
      const found = lookup.permissionsByCode.get(key);
      if (!found) {
        push('permissionCodes', `Quyền "${part}" không tồn tại.`);
        continue;
      }
      ids.push(found.id);
    }
    return ids;
  }

  /** Cột "Thành viên": nhiều tên đăng nhập cách nhau bằng dấu phẩy. */
  private resolveMembers(
    raw: string,
    push: (key: ColumnKey, message: string) => void,
    lookup: ReferenceLookups,
  ): number[] {
    if (!raw) return [];
    const ids: number[] = [];
    for (const part of raw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      const { name, id } = splitNameId(part);
      if (id !== null) {
        const found = lookup.membersById.get(id);
        if (!found) {
          push('memberNames', `Thành viên "${part}" không tồn tại (id ${id} không có).`);
          continue;
        }
        if (!ids.includes(found.id)) ids.push(found.id);
        continue;
      }
      const candidates = lookup.membersByAccount.get(normalizeText(name)) ?? [];
      if (candidates.length === 0) {
        push(
          'memberNames',
          `Thành viên "${part}" không tồn tại. Nhập tên đăng nhập của tài khoản.`,
        );
      } else if (candidates.length > 1) {
        push(
          'memberNames',
          `Thành viên "${part}" bị trùng, hãy nhập dạng "Tên (id)".`,
        );
      } else if (!ids.includes(candidates[0].id)) {
        ids.push(candidates[0].id);
      }
    }
    return ids;
  }
}
