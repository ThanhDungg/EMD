import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Cell, Worksheet } from 'exceljs';
import {
  addCascadeLists,
  buildImportError,
  cellText,
  columnLetter,
  normalizeText,
  splitNameId,
  splitPath,
  withIdSuffix,
} from '../../common/excel.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const MAX_IMPORT_ROWS = 2000;
const MAX_TEMPLATE_ROWS = 500;

const DATA_SHEET = 'Vị trí';
const REF_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

type ColumnKey =
  | 'siteName'
  | 'parentPath'
  | 'name'
  | 'code';

interface ColumnDef {
  key: ColumnKey;
  header: string;
  width: number;
  required?: boolean;
  example?: string;
}

/**
 * Cây vị trí: mỗi dự án có nhiều vị trí, vị trí có thể lồng nhau
 * (tầng > phòng > vị trí nhỏ). Cột "Vị trí cha" nhận đường dẫn đầy đủ
 * tính từ cấp 1 của dự án, ví dụ "Tầng 1 > Hành chính".
 * Không có cột ID rời: cột tham chiếu nhập theo dạng "Tên (id)" — ví dụ
 * "Tòa A (1)", "Tầng 1 > Hành chính (4)". BE bóc id trong ngoặc để lấy
 * đúng bản ghi; chỉ gõ tên vẫn được (khớp không phân biệt hoa/dấu).
 */
const COLUMNS: ColumnDef[] = [
  {
    key: 'siteName',
    header: 'Dự án',
    width: 26,
    required: true,
    example: 'Tòa A - Khu văn phòng (1)',
  },
  {
    key: 'parentPath',
    header: 'Vị trí cha',
    width: 40,
    example: 'Tầng 1 > Hành chính (4)',
  },
  {
    key: 'name',
    header: 'Tên vị trí',
    width: 34,
    required: true,
    example: 'Phòng kế toán',
  },
  { key: 'code', header: 'Mã vị trí', width: 20, example: 'A-T1-HC-PKT' },
];

const GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Vị trí". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng là 1 vị trí. Dòng trống hoàn toàn sẽ bị bỏ qua. XOÁ 2 dòng mẫu (dòng 2 và 3) trước khi nhập dữ liệu thật.',
  ],
  ['3', 'Cột "Dự án" và "Tên vị trí" là bắt buộc. Các cột còn lại để trống được.'],
  [
    '4',
    'Các cột tham chiếu (Dự án, Vị trí cha) nhập theo dạng "Tên (id)" — ví dụ "Tòa A (1)", "Tầng 1 > Hành chính (4)". Phần (id) trong ngoặc giúp lấy đúng bản ghi, tránh nhầm khi trùng tên.',
  ],
  [
    '5',
    'Chỉ gõ tên (không có "(id)") vẫn được: khớp không phân biệt hoa thường và dấu tiếng Việt. Nếu tên bị trùng, hệ thống báo lỗi và gợi ý (id) — xem sheet "Danh mục" để copy đúng chuỗi "Tên (id)".',
  ],
  [
    '6',
    'Cột "Vị trí cha" ghi đường dẫn từ vị trí cấp 1, phân tách bằng dấu ">" hoặc "/". Để trống nghĩa là vị trí cấp 1. Có "(id)" ở cuối thì không cần điền cột "Dự án" vẫn được.',
  ],
  [
    '7',
    'Vị trí cha phải nằm ở dòng TRÊN trong file, hoặc đã tồn tại sẵn trong hệ thống. Nếu không, dòng đó bị báo lỗi.',
  ],
  [
    '8',
    'Muốn nhập nhiều đợt: nhập vị trí cha đợt 1, bấm "Xuất Excel" để lấy file đã có sẵn "Tên (id)", dùng tiếp cho đợt 2.',
  ],
  [
    '9',
    'Nếu dự án + vị trí cha + tên đã tồn tại, hệ thống CẬP NHẬT bản ghi cũ thay vì tạo mới. Nhập lại file nhiều lần được. Muốn đổi tên hoặc đổi cha thì sửa trực tiếp trên giao diện.',
  ],
  [
    '10',
    'Dropdown LIÊN KẾT: chọn "Dự án" trước (danh sách hiện dạng "Tên (id)"), dropdown "Vị trí cha" cùng dòng tự lọc đúng cây của dự án đó. Chưa chọn Dự án mà mở dropdown Vị trí cha thì Excel báo lỗi nguồn — cứ chọn Dự án trước là hết.',
  ],
  [
    '11',
    'Cột "Mã vị trí" là duy nhất, để trống nếu chưa có mã. Hai dòng không được dùng chung một mã.',
  ],
  [
    '12',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Có dòng nào sai thì không vị trí nào được tạo hay sửa.',
  ],
];

