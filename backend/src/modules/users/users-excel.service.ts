import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Cell, Worksheet } from 'exceljs';
import {
  buildImportError,
  cellText,
  columnLetter,
  formatDateVi,
  normalizeText,
  parseDateValue,
  splitNameId,
  withIdSuffix,
} from '../../common/excel.js';
import { Gender } from '../../generated/prisma/client.js';
import { PasswordService } from '../../common/crypto/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Nhập tài khoản (nhân viên / chủ đầu tư) bằng file Excel theo khuôn mẫu do
// backend sinh ra. Hai tab dùng chung 1 service, phân biệt bằng isInvestor.
//
// Nguyên tắc:
// - "Tên đăng nhập" là duy nhất: dòng có tên trùng tài khoản đã có thì CẬP
//   NHẬT tài khoản đó (kể cả bản đã xoá mềm sẽ được khôi phục, mật khẩu giữ
//   nguyên nếu để trống); tên mới thì luôn tạo mới.
// - isInvestor lấy từ tab đang nhập (query param), KHÔNG phải cột trong file:
//   dòng mới tạo sẽ mang đúng loại tài khoản của tab; dòng cập nhật giữ
//   nguyên loại cũ để không lật loại tài khoản nhầm.
// - Các cột tham chiếu nhập theo dạng "Tên (id)" — ví dụ "Trưởng phòng (2)".
// - Validate toàn bộ file trước, chỉ khi sạch lỗi mới ghi trong 1 transaction.

const MAX_IMPORT_ROWS = 2000;
const MAX_TEMPLATE_ROWS = 500;

const EMPLOYEE_SHEET = 'Nhân viên';
const INVESTOR_SHEET = 'Tài khoản CĐT';
const REF_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

type ColumnKey =
  | 'accountName'
  | 'email'
  | 'password'
  | 'fullName'
  | 'gender'
  | 'birthday'
  | 'address'
  | 'internalPhone'
  | 'phone'
  | 'hireDate'
  | 'userLevel'
  | 'positionName'
  | 'departmentName'
  | 'coDepartmentName'
  | 'statusName'
  | 'managerName'
  | 'groupNames';

type UserRefColumn =
  | 'gender'
  | 'position'
  | 'userLevel'
  | 'department'
  | 'userStatus'
  | 'manager'
  | 'group';

interface ColumnDef {
  key: ColumnKey;
  header: string;
  width: number;
  required?: boolean;
  /** Cột lấy danh sách gợi ý (dropdown) từ sheet 'Danh mục'. */
  refColumn?: UserRefColumn;
  example?: string;
  /** Giá trị mẫu nên để dạng text để Excel không tự đổi thành ngày. */
  textExample?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'accountName',
    header: 'Tên đăng nhập',
    width: 20,
    required: true,
    example: 'nv001',
  },
  {
    key: 'email',
    header: 'Email',
    width: 28,
    required: true,
    example: 'nv001@congty.vn',
  },
  {
    key: 'password',
    header: 'Mật khẩu',
    width: 16,
    example: '123456',
  },
  { key: 'fullName', header: 'Họ tên', width: 26, example: 'Nguyễn Văn A' },
  {
    key: 'gender',
    header: 'Giới tính',
    width: 12,
    refColumn: 'gender',
    example: 'Nam',
  },
  {
    key: 'birthday',
    header: 'Ngày sinh',
    width: 14,
    textExample: '01/01/1990',
  },
  { key: 'address', header: 'Địa chỉ', width: 28, example: 'Số 1 đường ABC' },
  { key: 'internalPhone', header: 'SĐT nội bộ', width: 14, example: '101' },
  { key: 'phone', header: 'Số điện thoại', width: 16, example: '0901234567' },
  {
    key: 'hireDate',
    header: 'Ngày vào làm',
    width: 14,
    textExample: '01/06/2024',
  },
  { key: 'hireDate', header: 'Ngày vào làm', width: 14, textExample: '01/06/2024' },
  {
    key: 'userLevel',
    header: 'Cấp bậc',
    width: 20,
    refColumn: 'userLevel',
    example: 'Chuyên viên (1)',
  },
  {
    key: 'positionName',
    header: 'Chức vụ',
    width: 22,
    refColumn: 'position',
    example: 'Trưởng phòng (2)',
  },
  {
    key: 'departmentName',
    header: 'Đơn vị',
    width: 22,
    refColumn: 'department',
    example: 'Phòng kỹ thuật (1)',
  },
  {
    key: 'coDepartmentName',
    header: 'Đơn vị kiêm nhiệm',
    width: 22,
    refColumn: 'department',
    example: '',
  },
  {
    key: 'statusName',
    header: 'Trạng thái',
    width: 18,
    refColumn: 'userStatus',
    example: 'Đang làm việc (1)',
  },
  {
    key: 'managerName',
    header: 'Quản lý trực tiếp',
    width: 24,
    refColumn: 'manager',
    example: 'admin (1)',
  },
  {
    key: 'groupNames',
    header: 'Nhóm',
    width: 30,
    refColumn: 'group',
    example: 'Quản trị (1)',
  },
];

