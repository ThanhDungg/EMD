import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Cell, Worksheet } from 'exceljs';
import {
  addCascadeLists,
  buildImportError,
  cellText,
  columnLetter,
  formatDateVi,
  normalizeText,
  parseDateValue,
  parseIdValue,
  parseQuantityValue,
} from '../../common/excel.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AssetFilters } from './assets.service.js';
import { AssetsService } from './assets.service.js';

// Nhập tài sản bằng file Excel theo khuôn mẫu do backend sinh ra.
//
// Nguyên tắc:
// - Mã tài sản KHÔNG có trong file, do hệ thống tự sinh (TS-0001, TS-0002...)
//   để không bao giờ trùng `assets.code` (unique, kể cả bản ghi đã xoá mềm).
// - Các cột tham chiếu nhập theo TÊN tiếng Việt, khớp không phân biệt hoa thường
//   và dấu tiếng Việt. Sai tên thì báo đúng dòng/cột và KHÔNG gì cũng được ghi.
// - Validate toàn bộ file trước, chỉ khi sạch lỗi mới ghi trong một transaction.

const MAX_IMPORT_ROWS = 2000;
const MAX_TEMPLATE_ROWS = 500;

const CODE_PREFIX = 'TS-';
const CODE_DIGITS = 4;

/** Khoá advisory chống 2 request import chạy song song sinh trùng mã. */
const IMPORT_LOCK_ID = 20_260_929;

const DATA_SHEET = 'Tài sản';
const REF_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

type RefColumn = 'category' | 'unit' | 'usageStatus' | 'condition';

type ColumnKey =
  | 'name'
  | 'siteId'
  | 'siteName'
  | 'locationId'
  | 'locationPath'
  | 'categoryId'
  | 'categoryName'
  | 'usageStatusId'
  | 'usageStatusName'
  | 'conditionId'
  | 'conditionName'
  | 'quantity'
  | 'unitId'
  | 'unitName'
  | 'usageDate'
  | 'warrantyEnd'
  | 'supplier'
  | 'origin'
  | 'model'
  | 'remarks'
  | 'detail';

interface ColumnDef {
  key: ColumnKey;
  header: string;
  width: number;
  required?: boolean;
  /** Cột lấy danh sách gợi ý (dropdown) từ sheet 'Danh mục'. */
  refColumn?: RefColumn;
  example?: string;
  /** Giá trị mẫu nên để dạng text để Excel không tự đổi thành ngày. */
  textExample?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'name',
    header: 'Tên tài sản',
    width: 36,
    required: true,
    example: 'Điều hoà 2 chiều 18000BTU',
  },
  // Cặp ID + Tên: khi cột ID có số thì lấy đúng bản ghi đó, không cần khớp
  // tên. Cột ID để trống thì quay sang nhập/khớp theo tên như cũ.
  {
    key: 'siteId',
    header: 'ID dự án',
    width: 12,
  },
  {
    key: 'siteName',
    header: 'Dự án',
    width: 26,
    example: 'Tòa A - Khu văn phòng',
  },
  {
    key: 'locationId',
    header: 'ID vị trí',
    width: 12,
  },
  {
    key: 'locationPath',
    header: 'Vị trí',
    width: 44,
    example: 'Tầng 1 > Hành chính > Phòng kế toán',
  },
  {
    key: 'categoryId',
    header: 'ID danh mục TS',
    width: 14,
  },
  {
    key: 'categoryName',
    header: 'Danh mục tài sản',
    width: 28,
    refColumn: 'category',
    example: 'Điều hoà / TĐH',
  },
  {
    key: 'usageStatusId',
    header: 'ID trạng thái',
    width: 14,
  },
  {
    key: 'usageStatusName',
    header: 'Trạng thái sử dụng',
    width: 20,
    refColumn: 'usageStatus',
    example: 'Đang sử dụng',
  },
  {
    key: 'conditionId',
    header: 'ID tình trạng',
    width: 14,
  },
  {
    key: 'conditionName',
    header: 'Tình trạng',
    width: 22,
    refColumn: 'condition',
    example: 'Tốt',
  },
  { key: 'quantity', header: 'Số lượng', width: 12, example: '2' },
  {
    key: 'unitId',
    header: 'ID đơn vị tính',
    width: 16,
  },
  {
    key: 'unitName',
    header: 'Đơn vị tính',
    width: 14,
    refColumn: 'unit',
    example: 'Cái',
  },
  {
    key: 'usageDate',
    header: 'Ngày sử dụng',
    width: 14,
    textExample: '01/03/2024',
  },
  {
    key: 'warrantyEnd',
    header: 'Hạn bảo hành',
    width: 14,
    textExample: '01/03/2027',
  },
  {
    key: 'supplier',
    header: 'Nhà cung cấp',
    width: 22,
    example: 'Daikin',
  },
  { key: 'origin', header: 'Xuất xứ', width: 16, example: 'Nhật Bản' },
  { key: 'model', header: 'Model', width: 18, example: 'FTV-B50' },
  { key: 'remarks', header: 'Ghi chú', width: 30, example: 'Lắp trên tường' },
  {
    key: 'detail',
    header: 'Thông tin chi tiết',
    width: 36,
    example: 'Bảo hành 36 tháng',
  },
];