/**
 * Cột chỉ xuất hiện trong file XUẤT bản cũ: chấp nhận và bỏ qua khi nhập
 * để file cũ vẫn nhập được (khớp theo tên, hoặc theo "Tên (id)").
 */
const IMPORT_IGNORED_HEADERS = new Set(
  ['ID dự án', 'ID vị trí', 'ID vị trí cha'].map(normalizeText),
);

export interface LocationImportError {
  row: number;
  column: string;
  message: string;
}

export interface LocationImportResult {
  total: number;
  created: number;
  updated: number;
}

interface SiteRef {
  id: number;
  name: string;
}

interface LocationRef {
  id: number;
  code: string | null;
  name: string;
  siteId: number;
  parentId: number | null;
  sortOrder: number;
}

interface ReferenceData {
  sites: SiteRef[];
  locations: LocationRef[];
  /** ID + đường dẫn đầy đủ (không kèm tên dự án) của từng vị trí. */
  locationEntries: Array<{ id: number; path: string; siteId: number }>;
}

interface Lookups {
  sites: Map<string, SiteRef[]>;
  sitesById: Map<number, SiteRef>;
  /** key = `${siteId}:${parentId ?? 0}` -> vị trí con. */
  children: Map<string, LocationRef[]>;
  /** key = `${siteId}:${parentId ?? 0}:${tên chuẩn hoá}` -> vị trí đã có. */
  byKey: Map<string, LocationRef>;
  locationsById: Map<number, LocationRef>;
  /** Mã đã dùng -> id, để chặn trùng mã. */
  codeOwner: Map<string, number>;
}

interface ParsedRow {
  row: number;
  siteId: number;
  /** Id cha trong DB, hoặc id giả âm nếu cha được tạo ở dòng trên của file. */
  parentId: number | null;
  /** Id giá âm của chính dòng này (nếu được dòng sau làm cha). */
  syntheticId: number | null;
  /** Id bản ghi đã tồn tại khớp (dự án, cha, tên) — nhập lại sẽ cập nhật. */
  existingId: number | null;
  name: string;
  code: string | null;
}