/** Danh sách gợi ý nằm ở cột nào của sheet 'Danh mục' (1 = A). */
const REF_COLUMN_INDEX: Record<UserRefColumn, number> = {
  gender: 1,
  position: 2,
  userLevel: 3,
  department: 4,
  userStatus: 5,
  manager: 6,
  group: 7,
};

/** Tra cột theo key thay vì chỉ số mảng — tránh lệch khi thêm/bớt cột. */
const COLUMN_BY_KEY = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col]),
) as Record<ColumnKey, ColumnDef>;

const GENDER_LABEL: Record<Gender, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

const GENDER_BY_LABEL = new Map<string, Gender>(
  Object.entries(GENDER_LABEL).map(([code, label]) => [
    normalizeText(label),
    code as Gender,
  ]),
);

const MIN_PASSWORD_LENGTH = 6;

function guideRows(isInvestor: boolean): Array<[string, string]> {
  const kind = isInvestor ? 'chủ đầu tư' : 'nhân viên';
  return [
    ['Cách dùng', ''],
    [
      '1',
      'Chỉ sửa dữ liệu trong sheet dữ liệu. Không đổi tên hoặc thứ tự các cột tiêu đề.',
    ],
    [
      '2',
      'Mỗi dòng dữ liệu là một tài khoản. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật.',
    ],
    ['3', 'Cột "Tên đăng nhập" và "Email" là bắt buộc.'],
    [
      '4',
      `"Tên đăng nhập" là duy nhất: dòng có tên trùng tài khoản đã có thì cập nhật tài khoản đó (kể cả bản đã xoá sẽ được khôi phục; để trống mật khẩu thì giữ mật khẩu cũ). Tên mới thì luôn tạo mới — tài khoản mới bắt buộc có mật khẩu từ ${MIN_PASSWORD_LENGTH} ký tự.`,
    ],
    [
      '5',
      `Mọi tài khoản nhập từ file này đều thuộc loại "${kind}". Tài khoản đã có giữ nguyên loại cũ, không bị đổi loại.`,
    ],
    [
      '6',
      'Các cột tham chiếu (Chức vụ, Đơn vị, Quản lý, Nhóm...) nhập theo dạng "Tên (id)" — ví dụ "Phòng kỹ thuật (1)". Chỉ gõ tên vẫn được (khớp không phân biệt hoa thường và dấu), nhưng trùng tên sẽ báo lỗi.',
    ],
    [
      '7',
      'Cột "Nhóm" nhập nhiều nhóm cách nhau bằng dấu phẩy — ví dụ "Quản trị (1), Kỹ thuật (2)". Để trống nếu chưa xếp nhóm.',
    ],
    [
      '8',
      'Giới tính nhập "Nam", "Nữ" hoặc "Khác" (hoặc mã MALE/FEMALE/OTHER). Ngày nhập theo dd/MM/yyyy (ví dụ 01/06/2024).',
    ],
    [
      '9',
      'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không tài khoản nào được tạo hay sửa.',
    ],
  ];
}