/** Danh sách gợi ý nằm ở cột nào của sheet 'Danh mục' (cột TÊN, 1 = A).
 *  Sheet Danh mục xếp cặp ID + Tên nên cột tên nằm ở B/D/F/H. */
const REF_COLUMN_INDEX: Record<RefColumn, number> = {
  category: 2,
  unit: 4,
  usageStatus: 6,
  condition: 8,
};

/** Tra cột theo key thay vì chỉ số mảng — tránh lệch khi thêm/bớt cột. */
const COLUMN_BY_KEY = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col]),
) as Record<ColumnKey, ColumnDef>;

/**
 * Cột chỉ xuất hiện trong file XUẤT (không có trong file mẫu): chấp nhận và
 * bỏ qua khi nhập — mã tài sản luôn tự sinh nên không bao giờ lấy từ file.
 */
const IMPORT_IGNORED_HEADERS = new Set([normalizeText('Mã tài sản')]);

const GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Tài sản". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  ['2', 'Mỗi dòng dữ liệu là một tài sản. Dòng trống hoàn toàn sẽ bị bỏ qua.'],
  [
    '3',
    'Cột "Tên tài sản" là bắt buộc. Các cột còn lại để trống được, sẽ lưu là rỗng.',
  ],
  [
    '4',
    'Không cần nhập mã tài sản. Hệ thống tự sinh mã TS-0001, TS-0002... theo thứ tự dòng. Cột "Mã tài sản" (nếu có từ file xuất) được bỏ qua.',
  ],
  [
    '5',
    'Mỗi cột ID đi kèm 1 cột tên (ID dự án + Dự án, ID vị trí + Vị trí...). Khi cột ID có số thì hệ thống lấy đúng bản ghi đó — không cần khớp tên, tránh nhầm khi trùng tên.',
  ],
  [
    '6',
    'Cột ID để trống thì nhập/khớp theo tên như cũ: không phân biệt hoa thường và dấu tiếng Việt. Chọn từ dropdown để tránh sai.',
  ],
  [
    '7',
    'Muốn nhập nhiều đợt: nhập đợt 1 (theo tên), bấm "Xuất Excel" để lấy ID thật, điền ID vào đợt 2.',
  ],
  [
    '8',
    'Ngày nhập theo dd/MM/yyyy (ví dụ 01/03/2024). Cột số lượng nhập số, không có dấu phẩy phân cách nghìn.',
  ],
  [
    '9',
    'Cột "Vị trí" ghi đường dẫn từ dự án tới vị trí, phân tách bằng dấu ">" hoặc "/". Có "ID vị trí" thì không cần Dự án và Vị trí.',
  ],
  [
    '10',
    'Dropdown LIÊN KẾT: chọn "Dự án" (tên hoặc ID) trước, dropdown "Vị trí" cùng dòng tự lọc đúng cây của dự án đó. Chưa chọn Dự án mà mở dropdown Vị trí thì Excel báo lỗi nguồn — cứ chọn Dự án trước là hết.',
  ],
  [
    '11',
    'Hệ thống kiểm tra TOÀN BỆ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không tài sản nào được tạo.',
  ],
  [
    '12',
    'Sau khi nhập xong, danh sách tài sản được làm mới. Kiểm tra lại số lượng đã nhập.',
  ],
];

export interface AssetImportError {
  /** Số dòng trong Excel (1 = dòng tiêu đề). */
  row: number;
  column: string;
  message: string;
}

export interface AssetImportResult {
  total: number;
  created: number;
  firstCode: string;
  lastCode: string;
}

interface DroplistRef {
  id: number;
  code: string | null;
  name: string;
}

interface LocationRef {
  id: number;
  code: string | null;
  name: string;
  siteId: number;
  parentId: number | null;
}

interface ReferenceData {
  categories: DroplistRef[];
  units: DroplistRef[];
  usageStatuses: DroplistRef[];
  conditions: DroplistRef[];
  sites: Array<{ id: number; name: string }>;
  locations: LocationRef[];
  /** ID + đường dẫn đầy đủ của từng vị trí, dùng cho sheet 'Danh mục'. */
  locationEntries: Array<{ id: number; path: string; siteId: number }>;
}

