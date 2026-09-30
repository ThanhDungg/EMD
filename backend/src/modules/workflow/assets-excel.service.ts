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
  parseQuantityValue,
  splitNameId,
  splitPath,
  withIdSuffix,
} from '../../common/excel.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AssetFilters } from './assets.service.js';
import { AssetsService } from './assets.service.js';

// Nhập tài sản bằng file Excel theo khuôn mẫu do backend sinh ra.
//
// Nguyên tắc:
// - Mã tài sản KHÔNG có trong file, do hệ thống tự sinh (TS-0001, TS-0002...)
//   để không bao giờ trùng `assets.code` (unique, kể cả bản ghi đã xoá mềm).
// - Không có cột ID rời. Các cột tham chiếu nhập theo dạng "Tên (id)" — ví dụ
//   "Phòng kế toán (12)"; BE bóc id trong ngoặc để lấy đúng bản ghi.
// - Chỉ gõ tên (không có "(id)") vẫn được: khớp không phân biệt hoa thường
//   và dấu tiếng Việt. Sai tên hoặc trùng tên thì báo đúng dòng/cột và KHÔNG
//   gì cũng được ghi.
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
  | 'siteName'
  | 'locationPath'
  | 'categoryName'
  | 'usageStatusName'
  | 'conditionName'
  | 'quantity'
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
  // Cột tham chiếu chỉ nhập text dạng "Tên (id)" — ví dụ "Phòng kế toán (12)".
  // Có "(id)" thì lấy đúng bản ghi đó; không có thì khớp theo tên.
  {
    key: 'siteName',
    header: 'Dự án',
    width: 26,
    example: 'Tòa A - Khu văn phòng (1)',
  },
  {
    key: 'locationPath',
    header: 'Vị trí',
    width: 44,
    example: 'Tầng 1 > Hành chính > Phòng kế toán (12)',
  },
  {
    key: 'categoryName',
    header: 'Danh mục tài sản',
    width: 28,
    refColumn: 'category',
    example: 'Điều hoà / TĐH (3)',
  },
  {
    key: 'usageStatusName',
    header: 'Trạng thái sử dụng',
    width: 20,
    refColumn: 'usageStatus',
    example: 'Đang sử dụng (1)',
  },
  {
    key: 'conditionName',
    header: 'Tình trạng',
    width: 22,
    refColumn: 'condition',
    example: 'Tốt (1)',
  },
  { key: 'quantity', header: 'Số lượng', width: 12, example: '2' },
  {
    key: 'unitName',
    header: 'Đơn vị tính',
    width: 14,
    refColumn: 'unit',
    example: 'Cái (1)',
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

/** Danh sách gợi ý nằm ở cột nào của sheet 'Danh mục' (cột TÊN kèm id).
 *  Sheet Danh mục xếp mỗi danh mục 1 cột nên cột tên nằm ở A/B/C/D. */
const REF_COLUMN_INDEX: Record<RefColumn, number> = {
  category: 1,
  unit: 2,
  usageStatus: 3,
  condition: 4,
};

/** Tra cột theo key thay vì chỉ số mảng — tránh lệch khi thêm/bớt cột. */
const COLUMN_BY_KEY = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col]),
) as Record<ColumnKey, ColumnDef>;

/**
 * Cột chỉ xuất hiện trong file XUẤT (không có trong file mẫu): chấp nhận và
 * bỏ qua khi nhập — mã tài sản luôn tự sinh nên không bao giờ lấy từ file.
 * Các cột "ID ..." của file xuất bản cũ cũng được bỏ qua để file cũ vẫn
 * nhập được (khớp theo tên, hoặc theo "Tên (id)" nếu tên đã kèm id).
 */