export interface UserImportError {
  /** Số dòng trong Excel (1 = dòng tiêu đề). */
  row: number;
  column: string;
  message: string;
}

export interface UserImportResult {
  total: number;
  created: number;
  updated: number;
}

interface NamedRef {
  id: number;
  name: string;
}

interface CodeNamedRef extends NamedRef {
  code: string | null;
}

interface ManagerRef {
  id: number;
  accountName: string;
  fullName: string | null;
}

interface AccountRef {
  id: number;
  accountName: string;
  email: string;
  isDeleted: boolean;
}

interface ReferenceData {
  positions: CodeNamedRef[];
  userLevels: CodeNamedRef[];
  departments: CodeNamedRef[];
  userStatuses: CodeNamedRef[];
  managers: ManagerRef[];
  groups: CodeNamedRef[];
  accounts: AccountRef[];
}

/** Tra cứu tên -> bản ghi đã chuẩn hoá, dùng khi đọc file nhập. */
interface ReferenceLookups {
  positions: Map<string, CodeNamedRef[]>;
  userLevels: Map<string, CodeNamedRef[]>;
  departments: Map<string, CodeNamedRef[]>;
  userStatuses: Map<string, CodeNamedRef[]>;
  managersByAccount: Map<string, ManagerRef[]>;
  groups: Map<string, CodeNamedRef[]>;
  // Tra cứu theo ID — hậu tố "(id)" trong ô được ưu tiên hơn tên.
  positionsById: Map<number, CodeNamedRef>;
  userLevelsById: Map<number, CodeNamedRef>;
  departmentsById: Map<number, CodeNamedRef>;
  userStatusesById: Map<number, CodeNamedRef>;
  managersById: Map<number, ManagerRef>;
  groupsById: Map<number, CodeNamedRef>;
  accountsByName: Map<string, AccountRef>;
  accountsByEmail: Map<string, AccountRef>;
}

interface ParsedUserRow {
  existingId: number | null;
  accountName: string;
  email: string;
  /** Mật khẩu thô (chưa hash). Null = giữ nguyên (chỉ khi cập nhật). */
  password: string | null;
  fullName: string | null;
  gender: Gender | null;
  birthday: Date | null;
  address: string | null;
  internalPhone: string | null;
  phone: string | null;
  hireDate: Date | null;
  userLevelId: number | null;
  positionId: number | null;
  departmentId: number | null;
  coDepartmentId: number | null;
  statusId: number | null;
  managerId: number | null;
  groupIds: number[];
}