/** Tra cứu tên -> id đã chuẩn hoá, dùng khi đọc file nhập. */
interface ReferenceLookups {
  categories: Map<string, number[]>;
  units: Map<string, number[]>;
  usageStatuses: Map<string, number[]>;
  conditions: Map<string, number[]>;
  sites: Map<string, number[]>;
  /** key = `${siteId}:${parentId ?? 0}` -> danh sách vị trí con. */
  locationChildren: Map<string, LocationRef[]>;
  // Tra cứu theo ID — cột "ID ..." trong file được ưu tiên hơn tên.
  categoriesById: Map<number, DroplistRef>;
  unitsById: Map<number, DroplistRef>;
  usageStatusesById: Map<number, DroplistRef>;
  conditionsById: Map<number, DroplistRef>;
  sitesById: Map<number, { id: number; name: string }>;
  locationsById: Map<number, LocationRef>;
}

@Injectable()
export class AssetsExcelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsService: AssetsService,
  ) {}

  // ================= Danh mục tham chiếu =================

  private async loadReferenceData(): Promise<ReferenceData> {
    const [categories, units, usageStatuses, conditions, sites, locations] =
      await Promise.all([
        this.prisma.assetCategory.findMany({
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        }),
        this.prisma.assetUnit.findMany({
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        }),
        this.prisma.assetUsageStatus.findMany({
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        }),
        this.prisma.assetCondition.findMany({
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        }),
        this.prisma.site.findMany({
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
        }),
        this.prisma.siteLocation.findMany({ where: { isDeleted: false } }),
      ]);

    return {
      categories,
      units,
      usageStatuses,
      conditions,
      sites,
      locations,
      locationEntries: this.buildLocationEntries(sites, locations),
    };
  }

  /** Đường dẫn "Tòa A > Tầng 1 > Hành chính > Phòng kế toán" cho mỗi vị trí. */
  private buildLocationPaths(
    sites: Array<{ id: number; name: string }>,
    locations: LocationRef[],
  ): string[] {
    const siteName = new Map(sites.map((site) => [site.id, site.name]));
    const childrenOf = new Map<number, LocationRef[]>();
    for (const item of locations) {
      const key = item.parentId ?? 0;
      const list = childrenOf.get(key);
      if (list) list.push(item);
      else childrenOf.set(key, [item]);
    }

    const paths: string[] = [];
    const walk = (item: LocationRef, prefix: string) => {
      const full = prefix ? `${prefix} > ${item.name}` : item.name;
      paths.push(full);
      for (const child of childrenOf.get(item.id) ?? []) walk(child, full);
    };
    for (const root of childrenOf.get(0) ?? []) {
      const site = siteName.get(root.siteId);
      walk(root, site ?? '');
    }
    return paths.sort((a, b) => a.localeCompare(b, 'vi'));
  }

  /** Map tên đã chuẩn hoá -> id, giữ lại danh sách id để phát hiện trùng tên. */
  private indexByName(
    rows: Array<{ id: number; name: string }>,
  ): Map<string, number[]> {
    const map = new Map<string, number[]>();
    for (const row of rows) {
      const key = normalizeText(row.name);
      const list = map.get(key);
      if (list) list.push(row.id);
      else map.set(key, [row.id]);
    }
    return map;
  }

  // ================= File mẫu =================

  /** Mục vị trí trong sheet 'Danh mục': ID + đường dẫn để copy sang file nhập. */
  private buildLocationEntries(
    sites: Array<{ id: number; name: string }>,
    locations: LocationRef[],
  ): Array<{ id: number; path: string; siteId: number }> {
    const siteName = new Map(sites.map((site) => [site.id, site.name]));
    const childrenOf = new Map<number, LocationRef[]>();
    for (const item of locations) {
      const key = item.parentId ?? 0;
      const list = childrenOf.get(key);
      if (list) list.push(item);
      else childrenOf.set(key, [item]);
    }

    const entries: Array<{ id: number; path: string; siteId: number }> = [];
    const walk = (item: LocationRef, prefix: string) => {
      const full = prefix ? `${prefix} > ${item.name}` : item.name;
      entries.push({ id: item.id, path: full, siteId: item.siteId });
      for (const child of childrenOf.get(item.id) ?? []) walk(child, full);
    };
    for (const root of childrenOf.get(0) ?? []) {
      const site = siteName.get(root.siteId);
      walk(root, site ?? '');
    }
    return entries.sort((a, b) => a.path.localeCompare(b.path, 'vi'));
  }

  async buildTemplate(): Promise<Buffer> {
    const ref = await this.loadReferenceData();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Tài sản';
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

    // 2 dòng ví dụ: dòng 2 lấy luôn giá trị mẫu của từng cột, dòng 3 minh hoạ
    // dữ liệu thật (dự án + đường dẫn vị trí lấy từ danh mục hiện có).
    // Các ô ID ở dòng ví dụ được điền ID thật khớp với tên — người dùng thấy
    // ngay cách dùng cặp ID + Tên.
    COLUMNS.forEach((col, index) => {
      const example = col.textExample ?? col.example;
      if (example) sheet.getRow(2).getCell(index + 1).value = example;
    });

    sheet.getRow(3).getCell(1).value = 'Máy bơm nước công nghiệp';
    const firstSite = ref.sites[0];
    const firstEntry = ref.locationEntries.find(
      (e) => !firstSite || e.siteId === firstSite.id,
    );
    if (firstSite) {
      sheet.getRow(3).getCell(columnIndex('siteId')).value = firstSite.id;
      sheet.getRow(3).getCell(columnIndex('siteName')).value = firstSite.name;
    }
    if (firstEntry) {
      sheet.getRow(3).getCell(columnIndex('locationId')).value = firstEntry.id;
      sheet.getRow(3).getCell(columnIndex('locationPath')).value =
        firstEntry.path;
    }

    const exampleIdOf = (
      list: Array<{ id: number; name: string }>,
      name: string,
    ): number | undefined => {
      const found = list.find(
        (item) => normalizeText(item.name) === normalizeText(name),
      );
      return found?.id;
    };
    const examplePairs: Array<[ColumnKey, ColumnKey, DroplistRef[]]> = [
      ['categoryId', 'categoryName', ref.categories],
      ['usageStatusId', 'usageStatusName', ref.usageStatuses],
      ['conditionId', 'conditionName', ref.conditions],
      ['unitId', 'unitName', ref.units],
    ];
    for (const [idKey, nameKey, list] of examplePairs) {
      const nameValue = sheet.getRow(2).getCell(columnIndex(nameKey)).value;
      if (typeof nameValue === 'string') {
        const id = exampleIdOf(list, nameValue);
        if (id !== undefined)
          sheet.getRow(2).getCell(columnIndex(idKey)).value = id;
      }
    }
    const siteExample = sheet.getRow(2).getCell(columnIndex('siteName')).value;
    if (typeof siteExample === 'string') {
      const id = exampleIdOf(ref.sites, siteExample);
      if (id !== undefined)
        sheet.getRow(2).getCell(columnIndex('siteId')).value = id;
    }
    const pathExample = sheet.getRow(2).getCell(columnIndex('locationPath'))
      .value;
    if (typeof pathExample === 'string') {
      const entry = ref.locationEntries.find(
        (e) => normalizeText(e.path) === normalizeText(pathExample),
      );
      if (entry)
        sheet.getRow(2).getCell(columnIndex('locationId')).value = entry.id;
    }

    // Dropdown cho các cột danh mục trên MAX_TEMPLATE_ROWS dòng đầu.
    COLUMNS.forEach((col, index) => {
      if (!col.refColumn) return;
      const cellIndex = index + 1;
      const letter = columnLetter(REF_COLUMN_INDEX[col.refColumn]);
      const last = ref[refKey(col.refColumn)].length + 1;
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(cellIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'${REF_SHEET}'!$${letter}$2:$${letter}$${last}`],
        };
      }
    });

    // Dropdown LIÊN KẾT Dự án → Vị trí: chọn Dự án (tên hoặc ID) trước,
    // dropdown Vị trí cùng dòng tự lọc đúng cây của dự án đó.
    const cascade = addCascadeLists(workbook, ref.sites, ref.locations);
    if (cascade) {
      const siteIdLetter = columnLetter(columnIndex('siteId'));
      const siteNameLetter = columnLetter(columnIndex('siteName'));
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(columnIndex('siteName')).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [cascade.siteNameFormula],
        };
        sheet.getRow(row).getCell(columnIndex('locationPath')).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            cascade.locationFormula(siteIdLetter, siteNameLetter, row),
          ],
        };
      }
    }

    // Ô ngày: format dd/MM/yyyy để người dùng thấy trước khi nhập.
    COLUMNS.forEach((col, index) => {
      if (col.key !== 'usageDate' && col.key !== 'warrantyEnd') return;
      sheet.getColumn(index + 1).numFmt = 'dd/mm/yyyy';
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNS.length },
    };

    this.writeReferenceSheet(workbook, ref);
    this.writeGuideSheet(workbook, COLUMNS);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private writeReferenceSheet(
    workbook: ExcelJS.Workbook,
    ref: ReferenceData,
  ) {
    const sheet = workbook.addWorksheet(REF_SHEET);
    // Cặp ID + Tên để người dùng copy ID sang file nhập nhiều đợt.
    const columns: Array<{ header: string; values: Array<string | number> }> = [
      { header: 'ID danh mục', values: ref.categories.map((r) => r.id) },
      { header: 'Danh mục tài sản', values: ref.categories.map((r) => r.name) },
      { header: 'ID đơn vị', values: ref.units.map((r) => r.id) },
      { header: 'Đơn vị tính', values: ref.units.map((r) => r.name) },
      { header: 'ID trạng thái', values: ref.usageStatuses.map((r) => r.id) },
      {
        header: 'Trạng thái sử dụng',
        values: ref.usageStatuses.map((r) => r.name),
      },
      { header: 'ID tình trạng', values: ref.conditions.map((r) => r.id) },
      { header: 'Tình trạng', values: ref.conditions.map((r) => r.name) },
      { header: 'ID dự án', values: ref.sites.map((r) => r.id) },
      { header: 'Dự án', values: ref.sites.map((r) => r.name) },
      { header: 'ID vị trí', values: ref.locationEntries.map((r) => r.id) },
      {
        header: 'Vị trí (đường dẫn đầy đủ)',
        values: ref.locationEntries.map((r) => r.path),
      },
    ];

    sheet.columns = columns.map((col, index) => ({
      header: col.header,
      key: `c${index}`,
      width: index % 2 === 0 ? 14 : 34,
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
    columns: ColumnDef[],
  ) {
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
      'Cột bắt buộc: Tên tài sản. Các cột còn lại không bắt buộc.',
    ]);
    sheet.addRow([
      '',
      `Định dạng ngày: dd/MM/yyyy. Số lượng: nhập số, ví dụ 2. Mã tài sản tự sinh dạng ${CODE_PREFIX}0001.`,
    ]);

    for (const col of columns) {
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

  // ================= Xuất dữ liệu =================

  /**
   * Xuất danh sách tài sản đang lọc ra .xlsx. File xuất dùng nguyên thứ tự
   * cột của file nhập (kèm mã tài sản) nên nhập lại được ngay — phục vụ nhập
   * nhiều đợt: nhập đợt 1 → xuất → điền ID → nhập đợt 2.
   */
  async buildExport(filters: AssetFilters): Promise<Buffer> {
    const [rows, ref] = await Promise.all([
      this.assetsService.findAll(filters),
      this.loadReferenceData(),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Tài sản';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Tài sản', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const headers = [
      'Mã tài sản',
      ...COLUMNS.map((col) => col.header),
    ];
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: 18,
    }));
    const codeCol = sheet.getColumn(1);
    codeCol.width = 14;
    sheet.getColumn(columnIndex('name') + 1).width = 36;
    sheet.getColumn(columnIndex('locationPath') + 1).width = 44;
    sheet.getColumn(columnIndex('remarks') + 1).width = 30;
    sheet.getColumn(columnIndex('detail') + 1).width = 36;

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2174CD' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    headerRow.height = 28;

    const pathOf = (locationId: number | null | undefined): string => {
      if (locationId == null) return '';
      const names: string[] = [];
      let current = ref.locations.find((l) => l.id === locationId);
      let guard = 0;
      while (current && guard < 50) {
        names.unshift(current.name);
        current =
          current.parentId == null
            ? undefined
            : ref.locations.find((l) => l.id === current?.parentId);
        guard += 1;
      }
      return names.join(' > ');
    };

    for (const row of rows) {
      sheet.addRow({
        'Mã tài sản': row.code,
        [COLUMN_BY_KEY.name.header]: row.name,
        [COLUMN_BY_KEY.siteId.header]: row.location?.siteId ?? '',
        [COLUMN_BY_KEY.siteName.header]: row.location?.site?.name ?? '',
        [COLUMN_BY_KEY.locationId.header]: row.locationId ?? '',
        [COLUMN_BY_KEY.locationPath.header]: pathOf(row.locationId),
        [COLUMN_BY_KEY.categoryId.header]: row.categoryId ?? '',
        [COLUMN_BY_KEY.categoryName.header]: row.category?.name ?? '',
        [COLUMN_BY_KEY.usageStatusId.header]: row.usageStatusId ?? '',
        [COLUMN_BY_KEY.usageStatusName.header]: row.usageStatus?.name ?? '',
        [COLUMN_BY_KEY.conditionId.header]: row.conditionId ?? '',
        [COLUMN_BY_KEY.conditionName.header]: row.condition?.name ?? '',
        [COLUMN_BY_KEY.quantity.header]:
          row.quantity == null ? '' : Number(row.quantity),
        [COLUMN_BY_KEY.unitId.header]: row.unitId ?? '',
        [COLUMN_BY_KEY.unitName.header]: row.unit?.name ?? '',
        [COLUMN_BY_KEY.usageDate.header]: row.usageDate
          ? formatDateVi(new Date(row.usageDate))
          : '',
        [COLUMN_BY_KEY.warrantyEnd.header]: row.warrantyEnd
          ? formatDateVi(new Date(row.warrantyEnd))
          : '',
        [COLUMN_BY_KEY.supplier.header]: row.supplier ?? '',
        [COLUMN_BY_KEY.origin.header]: row.origin ?? '',
        [COLUMN_BY_KEY.model.header]: row.model ?? '',
        [COLUMN_BY_KEY.remarks.header]: row.remarks ?? '',
        [COLUMN_BY_KEY.detail.header]: row.detail ?? '',
      });
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
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
    const errors: AssetImportError[] = [];
    const parsedRows = this.parseRows(sheet, headerMap, lookup, errors);

    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập tài sản bắt đầu từ dòng 2.',
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không tài sản nào được nhập.`,
          errors,
        ),
      );
    }

    return this.persist(parsedRows);
  }

  /** Ghi tất cả tài sản trong 1 transaction, mã sinh liên tục TS-0001... */
  private async persist(
    rows: Array<{
      name: string;
      locationId: number | null;
      categoryId: number | null;
      usageStatusId: number | null;
      conditionId: number | null;
      unitId: number | null;
      quantity: number | null;
      usageDate: Date | null;
      warrantyEnd: Date | null;
      supplier: string | null;
      origin: string | null;
      model: string | null;
      remarks: string | null;
      detail: string | null;
    }>,
  ): Promise<AssetImportResult> {
    const created = await this.prisma.$transaction(async (tx) => {
      // Tránh 2 lần import chạy song song cùng đọc một giá trị max rồi sinh trùng mã.
      // pg_advisory_xact_lock trả void nên phải chọn thêm 1 cột int để Prisma đọc được.
      await tx.$queryRawUnsafe(
        `SELECT 1 FROM pg_advisory_xact_lock(${IMPORT_LOCK_ID})`,
      );

      const existing = await tx.asset.findMany({
        where: { code: { startsWith: CODE_PREFIX } },
        select: { code: true },
      });
      let max = 0;
      const pattern = new RegExp(`^${CODE_PREFIX}(\\d+)$`);
      for (const row of existing) {
        const matched = pattern.exec(row.code);
        if (matched) max = Math.max(max, Number(matched[1]));
      }

      const data = rows.map((row, index) => ({
        code: formatCode(max + index + 1),
        ...row,
      }));

      await tx.asset.createMany({ data });
      return data.map((item) => item.code);
    });

    return {
      total: rows.length,
      created: created.length,
      firstCode: created[0] ?? '',
      lastCode: created[created.length - 1] ?? '',
    };
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
      if (IMPORT_IGNORED_HEADERS.has(key)) return;
      if (!known.has(key)) unknown.push(text);
      else if (!map.has(key)) map.set(key, colNumber);
    });

    // Bỏ qua tiêu đề lạ nguyên tại: nếu im lặng, người dùng gõ sai chính tả
    // ("Ngày sử dụng" -> "Ngay su dung") sẽ mất sạch cột đó mà không ai biết.
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
    return {
      categories: this.indexByName(ref.categories),
      units: this.indexByName(ref.units),
      usageStatuses: this.indexByName(ref.usageStatuses),
      conditions: this.indexByName(ref.conditions),
      sites: this.indexByName(ref.sites),
      locationChildren: this.indexLocationChildren(ref.locations),
      categoriesById: this.indexById(ref.categories),
      unitsById: this.indexById(ref.units),
      usageStatusesById: this.indexById(ref.usageStatuses),
      conditionsById: this.indexById(ref.conditions),
      sitesById: this.indexById(ref.sites),
      locationsById: this.indexById(ref.locations),
    };
  }

  /** Map id -> bản ghi, dùng khi cột "ID ..." được điền (ưu tiên hơn tên). */
  private indexById<T extends { id: number }>(rows: T[]): Map<number, T> {
    const map = new Map<number, T>();
    for (const row of rows) map.set(row.id, row);
    return map;
  }

  /** key = `${siteId}:${parentId ?? 0}` -> danh sách vị trí con. */
  private indexLocationChildren(
    locations: LocationRef[],
  ): Map<string, LocationRef[]> {
    const map = new Map<string, LocationRef[]>();
    for (const item of locations) {
      const key = `${item.siteId}:${item.parentId ?? 0}`;
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return map;
  }

  private parseRows(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    lookup: ReferenceLookups,
    errors: AssetImportError[],
  ) {
    const column = {} as Record<ColumnKey, number | undefined>;
    for (const col of COLUMNS) {
      column[col.key] = headerMap.get(normalizeText(col.header));
    }

    const rows: Array<{
      name: string;
      locationId: number | null;
      categoryId: number | null;
      usageStatusId: number | null;
      conditionId: number | null;
      unitId: number | null;
      quantity: number | null;
      usageDate: Date | null;
      warrantyEnd: Date | null;
      supplier: string | null;
      origin: string | null;
      model: string | null;
      remarks: string | null;
      detail: string | null;
    }> = [];

    const totalRows = sheet.rowCount;
    let dataRowCount = 0;

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

      const rowErrors: AssetImportError[] = [];
      const push = (key: ColumnKey, message: string) =>
        rowErrors.push({
          row: rowNumber,
          column: COLUMN_BY_KEY[key].header,
          message,
        });

      const name = text('name');
      if (!name) push('name', 'Tên tài sản là bắt buộc.');

      const quantity = this.resolveQuantity(text('quantity'), (message) =>
        push('quantity', message),
      );
      const usageDate = this.resolveDate(cell('usageDate'), (message) =>
        push('usageDate', message),
      );
      const warrantyEnd = this.resolveDate(cell('warrantyEnd'), (message) =>
        push('warrantyEnd', message),
      );

      const categoryId = this.resolveDroplist(
        text('categoryId'),
        text('categoryName'),
        'categoryId',
        'categoryName',
        lookup.categoriesById,
        lookup.categories,
        'Danh mục tài sản',
        push,
      );
      const usageStatusId = this.resolveDroplist(
        text('usageStatusId'),
        text('usageStatusName'),
        'usageStatusId',
        'usageStatusName',
        lookup.usageStatusesById,
        lookup.usageStatuses,
        'Trạng thái sử dụng',
        push,
      );
      const conditionId = this.resolveDroplist(
        text('conditionId'),
        text('conditionName'),
        'conditionId',
        'conditionName',
        lookup.conditionsById,
        lookup.conditions,
        'Tình trạng',
        push,
      );
      const unitId = this.resolveDroplist(
        text('unitId'),
        text('unitName'),
        'unitId',
        'unitName',
        lookup.unitsById,
        lookup.units,
        'Đơn vị tính',
        push,
      );

      const siteId = this.resolveSiteId(
        text('siteId'),
        text('siteName'),
        lookup,
        push,
      );
      const locationId = this.resolveLocation(
        text('locationId'),
        siteId,
        text('locationPath'),
        lookup,
        push,
      );

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      rows.push({
        name,
        locationId,
        categoryId,
        usageStatusId,
        conditionId,
        unitId,
        quantity,
        usageDate,
        warrantyEnd,
        supplier: orNull(text('supplier')),
        origin: orNull(text('origin')),
        model: orNull(text('model')),
        remarks: orNull(text('remarks')),
        detail: orNull(text('detail')),
      });
    }

    return rows;
  }

  /**
   * Cột ID được ưu tiên: có số là lấy đúng bản ghi đó, không cần khớp tên.
   * Cột ID để trống mới quay sang khớp theo tên (không phân biệt hoa/dấu).
   * Cả 2 ô cùng điền mà lệch nhau thì báo lỗi để tránh ghi nhầm.
   */
  private resolveDroplist(
    idText: string,
    nameText: string,
    idKey: ColumnKey,
    nameKey: ColumnKey,
    byId: Map<number, DroplistRef>,
    byName: Map<string, number[]>,
    label: string,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (idText) {
      const parsed = parseIdValue(idText);
      if (parsed.error) {
        push(idKey, parsed.error);
        return null;
      }
      const id = parsed.value as number;
      const found = byId.get(id);
      if (!found) {
        push(idKey, `${COLUMN_BY_KEY[idKey].header} #${id} không tồn tại.`);
        return null;
      }
      if (nameText && normalizeText(found.name) !== normalizeText(nameText)) {
        push(
          nameKey,
          `Tên "${nameText}" không khớp ${label} của ${COLUMN_BY_KEY[idKey].header} #${id} ("${found.name}").`,
        );
        return null;
      }
      return id;
    }
    if (!nameText) return null;
    const ids = byName.get(normalizeText(nameText));
    if (!ids) {
      const known = byName.size;
      push(
        nameKey,
        known > 0
          ? `"${nameText}" không khớp ${label} nào. Xem sheet "Danh mục" để chọn đúng tên hoặc điền ID.`
          : `Chưa có ${label} nào trong hệ thống.`,
      );
      return null;
    }
    if (ids.length > 1) {
      push(
        nameKey,
        `"${nameText}" khớp nhiều ${label} — điền ${COLUMN_BY_KEY[idKey].header} để xác định đúng bản ghi.`,
      );
      return null;
    }
    return ids[0];
  }

  private resolveDate(
    cell: Cell | undefined,
    push: (message: string) => void,
  ): Date | null {
    if (!cell) return null;
    const parsed = parseDateValue(cell.value);
    if (parsed.error) {
      push(parsed.error);
      return null;
    }
    return parsed.date ?? null;
  }

  private resolveQuantity(
    value: string,
    push: (message: string) => void,
  ): number | null {
    if (!value) return null;
    const parsed = parseQuantityValue(value);
    if (parsed.error) {
      push(parsed.error);
      return null;
    }
    return parsed.quantity ?? null;
  }

  /** Dự án: ưu tiên "ID dự án", trống mới khớp "Dự án" theo tên. */
  private resolveSiteId(
    idText: string,
    nameText: string,
    lookup: ReferenceLookups,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (idText) {
      const parsed = parseIdValue(idText);
      if (parsed.error) {
        push('siteId', parsed.error);
        return null;
      }
      const id = parsed.value as number;
      const found = lookup.sitesById.get(id);
      if (!found) {
        push('siteId', `ID dự án #${id} không tồn tại.`);
        return null;
      }
      if (nameText && normalizeText(found.name) !== normalizeText(nameText)) {
        push(
          'siteName',
          `Tên "${nameText}" không khớp dự án của ID dự án #${id} ("${found.name}").`,
        );
        return null;
      }
      return id;
    }
    if (!nameText) return null;
    const ids = lookup.sites.get(normalizeText(nameText));
    if (!ids) {
      push(
        'siteName',
        `"${nameText}" không khớp dự án nào. Xem sheet "Danh mục" hoặc điền ID dự án.`,
      );
      return null;
    }
    if (ids.length > 1) {
      push('siteName', `"${nameText}" khớp nhiều dự án — điền ID dự án để xác định.`);
      return null;
    }
    return ids[0];
  }

  /**
   * Vị trí: ưu tiên "ID vị trí". Trống mới dùng Dự án + đường dẫn "Vị trí".
   * Có ID mà Dự án đi kèm lệch site thì vẫn báo lỗi để bắt lỗi copy-paste.
   */
  private resolveLocation(
    locationIdText: string,
    siteId: number | null,
    locationPath: string,
    lookup: ReferenceLookups,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (locationIdText) {
      const parsed = parseIdValue(locationIdText);
      if (parsed.error) {
        push('locationId', parsed.error);
        return null;
      }
      const id = parsed.value as number;
      const found = lookup.locationsById.get(id);
      if (!found) {
        push('locationId', `ID vị trí #${id} không tồn tại.`);
        return null;
      }
      if (siteId !== null && found.siteId !== siteId) {
        push(
          'locationId',
          `ID vị trí #${id} không thuộc dự án đã chọn. Bỏ trống Dự án hoặc sửa lại ID.`,
        );
        return null;
      }
      return id;
    }

    if (siteId === null) {
      if (locationPath) {
        push(
          'siteName',
          `Phải nhập "${COLUMN_BY_KEY.siteId.header}" hoặc "${COLUMN_BY_KEY.siteName.header}" khi đã điền "${COLUMN_BY_KEY.locationPath.header}".`,
        );
      }
      return null;
    }

    if (!locationPath) return null;

    const segments = locationPath
      .split(/\s*(?:>|\/)\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length === 0) return null;

    // Sheet 'Danh mục' liệt kê đường dẫn có kèm tên dự án ở đầu
    // ("Tòa A > Tầng 1") để phân biệt trùng tên giữa 2 dự án. Bỏ đoạn đầu
    // nếu trùng tên dự án của vị trí đang tra.
    const siteName = lookup.sitesById.get(siteId)?.name ?? '';
    if (
      segments.length > 1 &&
      siteName &&
      normalizeText(segments[0]) === normalizeText(siteName)
    ) {
      segments.shift();
    }

    let parentId: number | null = null;
    let currentId: number | null = null;
    for (const segment of segments) {
      const wanted = normalizeText(segment);
      const siblings: LocationRef[] =
        lookup.locationChildren.get(`${siteId}:${parentId ?? 0}`) ?? [];
      const candidates = siblings.filter(
        (item) => normalizeText(item.name) === wanted,
      );

      if (candidates.length === 0) {
        push(
          'locationPath',
          `Không tìm thấy "${segment}" trong dự án này${
            parentId ? ' ở cấp vị trí trên' : ''
          }.`,
        );
        return null;
      }
      if (candidates.length > 1) {
        const ids = candidates.map((item) => `#${item.id}`);
        push(
          'locationPath',
          `"${segment}" trùng tên — điền ID vị trí (${ids.join(', ')}) để xác định đúng. Xem sheet "Danh mục".`,
        );
        return null;
      }
      currentId = candidates[0].id;
      parentId = currentId;
    }
    return currentId;
  }
}

function orNull(value: string): string | null {
  return value ? value : null;
}

function formatCode(sequence: number): string {
  return `${CODE_PREFIX}${String(sequence).padStart(CODE_DIGITS, '0')}`;
}

/** Vị trí cột (1-based) trong sheet dữ liệu theo key — tránh ghi số cứng. */
function columnIndex(key: ColumnKey): number {
  return COLUMNS.findIndex((col) => col.key === key) + 1;
}

function refKey(key: RefColumn): keyof ReferenceData {
  switch (key) {
    case 'category':
      return 'categories';
    case 'unit':
      return 'units';
    case 'usageStatus':
      return 'usageStatuses';
    case 'condition':
      return 'conditions';
  }
}