const IMPORT_IGNORED_HEADERS = new Set(
  [
    'Mã tài sản',
    'ID dự án',
    'ID vị trí',
    'ID danh mục TS',
    'ID trạng thái',
    'ID tình trạng',
    'ID đơn vị tính',
  ].map(normalizeText),
);

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
    'Các cột tham chiếu (Dự án, Vị trí, Danh mục...) nhập theo dạng "Tên (id)" — ví dụ "Phòng kế toán (12)". Phần (id) trong ngoặc giúp lấy đúng bản ghi, tránh nhầm khi trùng tên.',
  ],
  [
    '6',
    'Chỉ gõ tên (không có "(id)") vẫn được: khớp không phân biệt hoa thường và dấu tiếng Việt. Nếu tên bị trùng, hệ thống báo lỗi và gợi ý (id) — xem sheet "Danh mục" để copy đúng chuỗi "Tên (id)". Chọn từ dropdown để tránh sai.',
  ],
  [
    '7',
    'Muốn nhập nhiều đợt: nhập đợt 1, bấm "Xuất Excel" để lấy file đã có sẵn "Tên (id)", dùng tiếp cho đợt 2.',
  ],
  [
    '8',
    'Ngày nhập theo dd/MM/yyyy (ví dụ 01/03/2024). Cột số lượng nhập số, không có dấu phẩy phân cách nghìn.',
  ],
  [
    '9',
    'Cột "Vị trí" ghi đường dẫn từ dự án tới vị trí, phân tách bằng dấu ">" hoặc "/", ví dụ "Tầng 1 > Phòng kế toán (12)". Có "(id)" thì không cần điền cột "Dự án".',
  ],
  [
    '10',
    'Dropdown LIÊN KẾT: chọn "Dự án" trước (danh sách hiện dạng "Tên (id)"), dropdown "Vị trí" cùng dòng tự lọc đúng cây của dự án đó. Chưa chọn Dự án mà mở dropdown Vị trí thì Excel báo lỗi nguồn — cứ chọn Dự án trước là hết.',
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
  // Tra cứu theo ID — hậu tố "(id)" trong ô được ưu tiên hơn tên.
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
    // dữ liệu thật (dự án + đường dẫn vị trí lấy từ danh mục hiện có) theo
    // dạng "Tên (id)".
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
      sheet.getRow(3).getCell(columnIndex('siteName')).value = withIdSuffix(
        firstSite.name,
        firstSite.id,
      );
    }
    if (firstEntry) {
      sheet.getRow(3).getCell(columnIndex('locationPath')).value = withIdSuffix(
        firstEntry.path,
        firstEntry.id,
      );
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

    // Dropdown LIÊN KẾT Dự án → Vị trí: chọn Dự án trước (danh sách hiện
    // dạng "Tên (id)"), dropdown Vị trí cùng dòng tự lọc đúng cây của dự án đó.
    const cascade = addCascadeLists(workbook, ref.sites, ref.locations, {
      siteLabel: (site) => withIdSuffix(site.name, site.id),
    });
    if (cascade) {
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
          formulae: [cascade.locationFormulaByName(siteNameLetter, row)],
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
    // Mỗi giá trị đã ở dạng "Tên (id)" để copy nguyên sang file nhập.
    const columns: Array<{
      header: string;
      values: string[];
      width: number;
    }> = [
      {
        header: 'Danh mục tài sản',
        values: ref.categories.map((r) => withIdSuffix(r.name, r.id)),
        width: 34,
      },
      {
        header: 'Đơn vị tính',
        values: ref.units.map((r) => withIdSuffix(r.name, r.id)),
        width: 24,
      },
      {
        header: 'Trạng thái sử dụng',
        values: ref.usageStatuses.map((r) => withIdSuffix(r.name, r.id)),
        width: 26,
      },
      {
        header: 'Tình trạng',
        values: ref.conditions.map((r) => withIdSuffix(r.name, r.id)),
        width: 24,
      },
      {
        header: 'Dự án',
        values: ref.sites.map((r) => withIdSuffix(r.name, r.id)),
        width: 34,
      },
      {
        header: 'Vị trí (đường dẫn đầy đủ)',
        values: ref.locationEntries.map((r) => withIdSuffix(r.path, r.id)),
        width: 46,
      },
    ];

    sheet.columns = columns.map((col, index) => ({
      header: col.header,
      key: `c${index}`,
      width: col.width,
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
   * cột của file nhập (kèm mã tài sản) nên nhập lại được ngay — các cột tham
   * chiếu đã ở dạng "Tên (id)". Phục vụ nhập nhiều đợt: nhập đợt 1 → xuất →
   * dùng tiếp file xuất cho đợt 2.
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
        [COLUMN_BY_KEY.siteName.header]: row.location?.site
          ? withIdSuffix(row.location.site.name, row.location.siteId)
          : '',
        [COLUMN_BY_KEY.locationPath.header]:
          row.locationId == null
            ? ''
            : withIdSuffix(pathOf(row.locationId), row.locationId),
        [COLUMN_BY_KEY.categoryName.header]: named(
          row.category?.name,
          row.categoryId,
        ),
        [COLUMN_BY_KEY.usageStatusName.header]: named(
          row.usageStatus?.name,
          row.usageStatusId,
        ),
        [COLUMN_BY_KEY.conditionName.header]: named(
          row.condition?.name,
          row.conditionId,
        ),
        [COLUMN_BY_KEY.quantity.header]:
          row.quantity == null ? '' : Number(row.quantity),
        [COLUMN_BY_KEY.unitName.header]: named(row.unit?.name, row.unitId),
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
        text('categoryName'),
        'categoryName',
        lookup.categoriesById,
        lookup.categories,
        'Danh mục tài sản',
        push,
      );
      const usageStatusId = this.resolveDroplist(
        text('usageStatusName'),
        'usageStatusName',
        lookup.usageStatusesById,
        lookup.usageStatuses,
        'Trạng thái sử dụng',
        push,
      );
      const conditionId = this.resolveDroplist(
        text('conditionName'),
        'conditionName',
        lookup.conditionsById,
        lookup.conditions,
        'Tình trạng',
        push,
      );
      const unitId = this.resolveDroplist(
        text('unitName'),
        'unitName',
        lookup.unitsById,
        lookup.units,
        'Đơn vị tính',
        push,
      );

      const siteId = this.resolveSite(text('siteName'), lookup, push);
      const locationId = this.resolveLocation(
        text('locationPath'),
        siteId,
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
   * Ô tham chiếu dạng "Tên (id)": có "(id)" thì lấy đúng bản ghi đó — BE chỉ
   * dựa vào id, phần tên chỉ để người đọc hiểu. Không có "(id)" thì khớp
   * theo tên (không phân biệt hoa/dấu); trùng tên phải thêm "(id)".
   */
  private resolveDroplist(
    rawText: string,
    nameKey: ColumnKey,
    byId: Map<number, DroplistRef>,
    byName: Map<string, number[]>,
    label: string,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!rawText) return null;
    const { name, id } = splitNameId(rawText);
    if (id !== null) {
      if (!byId.has(id)) {
        push(
          nameKey,
          `"${rawText}" có (id) #${id} không tồn tại. Xem sheet "Danh mục" để copy đúng.`,
        );
        return null;
      }
      return id;
    }
    const ids = byName.get(normalizeText(name));
    if (!ids) {
      const known = byName.size;
      push(
        nameKey,
        known > 0
          ? `"${name}" không khớp ${label} nào. Xem sheet "Danh mục" để chọn đúng tên.`
          : `Chưa có ${label} nào trong hệ thống.`,
      );
      return null;
    }
    if (ids.length > 1) {
      push(
        nameKey,
        `"${name}" khớp nhiều ${label} — thêm (id) vào sau tên, ví dụ "${name} (${ids[0]})". Xem sheet "Danh mục".`,
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

  /** Dự án dạng "Tên (id)": có "(id)" thì lấy đúng dự án đó — BE chỉ dựa vào id. */
  private resolveSite(
    rawText: string,
    lookup: ReferenceLookups,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!rawText) return null;
    const { name, id } = splitNameId(rawText);
    if (id !== null) {
      if (!lookup.sitesById.has(id)) {
        push(
          'siteName',
          `"${rawText}" có (id) #${id} không tồn tại. Xem sheet "Danh mục" để copy đúng.`,
        );
        return null;
      }
      return id;
    }
    const ids = lookup.sites.get(normalizeText(name));
    if (!ids) {
      push(
        'siteName',
        `"${name}" không khớp dự án nào. Xem sheet "Danh mục" để chọn đúng.`,
      );
      return null;
    }
    if (ids.length > 1) {
      push(
        'siteName',
        `"${name}" khớp nhiều dự án — thêm (id) vào sau tên, ví dụ "${name} (${ids[0]})".`,
      );
      return null;
    }
    return ids[0];
  }

  /**
   * Vị trí dạng "đường dẫn (id)": có "(id)" thì lấy đúng vị trí đó — BE chỉ
   * dựa vào id (kèm kiểm tra thuộc đúng dự án). Không có "(id)" thì dùng
   * Dự án + đường dẫn "Vị trí" như cũ.
   */
  private resolveLocation(
    rawText: string,
    siteId: number | null,
    lookup: ReferenceLookups,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!rawText) return null;
    const { id } = splitNameId(rawText);
    if (id !== null) {
      const found = lookup.locationsById.get(id);
      if (!found) {
        push(
          'locationPath',
          `"${rawText}" có (id) #${id} không tồn tại. Xem sheet "Danh mục" để copy đúng.`,
        );
        return null;
      }
      if (siteId !== null && found.siteId !== siteId) {
        push(
          'locationPath',
          `Vị trí (#${id}) không thuộc dự án đã chọn. Bỏ trống Dự án hoặc sửa lại.`,
        );
        return null;
      }
      return id;
    }

    if (siteId === null) {
      push(
        'siteName',
        `Phải nhập "${COLUMN_BY_KEY.siteName.header}" khi đã điền "${COLUMN_BY_KEY.locationPath.header}".`,
      );
      return null;
    }

    const siteName = lookup.sitesById.get(siteId)?.name ?? '';
    const segments = pathSegments(rawText, siteName);
    if (segments.length === 0) return null;

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
        push(
          'locationPath',
          `"${segment}" trùng tên — copy nguyên chuỗi "đường dẫn (id)" từ sheet "Danh mục".`,
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

/** "Tên" + id -> "Tên (id)". Chưa có tên thì để trống. */
function named(
  name: string | null | undefined,
  id: number | null | undefined,
): string {
  if (!name) return '';
  return withIdSuffix(name, id ?? null);
}

/**
 * Tách đường dẫn "Tòa A > Tầng 1 > Phòng A" thành các cấp. Bỏ đoạn đầu nếu
 * trùng tên dự án (sheet 'Danh mục' liệt kê đường dẫn kèm tên dự án ở đầu
 * để phân biệt trùng tên giữa 2 dự án).
 */
function pathSegments(path: string, siteName: string): string[] {
  const segments = splitPath(path);
  if (
    segments.length > 1 &&
    siteName &&
    normalizeText(segments[0]) === normalizeText(siteName)
  ) {
    segments.shift();
  }
  return segments;
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