@Injectable()
export class UsersExcelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  // ================= Danh mục tham chiếu =================

  private async loadReferenceData(): Promise<ReferenceData> {
    const notDeleted = { isDeleted: false };
    const byName = { name: 'asc' as const };
    const [
      positions,
      userLevels,
      departments,
      userStatuses,
      managers,
      groups,
      accounts,
    ] = await Promise.all([
      this.prisma.position.findMany({ where: notDeleted, orderBy: byName }),
      this.prisma.userLevel.findMany({ where: notDeleted, orderBy: byName }),
      this.prisma.department.findMany({
        where: notDeleted,
        orderBy: byName,
      }),
      this.prisma.userStatus.findMany({
        where: notDeleted,
        orderBy: byName,
      }),
      this.prisma.user.findMany({
        where: notDeleted,
        orderBy: { accountName: 'asc' },
        select: { id: true, accountName: true, fullName: true },
      }),
      this.prisma.group.findMany({ where: notDeleted, orderBy: byName }),
      this.prisma.user.findMany({
        select: { id: true, accountName: true, email: true, isDeleted: true },
      }),
    ]);

    return {
      positions,
      userLevels,
      departments,
      userStatuses,
      managers,
      groups,
      accounts,
    };
  }

  /** Map tên đã chuẩn hoá -> bản ghi, giữ lại danh sách để phát hiện trùng tên. */
  private indexByName<T extends { name: string }>(rows: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const key = normalizeText(row.name);
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return map;
  }

  /** Map id -> bản ghi, dùng khi ô có hậu tố "(id)" (ưu tiên hơn tên). */
  private indexById<T extends { id: number }>(rows: T[]): Map<number, T> {
    const map = new Map<number, T>();
    for (const row of rows) map.set(row.id, row);
    return map;
  }

  // ================= File mẫu =================

  async buildTemplate(isInvestor: boolean): Promise<Buffer> {
    const ref = await this.loadReferenceData();
    const dataSheet = isInvestor ? INVESTOR_SHEET : EMPLOYEE_SHEET;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Quản trị hệ thống';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(dataSheet, {
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
      const example = col.textExample ?? col.example;
      if (example) sheet.getRow(2).getCell(index + 1).value = example;
    });

    // Dropdown cho các cột tham chiếu trên MAX_TEMPLATE_ROWS dòng.
    const refValues = this.referenceValues(ref);
    COLUMNS.forEach((col, index) => {
      if (!col.refColumn) return;
      const values = refValues[col.refColumn];
      if (values.length === 0) return;
      const cellIndex = index + 1;
      const letter = columnLetter(REF_COLUMN_INDEX[col.refColumn]);
      const last = values.length + 1;
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(cellIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'${REF_SHEET}'!$${letter}$2:$${letter}$${last}`],
        };
      }
    });

    // Ô ngày: format dd/MM/yyyy để người dùng thấy trước khi nhập.
    COLUMNS.forEach((col, index) => {
      if (col.key !== 'birthday' && col.key !== 'hireDate') return;
      sheet.getColumn(index + 1).numFmt = 'dd/mm/yyyy';
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNS.length },
    };

    this.writeReferenceSheet(workbook, ref);
    this.writeGuideSheet(workbook, dataSheet, isInvestor);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Giá trị "Tên (id)" (giới tính: tên tiếng Việt) cho từng cột dropdown. */
  private referenceValues(ref: ReferenceData): Record<UserRefColumn, string[]> {
    const named = (rows: Array<{ id: number; name: string }>) =>
      rows.map((r) => withIdSuffix(r.name, r.id));
    return {
      gender: Object.values(GENDER_LABEL),
      position: named(ref.positions),
      userLevel: named(ref.userLevels),
      department: named(ref.departments),
      userStatus: named(ref.userStatuses),
      manager: ref.managers.map((m) => withIdSuffix(m.accountName, m.id)),
      group: named(ref.groups),
    };
  }

  private writeReferenceSheet(
    workbook: ExcelJS.Workbook,
    ref: ReferenceData,
  ) {
    const sheet = workbook.addWorksheet(REF_SHEET);
    // Mỗi giá trị đã ở dạng "Tên (id)" để copy nguyên sang file nhập.
    const values = this.referenceValues(ref);
    const columns: Array<{ header: string; values: string[] }> = [
      { header: 'Giới tính', values: values.gender },
      { header: 'Chức vụ', values: values.position },
      { header: 'Cấp bậc', values: values.userLevel },
      { header: 'Đơn vị', values: values.department },
      { header: 'Trạng thái', values: values.userStatus },
      { header: 'Quản lý', values: values.manager },
      { header: 'Nhóm', values: values.group },
    ];

    sheet.columns = columns.map((col, index) => ({
      header: col.header,
      key: `c${index}`,
      width: 30,
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

  private writeGuideSheet(
    workbook: ExcelJS.Workbook,
    dataSheet: string,
    isInvestor: boolean,
  ) {
    const sheet = workbook.addWorksheet(GUIDE_SHEET);
    sheet.columns = [
      { header: 'Bước', key: 'step', width: 8 },
      { header: 'Hướng dẫn', key: 'text', width: 96 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.height = 22;

    for (const [step, text] of guideRows(isInvestor)) sheet.addRow([step, text]);
    sheet.addRow(['', '']);
    sheet.addRow([
      '',
      `Sheet dữ liệu: "${dataSheet}". Cột bắt buộc: Tên đăng nhập, Email.`,
    ]);

    for (const col of COLUMNS) {
      sheet.addRow([
        '',
        `${col.header}${col.required ? ' (bắt buộc)' : ''}${
          col.example ?? col.textExample
            ? ` — ví dụ: ${col.example ?? col.textExample}`
            : ''
        }`,
      ]);
    }

    sheet.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // ================= Nhập dữ liệu =================

  async importFromFile(
    file: Express.Multer.File | undefined,
    isInvestor: boolean,
  ) {
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

    const dataSheet = isInvestor ? INVESTOR_SHEET : EMPLOYEE_SHEET;
    const sheet =
      workbook.getWorksheet(dataSheet) ?? workbook.worksheets[0] ?? null;
    if (!sheet) {
      throw new BadRequestException('File không có sheet dữ liệu nào.');
    }

    const ref = await this.loadReferenceData();
    const lookup = this.buildLookups(ref);

    const headerMap = this.readHeader(sheet);
    const errors: UserImportError[] = [];
    const parsedRows = this.parseRows(sheet, headerMap, lookup, errors);

    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập tài khoản bắt đầu từ dòng 2.',
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không tài khoản nào được nhập.`,
          errors,
        ),
      );
    }

    return this.persist(parsedRows, isInvestor);
  }

  /** Ghi tất cả tài khoản trong 1 transaction: tên trùng thì cập nhật. */
  private async persist(
    rows: ParsedUserRow[],
    isInvestor: boolean,
  ): Promise<UserImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const { existingId, password, groupIds, ...data } = row;
        const hashed =
          password !== null
            ? await this.passwordService.hash(password)
            : undefined;
        if (existingId !== null) {
          await tx.user.update({
            where: { id: existingId },
            data: {
              ...data,
              ...(hashed ? { password: hashed } : {}),
              groups: { set: groupIds.map((id) => ({ id })) },
              isDeleted: false,
            },
          });
          updated += 1;
        } else {
          await tx.user.create({
            data: {
              ...data,
              isInvestor,
              password: hashed as string,
              groups:
                groupIds.length > 0
                  ? { connect: groupIds.map((id) => ({ id })) }
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

    // Bỏ qua tiêu đề lạ nguyên tại: nếu im lặng, người dùng gõ sai chính tả
    // sẽ mất sạch cột đó mà không ai biết.
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
    const managersByAccount = new Map<string, ManagerRef[]>();
    for (const manager of ref.managers) {
      const key = normalizeText(manager.accountName);
      const list = managersByAccount.get(key);
      if (list) list.push(manager);
      else managersByAccount.set(key, [manager]);
    }
    return {
      positions: this.indexByName(ref.positions),
      userLevels: this.indexByName(ref.userLevels),
      departments: this.indexByName(ref.departments),
      userStatuses: this.indexByName(ref.userStatuses),
      managersByAccount,
      groups: this.indexByName(ref.groups),
      positionsById: this.indexById(ref.positions),
      userLevelsById: this.indexById(ref.userLevels),
      departmentsById: this.indexById(ref.departments),
      userStatusesById: this.indexById(ref.userStatuses),
      managersById: this.indexById(ref.managers),
      groupsById: this.indexById(ref.groups),
      accountsByName: new Map(
        ref.accounts.map((a) => [normalizeText(a.accountName), a]),
      ),
      accountsByEmail: new Map(
        ref.accounts.map((a) => [normalizeText(a.email), a]),
      ),
    };
  }

  private parseRows(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    lookup: ReferenceLookups,
    errors: UserImportError[],
  ): ParsedUserRow[] {
    const column = {} as Record<ColumnKey, number | undefined>;
    for (const col of COLUMNS) {
      column[col.key] = headerMap.get(normalizeText(col.header));
    }

    const rows: ParsedUserRow[] = [];

    const totalRows = sheet.rowCount;
    let dataRowCount = 0;
    const stagedAccounts = new Map<string, number>();
    const stagedEmails = new Map<string, number>();

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

      const rowErrors: UserImportError[] = [];
      const push = (key: ColumnKey, message: string) =>
        rowErrors.push({
          row: rowNumber,
          column: COLUMN_BY_KEY[key].header,
          message,
        });

      const accountName = text('accountName');
      if (!accountName) push('accountName', 'Tên đăng nhập là bắt buộc.');
      else {
        const key = normalizeText(accountName);
        const stagedRow = stagedAccounts.get(key);
        if (stagedRow !== undefined && stagedRow !== rowNumber) {
          push(
            'accountName',
            `Tên đăng nhập "${accountName}" đã dùng ở dòng ${stagedRow}.`,
          );
        } else {
          stagedAccounts.set(key, rowNumber);
        }
      }

      const email = text('email');
      if (!email) {
        push('email', 'Email là bắt buộc.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        push('email', `Email "${email}" không đúng định dạng.`);
      } else {
        const key = normalizeText(email);
        const stagedRow = stagedEmails.get(key);
        if (stagedRow !== undefined && stagedRow !== rowNumber) {
          push('email', `Email "${email}" đã dùng ở dòng ${stagedRow}.`);
        } else {
          stagedEmails.set(key, rowNumber);
        }
      }

      const existing = accountName
        ? (lookup.accountsByName.get(normalizeText(accountName)) ?? null)
        : null;
      const existingId = existing?.id ?? null;

      // Email trùng tài khoản khác trong DB thì báo lỗi (kể cả dòng cập nhật).
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const owner = lookup.accountsByEmail.get(normalizeText(email));
        if (owner && owner.id !== existingId) {
          push(
            'email',
            `Email "${email}" đã thuộc tài khoản "${owner.accountName}".`,
          );
        }
      }

      const rawPassword = text('password');
      let password: string | null = null;
      if (rawPassword) {
        if (rawPassword.length < MIN_PASSWORD_LENGTH) {
          push(
            'password',
            `Mật khẩu phải từ ${MIN_PASSWORD_LENGTH} ký tự trở lên.`,
          );
        } else {
          password = rawPassword;
        }
      } else if (existingId === null && accountName && email) {
        push(
          'password',
          `Tài khoản mới phải có mật khẩu (từ ${MIN_PASSWORD_LENGTH} ký tự).`,
        );
      }

      const fullName = text('fullName') || null;

      let gender: Gender | null = null;
      const genderText = text('gender');
      if (genderText) {
        const upper = genderText.trim().toUpperCase();
        if (upper === 'MALE' || upper === 'FEMALE' || upper === 'OTHER') {
          gender = upper as Gender;
        } else {
          const found = GENDER_BY_LABEL.get(normalizeText(genderText));
          if (!found)
            push('gender', `Giới tính "${genderText}" không hợp lệ (Nam/Nữ/Khác).`);
          else gender = found;
        }
      }

      const birthday = this.resolveDate(text('birthday'), 'birthday', push);
      const hireDate = this.resolveDate(text('hireDate'), 'hireDate', push);

      const address = text('address') || null;
      const internalPhone = text('internalPhone') || null;
      const phone = text('phone') || null;

      let userLevelId: number | null = null;
      const userLevelText = text('userLevel');
      if (userLevelText) {
        userLevelId = this.resolveDroplist(
          userLevelText,
          'userLevel',
          lookup.userLevelsById,
          lookup.userLevels,
          'Cấp bậc',
          push,
        );
      }

      const positionId = this.resolveDroplist(
        text('positionName'),
        'positionName',
        lookup.positionsById,
        lookup.positions,
        'Chức vụ',
        push,
      );
      const departmentId = this.resolveDroplist(
        text('departmentName'),
        'departmentName',
        lookup.departmentsById,
        lookup.departments,
        'Đơn vị',
        push,
      );
      const coDepartmentId = this.resolveDroplist(
        text('coDepartmentName'),
        'coDepartmentName',
        lookup.departmentsById,
        lookup.departments,
        'Đơn vị kiêm nhiệm',
        push,
      );
      const statusId = this.resolveDroplist(
        text('statusName'),
        'statusName',
        lookup.userStatusesById,
        lookup.userStatuses,
        'Trạng thái',
        push,
      );
      const managerId = this.resolveManager(text('managerName'), push, lookup);
      const groupIds = this.resolveGroups(text('groupNames'), push, lookup);

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      rows.push({
        existingId,
        accountName,
        email,
        password,
        fullName,
        gender,
        birthday,
        address,
        internalPhone,
        phone,
        hireDate,
        userLevelId,
        positionId,
        departmentId,
        coDepartmentId,
        statusId,
        managerId,
        groupIds,
      });
    }

    return rows;
  }

  private resolveDate(
    raw: string,
    key: ColumnKey,
    push: (key: ColumnKey, message: string) => void,
  ): Date | null {
    if (!raw) return null;
    const { date, error } = parseDateValue(raw);
    if (error) {
      push(key, `${COLUMN_BY_KEY[key].header}: ${error}`);
      return null;
    }
    return date ?? null;
  }

  /** Cột tham chiếu đơn: ưu tiên "(id)", sau đó khớp tên (báo lỗi khi trùng). */
  private resolveDroplist(
    raw: string,
    key: ColumnKey,
    byId: Map<number, CodeNamedRef>,
    byName: Map<string, CodeNamedRef[]>,
    label: string,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!raw) return null;
    const { name, id } = splitNameId(raw);
    if (id !== null) {
      const found = byId.get(id);
      if (!found) {
        push(key, `${label} "${raw}" không tồn tại (id ${id} không có).`);
        return null;
      }
      return found.id;
    }
    const candidates = byName.get(normalizeText(name)) ?? [];
    if (candidates.length === 0) {
      push(
        key,
        `${label} "${raw}" không tồn tại. Xem sheet "Danh mục" để chọn đúng.`,
      );
      return null;
    }
    if (candidates.length > 1) {
      push(
        key,
        `${label} "${raw}" bị trùng tên, hãy nhập dạng "Tên (id)".`,
      );
      return null;
    }
    return candidates[0].id;
  }

  /** Quản lý nhập theo tên đăng nhập: "admin" hoặc "admin (1)". */
  private resolveManager(
    raw: string,
    push: (key: ColumnKey, message: string) => void,
    lookup: ReferenceLookups,
  ): number | null {
    if (!raw) return null;
    const { name, id } = splitNameId(raw);
    if (id !== null) {
      const found = lookup.managersById.get(id);
      if (!found) {
        push('managerName', `Quản lý "${raw}" không tồn tại (id ${id} không có).`);
        return null;
      }
      return found.id;
    }
    const candidates = lookup.managersByAccount.get(normalizeText(name)) ?? [];
    if (candidates.length === 0) {
      push(
        'managerName',
        `Quản lý "${raw}" không tồn tại. Nhập tên đăng nhập kèm (id), ví dụ "admin (1)".`,
      );
      return null;
    }
    if (candidates.length > 1) {
      push('managerName', `Quản lý "${raw}" bị trùng, hãy nhập dạng "Tên (id)".`);
      return null;
    }
    return candidates[0].id;
  }

  /** Cột "Nhóm": nhiều nhóm cách nhau bằng dấu phẩy, mỗi nhóm dạng "Tên (id)". */
  private resolveGroups(
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
        const found = lookup.groupsById.get(id);
        if (!found) {
          push('groupNames', `Nhóm "${part}" không tồn tại (id ${id} không có).`);
          continue;
        }
        if (!ids.includes(found.id)) ids.push(found.id);
        continue;
      }
      const candidates = lookup.groups.get(normalizeText(name)) ?? [];
      if (candidates.length === 0) {
        push(
          'groupNames',
          `Nhóm "${part}" không tồn tại. Xem sheet "Danh mục" để chọn đúng.`,
        );
      } else if (candidates.length > 1) {
        push('groupNames', `Nhóm "${part}" bị trùng tên, hãy nhập dạng "Tên (id)".`);
      } else if (!ids.includes(candidates[0].id)) {
        ids.push(candidates[0].id);
      }
    }
    return ids;
  }
}