@Injectable()
export class SiteLocationsExcelService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= Danh mục tham chiếu =================

  private async loadReferenceData(): Promise<ReferenceData> {
    const [sites, locations] = await Promise.all([
      this.prisma.site.findMany({
        where: { isDeleted: false },
        orderBy: { name: 'asc' },
      }),
      this.prisma.siteLocation.findMany({ where: { isDeleted: false } }),
    ]);
    return {
      sites,
      locations,
      locationEntries: this.buildLocationEntries(sites, locations),
    };
  }

  /** ID + "Tầng 1 > Hành chính > Phòng kế toán" — không kèm tên dự án. */
  private buildLocationEntries(
    sites: SiteRef[],
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

  private buildLookups(ref: ReferenceData): Lookups {
    const sites = new Map<string, SiteRef[]>();
    for (const site of ref.sites) {
      const key = normalizeText(site.name);
      const list = sites.get(key);
      if (list) list.push(site);
      else sites.set(key, [site]);
    }

    const children = new Map<string, LocationRef[]>();
    const byKey = new Map<string, LocationRef>();
    const codeOwner = new Map<string, number>();
    const locationsById = new Map<number, LocationRef>();
    for (const item of ref.locations) {
      const childKey = `${item.siteId}:${item.parentId ?? 0}`;
      const list = children.get(childKey);
      if (list) list.push(item);
      else children.set(childKey, [item]);
      byKey.set(this.locationKey(item.siteId, item.parentId, item.name), item);
      locationsById.set(item.id, item);
      if (item.code) codeOwner.set(item.code, item.id);
    }

    const sitesById = new Map<number, SiteRef>();
    for (const site of ref.sites) sitesById.set(site.id, site);

    return { sites, sitesById, children, byKey, locationsById, codeOwner };
  }

  private locationKey(
    siteId: number,
    parentId: number | null,
    name: string,
  ): string {
    return `${siteId}:${parentId ?? 0}:${normalizeText(name)}`;
  }

  // ================= File mẫu =================

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
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    headerRow.height = 28;

    // 2 dòng minh hoạ. Cố tình dùng tên KHÔNG tồn tại trong hệ thống để
    // ai import nguyên file mẫu cũng chỉ tạo thêm dữ liệu, không ghi đè
    // vị trí đang có. Hướng dẫn trong sheet 'Hướng dẫn' yêu cầu xoá 2 dòng này.
    const colIndex = (key: ColumnKey): number =>
      COLUMNS.findIndex((col) => col.key === key) + 1;
    COLUMNS.forEach((col, index) => {
      if (col.example) sheet.getRow(2).getCell(index + 1).value = col.example;
    });
    sheet.getRow(2).getCell(colIndex('name')).value =
      'Phòng kế toán (dòng mẫu)';
    sheet.getRow(2).getCell(colIndex('code')).value = 'MAU-T1-PKT';

    // Ưu tiên ví dụ có cha thật (đường dẫn ≥3 đoạn) để minh hoạ rõ cột cha.
    const sampleEntry =
      ref.locationEntries.find(
        (e) => splitPath(e.path).length >= 3,
      ) ?? ref.locationEntries[0];
    if (sampleEntry) {
      const site = ref.sites.find((s) => s.id === sampleEntry.siteId);
      // Đường dẫn trong entries có kèm tên dự án ở đầu — bỏ đi vì cột Dự án
      // riêng đã chỉ rõ site, đồng thời bỏ đoạn cuối (lá) để còn đường dẫn cha.
      const segments = splitPath(sampleEntry.path).slice(1, -1);
      const parent = ref.locations.find((l) => l.id === sampleEntry.id);
      sheet.getRow(3).getCell(colIndex('siteName')).value = site
        ? withIdSuffix(site.name, site.id)
        : '';
      sheet.getRow(3).getCell(colIndex('parentPath')).value = withIdSuffix(
        segments.join(' > '),
        parent?.parentId ?? null,
      );
      sheet.getRow(3).getCell(colIndex('name')).value =
        'Vị trí mới (dòng mẫu)';
      sheet.getRow(3).getCell(colIndex('code')).value = 'MAU-MOI-01';
    }

    // Dropdown dự án (cột tên A, dạng "Tên (id)") cho MAX_TEMPLATE_ROWS dòng đầu.
    const siteLast = ref.sites.length + 1;
    for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
      sheet.getRow(row).getCell(colIndex('siteName')).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [`'${REF_SHEET}'!$A$2:$A$${siteLast}`],
      };
    }

    // Dropdown LIÊN KẾT: chọn Dự án trước, dropdown "Vị trí cha" cùng dòng
    // tự lọc đúng cây của dự án đó.
    const cascade = addCascadeLists(workbook, ref.sites, ref.locations, {
      siteLabel: (site) => withIdSuffix(site.name, site.id),
    });
    if (cascade) {
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(colIndex('parentPath')).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            cascade.locationFormulaByName(
              columnLetter(colIndex('siteName')),
              row,
            ),
          ],
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
    // Mỗi giá trị đã ở dạng "Tên (id)" để copy nguyên sang file nhập.
    const columns: Array<{ header: string; values: string[]; width: number }> =
      [
        {
          header: 'Dự án',
          values: ref.sites.map((s) => withIdSuffix(s.name, s.id)),
          width: 34,
        },
        {
          header: 'Vị trí (đường dẫn đầy đủ)',
          values: ref.locationEntries.map((e) => withIdSuffix(e.path, e.id)),
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
      const target = sheet.getRow(row + 2);
      columns.forEach((col, index) => {
        const value = col.values[row];
        if (value !== undefined) target.getCell(index + 1).value = value;
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
      'Cột bắt buộc: Dự án, Tên vị trí. Cột nào không bắt buộc thì để trống.',
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

  // ================= Xuất dữ liệu =================

  /**
   * Xuất cây vị trí ra .xlsx 1 sheet (lọc theo dự án nếu có). File xuất dùng
   * nguyên thứ tự cột của file nhập nên nhập lại được ngay — các cột tham
   * chiếu đã ở dạng "Tên (id)". Phục vụ nhập nhiều đợt: nhập vị trí cha
   * đợt 1 → xuất → dùng tiếp file xuất cho đợt 2.
   */
  async buildExport(siteId?: number): Promise<Buffer> {
    const ref = await this.loadReferenceData();
    const entries = ref.locationEntries.filter(
      (e) => siteId === undefined || e.siteId === siteId,
    );
    const byId = new Map(ref.locations.map((l) => [l.id, l]));
    const siteOf = new Map(ref.sites.map((s) => [s.id, s]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Tài sản';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Vị trí', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    const headers = ['Dự án', 'Vị trí cha', 'Tên vị trí', 'Mã vị trí'];
    sheet.columns = [
      { header: headers[0], key: 'c0', width: 30 },
      { header: headers[1], key: 'c1', width: 40 },
      { header: headers[2], key: 'c2', width: 34 },
      { header: headers[3], key: 'c3', width: 20 },
    ];

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

    for (const entry of entries) {
      const row = byId.get(entry.id);
      const site = siteOf.get(entry.siteId);
      // Đường dẫn cha: bỏ tên dự án ở đầu và đoạn lá ở cuối.
      const parentSegments = splitPath(entry.path).slice(1, -1);
      sheet.addRow([
        site ? withIdSuffix(site.name, site.id) : '',
        row?.parentId == null
          ? ''
          : withIdSuffix(parentSegments.join(' > '), row.parentId),
        row?.name ?? splitPath(entry.path).pop() ?? '',
        row?.code ?? '',
      ]);
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
    const errors: LocationImportError[] = [];
    const parsed = this.parseRows(sheet, headerMap, lookup, errors);

    if (parsed.length === 0) {
      if (errors.length === 0) {
        throw new BadRequestException(
          'File chưa có dòng dữ liệu nào. Hãy nhập vị trí bắt đầu từ dòng 2.',
        );
      }
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không vị trí nào được nhập.`,
          errors,
        ),
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không vị trí nào được nhập.`,
          errors,
        ),
      );
    }

    return this.persist(parsed);
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

  private parseRows(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    lookup: Lookups,
    errors: LocationImportError[],
  ): ParsedRow[] {
    const column = {} as Record<ColumnKey, number | undefined>;
    for (const col of COLUMNS) {
      column[col.key] = headerMap.get(normalizeText(col.header));
    }

    const rows: ParsedRow[] = [];
    let dataRowCount = 0;
    // Vị trí cha tạo ở dòng trên chưa có id trong DB, nên cấp id giả (số âm)
    // để dòng sau tham chiếu. persist() sẽ đổi sang id thật khi cha được tạo.
    let syntheticCounter = 0;
    const syntheticByKey = new Map<string, number>();
    const stagedByKey = new Map<string, ParsedRow>();
    const stagedCodes = new Map<string, number>();

    for (
      let rowNumber = 2;
      rowNumber <= sheet.rowCount;
      rowNumber += 1
    ) {
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

      const rowErrors: LocationImportError[] = [];
      const push = (key: ColumnKey, message: string) =>
        rowErrors.push({
          row: rowNumber,
          column: COLUMNS.find((col) => col.key === key)?.header ?? key,
          message,
        });

      const name = text('name');
      if (!name) push('name', 'Tên vị trí là bắt buộc.');

      // Dự án dạng "Tên (id)": có "(id)" thì lấy đúng dự án đó, BE chỉ dựa
      // vào id. Không có "(id)" thì khớp theo tên.
      let siteId = -1;
      const siteText = text('siteName');
      if (!siteText) {
        push('siteName', 'Dự án là bắt buộc.');
      } else {
        const { name: siteName, id: siteIdHint } = splitNameId(siteText);
        if (siteIdHint !== null) {
          const found = lookup.sitesById.get(siteIdHint);
          if (!found) {
            push(
              'siteName',
              `"${siteText}" có (id) #${siteIdHint} không tồn tại. Xem sheet "Danh mục" để copy đúng.`,
            );
          } else {
            siteId = siteIdHint;
          }
        } else {
          const siteIds = lookup.sites.get(normalizeText(siteName));
          if (!siteIds) {
            push(
              'siteName',
              `"${siteName}" không khớp dự án nào. Xem sheet "Danh mục" để chọn đúng.`,
            );
          } else if (siteIds.length > 1) {
            push(
              'siteName',
              `"${siteName}" khớp nhiều dự án — thêm (id) vào sau tên, ví dụ "${siteName} (${siteIds[0].id})".`,
            );
          } else {
            siteId = siteIds[0].id;
          }
        }
      }

      // Cha dạng "đường dẫn (id)": có "(id)" thì lấy đúng vị trí đó, BE chỉ
      // dựa vào id. Không có "(id)" thì đi theo đường dẫn; cha mới tạo ở
      // dòng trên của cùng file thì phải để đường dẫn thuần (chưa có id).
      let parentId: number | null = null;
      let syntheticId: number | null = null;
      if (siteId > 0) {
        const parentText = text('parentPath');
        if (parentText) {
          const { name: parentPath, id: parentIdHint } =
            splitNameId(parentText);
          if (parentIdHint !== null) {
            const found = lookup.locationsById.get(parentIdHint);
            if (!found) {
              push(
                'parentPath',
                `"${parentText}" có (id) #${parentIdHint} không tồn tại. Xem sheet "Danh mục" để copy đúng.`,
              );
            } else if (found.siteId !== siteId) {
              push(
                'parentPath',
                `Vị trí cha (#${parentIdHint}) không thuộc dự án này.`,
              );
            } else {
              parentId = parentIdHint;
            }
          } else {
            const segments = splitPath(parentPath);
            if (
              segments.length > 1 &&
              normalizeText(segments[0]) ===
                normalizeText(lookup.sitesById.get(siteId)?.name ?? '')
            ) {
              segments.shift();
            }
            parentId = this.resolveParent(
              siteId,
              segments,
              lookup,
              syntheticByKey,
              (message) => push('parentPath', message),
            );
          }
        }
        if (rowErrors.length === 0) {
          // Cấp id giả cho dòng này để dòng dưới tham chiếu tới được
          // (kể cả khi tên bị trùng và dòng bị loại).
          syntheticId = -(syntheticCounter += 1);
        }
      }

      // Dòng khớp (dự án, cha, tên) với bản ghi đã có sẽ được cập nhật thay
      // vì tạo mới — mã của chính bản ghi đó không tính là trùng.
      let existingId: number | null = null;
      if (siteId > 0 && parentId !== null && parentId >= 0 && name) {
        existingId =
          lookup.byKey.get(this.locationKey(siteId, parentId, name))?.id ??
          null;
      }

      const code = text('code') || null;
      if (code) {
        const stagedRow = stagedCodes.get(code);
        if (stagedRow !== undefined && stagedRow !== rowNumber) {
          push('code', `Mã "${code}" đã dùng ở dòng ${stagedRow}.`);
        } else {
          const owner = lookup.codeOwner.get(code);
          if (owner !== undefined && owner !== existingId) {
            push('code', `Mã "${code}" đã dùng cho vị trí #${owner}.`);
          }
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      // Chặn 2 dòng trong cùng file trỏ tới cùng 1 vị trí.
      const key = this.locationKey(siteId, parentId, name);
      const duplicate = stagedByKey.get(key);
      if (duplicate) {
        errors.push({
          row: rowNumber,
          column: 'Tên vị trí',
          message: `Trùng với dòng ${duplicate.row} (cùng dự án và cùng vị trí cha).`,
        });
        continue;
      }

      const parsed: ParsedRow = {
        row: rowNumber,
        siteId,
        parentId,
        syntheticId,
        existingId,
        name,
        code,
      };
      rows.push(parsed);
      stagedByKey.set(key, parsed);
      if (syntheticId !== null) syntheticByKey.set(key, syntheticId);
      if (code) stagedCodes.set(code, rowNumber);
    }

    return rows;
  }

  /**
   * Đi từ cấp 1 của dự án xuống theo từng đoạn đường dẫn. Trả về id cha
   * trong DB, hoặc id giả âm nếu cha được tạo ở dòng trên của cùng file.
   */
  private resolveParent(
    siteId: number,
    segments: string[],
    lookup: Lookups,
    syntheticByKey: Map<string, number>,
    fail: (message: string) => void,
  ): number | null {
    let parentId: number | null = null;
    for (const segment of segments) {
      const wanted = normalizeText(segment);
      const childKey: string = `${siteId}:${parentId ?? 0}`;
      const siblings: LocationRef[] = lookup.children.get(childKey) ?? [];
      const fromDb = siblings.filter(
        (item) => normalizeText(item.name) === wanted,
      );

      // Vị trí cha tạo ở dòng trên chưa có trong DB -> dùng id giả.
      if (fromDb.length === 0) {
        const synthetic = syntheticByKey.get(
          this.locationKey(siteId, parentId, segment),
        );
        if (synthetic !== undefined) {
          parentId = synthetic;
          continue;
        }
        fail(
          `Không tìm thấy vị trí cha "${segment}" trong dự án này${
            parentId ? ' ở cấp trên' : ''
          }.`,
        );
        return null;
      }
      if (fromDb.length > 1) {
        fail(
          `"${segment}" trùng tên — copy nguyên chuỗi "đường dẫn (id)" từ sheet "Danh mục".`,
        );
        return null;
      }
      parentId = fromDb[0].id;
    }
    return parentId;
  }

  /**
   * Ghi trong 1 transaction. Id giả âm của vị trí cha (tạo ở dòng trên) được
   * đổi thành id thật ngay khi cha được tạo.
   */
  private async persist(rows: ParsedRow[]): Promise<LocationImportResult> {
    return this.prisma.$transaction(async (tx) => {
      // Mã unique trên cả bản ghi đã xoá mềm. Bản đang dùng (chưa xoá) mà bị
      // trùng thì báo đúng dòng tại đây; còn mã của bản đã xoá mềm sẽ được
      // xử lý lúc restore từng dòng (giữ nguyên mã cũ là an toàn).
      const codes = rows
        .filter((row) => row.code)
        .map((row) => row.code as string);
      if (codes.length > 0) {
        const taken = await tx.siteLocation.findMany({
          where: { code: { in: codes }, isDeleted: false },
          select: { id: true, code: true },
        });
        const conflicts = taken.filter(
          (item) =>
            !rows.some(
              (row) => row.code === item.code && row.existingId === item.id,
            ),
        );
        if (conflicts.length > 0) {
          const byCode = new Map(conflicts.map((item) => [item.code, item.id]));
          throw new BadRequestException(
            buildImportError(
              `File có ${conflicts.length} mã bị trùng, không vị trí nào được nhập.`,
              rows
                .filter((row) => row.code && byCode.has(row.code as string))
                .map((row) => ({
                  row: row.row,
                  column: 'Mã vị trí',
                  message: `Mã "${row.code}" đã dùng cho vị trí #${byCode.get(row.code as string)}.`,
                })),
            ),
          );
        }
      }

      const created: number[] = [];
      const updated: number[] = [];
      const realIdOfSynthetic = new Map<number, number>();

      for (const row of rows) {
        const parentId =
          row.parentId !== null && row.parentId < 0
            ? realIdOfSynthetic.get(row.parentId)
            : row.parentId;
        if (
          row.parentId !== null &&
          row.parentId < 0 &&
          parentId === undefined
        ) {
          throw new BadRequestException(
            `Dòng ${row.row}: không tìm thấy vị trí cha đã khai báo.`,
          );
        }

        // Bản ghi đã bị xoá mềm vẫn giữ tên và mã (unique), nên phải tính tới
        // nó: nếu không, tạo mới sẽ vi phạm unique và cả file rollback.
        const existing = await tx.siteLocation.findFirst({
          where: {
            siteId: row.siteId,
            parentId: parentId ?? null,
            name: { equals: row.name, mode: 'insensitive' },
          },
          select: { id: true, isDeleted: true },
        });

        if (existing) {
          await tx.siteLocation.update({
            where: { id: existing.id },
            data: {
              isDeleted: false,
              // Ô "Mã vị trí" để trống nghĩa là xoá mã cũ.
              code: row.code,
            },
          });
          updated.push(existing.id);
          if (row.syntheticId !== null) {
            realIdOfSynthetic.set(row.syntheticId, existing.id);
          }
          continue;
        }

        const record = await tx.siteLocation.create({
          data: {
            siteId: row.siteId,
            name: row.name,
            code: row.code,
            parentId: parentId ?? null,
          },
          select: { id: true },
        });
        created.push(record.id);
        if (row.syntheticId !== null) {
          realIdOfSynthetic.set(row.syntheticId, record.id);
        }
      }

      return {
        total: rows.length,
        created: created.length,
        updated: updated.length,
      };
    });
  }
}
