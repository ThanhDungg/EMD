import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Cell, Worksheet } from 'exceljs';
import {
  addCascadeLists,
  buildImportError,
  cellText,
  columnLetter,
  normalizeText,
  parseQuantityValue,
} from '../../common/excel.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Nhập mẫu checklist (module Ứng dụng) bằng file Excel theo 3 bước, mỗi bước
// 1 file nhập nhiều dòng cùng lúc:
//
//   B1 — Danh mục:            Danh mục | Mô tả danh mục
//   B2 — Nội dung cha:        Danh mục | Nội dung cha
//   B3 — Nội dung con:        Danh mục | Nội dung cha | Tên nội dung con |
//                             Tiêu chuẩn kiểm tra | Loại giá trị | Số lượng
//
// Bước sau liên kết bước trước bằng TÊN (khớp không phân biệt hoa/dấu):
// B2 yêu cầu Danh mục đã có (nhập ở B1), B3 yêu cầu Nội dung cha đã có
// trong Danh mục đó (nhập ở B2) — thiếu thì báo đúng dòng, không ghi gì.
//
// Ngoài ra còn file gọn nhập cả cha + con cho 1 danh mục đã chọn (bấm Nhập
// Excel ở card Nội dung): mỗi dòng là 1 nội dung con kèm Nội dung cha, không
// cần cột Danh mục.
//
// Nguyên tắc chung:
// - Trùng tên thì DÙNG LẠI, không tạo trùng; nội dung con trùng tên trong
//   cùng cha thì được cập nhật Tiêu chuẩn/Loại/Số lượng.
// - Bản đã xoá mềm trùng tên sẽ được khôi phục.
// - Loại giá trị nhận mã (BOOLEAN/TEXT/NUMBER) hoặc tên tiếng Việt
//   ("Đúng / Sai", "Chữ", "Số").
// - Validate toàn bộ file trước, chỉ khi sạch lỗi mới ghi trong 1 transaction.

const MAX_IMPORT_ROWS = 2000;
const MAX_TEMPLATE_ROWS = 500;

const DATA_SHEET = 'Mẫu checklist';
const REF_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

type ColumnKey =
  | 'categoryName'
  | 'categoryNotes'
  | 'parentTitle'
  | 'childTitle'
  | 'standard'
  | 'valueType'
  | 'quantity';

interface ColumnDef {
  key: ColumnKey;
  header: string;
  width: number;
  required?: boolean;
  example?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'categoryName',
    header: 'Danh mục',
    width: 34,
    required: true,
    example: 'Checklist A — Vệ sinh văn phòng',
  },
  {
    key: 'categoryNotes',
    header: 'Mô tả danh mục',
    width: 30,
    example: 'Dùng cho vệ sinh văn phòng hằng ngày',
  },
  {
    key: 'parentTitle',
    header: 'Nội dung cha',
    width: 30,
    required: true,
    example: 'Khu vực làm việc chung',
  },
  {
    key: 'childTitle',
    header: 'Tên nội dung con',
    width: 30,
    example: 'Lau bàn ghế',
  },
  {
    key: 'standard',
    header: 'Tiêu chuẩn kiểm tra',
    width: 40,
    example: 'Mặt bàn ghế không bụi bẩn, sắp xếp gọn gàng',
  },
  {
    key: 'valueType',
    header: 'Loại giá trị',
    width: 16,
    example: 'Đúng / Sai',
  },
  { key: 'quantity', header: 'Số lượng', width: 12, example: '1' },
];

// File nhập cả nội dung cha + con cho 1 danh mục đã chọn: mỗi dòng là 1 nội
// dung con kèm Nội dung cha của nó, không cần cột Danh mục (danh mục lấy
// theo nơi đã chọn lúc bấm “Nhập Excel”).
type CategoryColumnKey =
  | 'parentTitle'
  | 'childTitle'
  | 'standard'
  | 'valueType'
  | 'quantity';

interface CategoryColumnDef {
  key: CategoryColumnKey;
  header: string;
  width: number;
  required?: boolean;
  example?: string;
}

const CATEGORY_COLUMNS: CategoryColumnDef[] = [
  {
    key: 'parentTitle',
    header: 'Nội dung cha',
    width: 30,
    required: true,
    example: 'Khu vực làm việc chung',
  },
  {
    key: 'childTitle',
    header: 'Tên nội dung con',
    width: 30,
    example: 'Lau bàn ghế',
  },
  {
    key: 'standard',
    header: 'Tiêu chuẩn kiểm tra',
    width: 40,
    example: 'Mặt bàn ghế không bụi bẩn, sắp xếp gọn gàng',
  },
  {
    key: 'valueType',
    header: 'Loại giá trị',
    width: 16,
    example: 'Đúng / Sai',
  },
  { key: 'quantity', header: 'Số lượng', width: 12, example: '1' },
];

const CATEGORY_COLUMN_BY_KEY = Object.fromEntries(
  CATEGORY_COLUMNS.map((col) => [col.key, col]),
) as Record<CategoryColumnKey, CategoryColumnDef>;

const VALUE_TYPE_LABEL: Record<string, string> = {
  BOOLEAN: 'Đúng / Sai',
  TEXT: 'Chữ',
  NUMBER: 'Số',
};

const CATEGORY_GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Mẫu checklist". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng là một nội dung con kèm Nội dung cha của nó, thuộc danh mục đã chọn lúc bấm “Nhập Excel”. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật. Cột Nội dung cha có dropdown các cha đã có — muốn thêm cha mới thì gõ tên mới trực tiếp.',
  ],
  [
    '3',
    'Cột "Nội dung cha" là bắt buộc. "Tên nội dung con" được phép trống — dòng đó chỉ tạo (hoặc dùng lại) Nội dung cha.',
  ],
  [
    '4',
    'Trùng tên thì dùng lại, không tạo trùng (so khớp không phân biệt hoa thường và dấu): Nội dung cha trùng tên trong danh mục thì thêm vào nhóm đó; Nội dung con trùng tên trong cùng cha thì được cập nhật Tiêu chuẩn/Loại/Số lượng.',
  ],
  [
    '5',
    'Cột "Loại giá trị" nhập một trong: "Đúng / Sai", "Chữ", "Số" (hoặc mã BOOLEAN/TEXT/NUMBER). Để trống được.',
  ],
  [
    '6',
    'Cột "Số lượng" nhập số lớn hơn hoặc bằng 0 (ví dụ 1). Để trống được.',
  ],
  [
    '7',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không nội dung nào được tạo hay sửa.',
  ],
];

export interface ChecklistTemplateImportError {
  row: number;
  column: string;
  message: string;
}

export interface ChecklistCategoryImportResult {
  total: number;
  parents: number;
  created: number;
  updated: number;
}

interface ParsedCategoryRow {
  parentTitle: string;
  childTitle: string | null;
  standard: string | null;
  valueType: string | null;
  quantity: number | null;
}

/** 1 dòng của file xuất tổng hợp (đủ 3 cấp, chỉ để đối chiếu/sao lưu). */
interface ParsedTemplateRow {
  categoryName: string;
  categoryNotes: string | null;
  parentTitle: string;
  childTitle: string | null;
  standard: string | null;
  valueType: string | null;
  quantity: number | null;
}

// ================= Cột/file cho nhập 3 bước =================

const STEP1_SHEET = 'Danh mục';
const STEP2_SHEET = 'Nội dung cha';
const STEP3_SHEET = 'Nội dung con';

interface StepColumnDef {
  key: string;
  header: string;
  width: number;
  required?: boolean;
  example?: string;
}

const STEP1_COLUMNS: StepColumnDef[] = [
  {
    key: 'name',
    header: 'Danh mục',
    width: 34,
    required: true,
    example: 'Checklist A — Vệ sinh văn phòng',
  },
  {
    key: 'notes',
    header: 'Mô tả danh mục',
    width: 40,
    example: 'Dùng cho vệ sinh văn phòng hằng ngày',
  },
];

const STEP2_COLUMNS: StepColumnDef[] = [
  {
    key: 'categoryName',
    header: 'Danh mục',
    width: 34,
    required: true,
    example: 'Checklist A — Vệ sinh văn phòng',
  },
  {
    key: 'parentTitle',
    header: 'Nội dung cha',
    width: 30,
    required: true,
    example: 'Khu vực làm việc chung',
  },
];

const STEP3_COLUMNS: StepColumnDef[] = [
  {
    key: 'categoryName',
    header: 'Danh mục',
    width: 34,
    required: true,
    example: 'Checklist A — Vệ sinh văn phòng',
  },
  {
    key: 'parentTitle',
    header: 'Nội dung cha',
    width: 30,
    required: true,
    example: 'Khu vực làm việc chung',
  },
  {
    key: 'childTitle',
    header: 'Tên nội dung con',
    width: 30,
    required: true,
    example: 'Lau bàn ghế',
  },
  {
    key: 'standard',
    header: 'Tiêu chuẩn kiểm tra',
    width: 40,
    example: 'Mặt bàn ghế không bụi bẩn, sắp xếp gọn gàng',
  },
  {
    key: 'valueType',
    header: 'Loại giá trị',
    width: 16,
    example: 'Đúng / Sai',
  },
  { key: 'quantity', header: 'Số lượng', width: 12, example: '1' },
];

const STEP1_GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Danh mục". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng là một danh mục. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật.',
  ],
  [
    '3',
    'Cột "Danh mục" là bắt buộc. Trùng tên (không phân biệt hoa thường và dấu) thì dùng lại danh mục đó và cập nhật Mô tả.',
  ],
  [
    '4',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không danh mục nào được tạo hay sửa.',
  ],
];

const STEP2_GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Nội dung cha". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng là một nội dung cha thuộc Danh mục ở cùng dòng. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật.',
  ],
  [
    '3',
    'Cột "Danh mục" phải là danh mục đã nhập ở bước 1 (nên chọn từ dropdown, hoặc copy nguyên từ file xuất). Danh mục chưa có thì dòng đó báo lỗi.',
  ],
  [
    '4',
    'Nội dung cha trùng tên trong cùng danh mục (không phân biệt hoa thường và dấu) thì dùng lại, không tạo trùng.',
  ],
  [
    '5',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không nội dung cha nào được tạo.',
  ],
];

const STEP3_GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Nội dung con". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng là một nội dung con thuộc Nội dung cha + Danh mục ở cùng dòng. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật. Chọn Danh mục trước, cột Nội dung cha sẽ hiện dropdown lọc đúng các cha của danh mục đó.',
  ],
  [
    '3',
    'Danh mục phải đã nhập ở bước 1, Nội dung cha phải đã nhập ở bước 2. Thiếu thì dòng đó báo lỗi — nhập bù rồi nhập lại file.',
  ],
  [
    '4',
    'Nội dung con trùng tên trong cùng cha (không phân biệt hoa thường và dấu) thì được cập nhật Tiêu chuẩn/Loại/Số lượng, không tạo trùng.',
  ],
  [
    '5',
    'Cột "Loại giá trị" nhập một trong: "Đúng / Sai", "Chữ", "Số" (hoặc mã BOOLEAN/TEXT/NUMBER). Để trống được.',
  ],
  [
    '6',
    'Cột "Số lượng" nhập số lớn hơn hoặc bằng 0 (ví dụ 1). Để trống được.',
  ],
  [
    '7',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không nội dung con nào được tạo hay sửa.',
  ],
];

export interface StepCategoriesImportResult {
  total: number;
  created: number;
  updated: number;
}

export interface StepParentsImportResult {
  total: number;
  categories: number;
  created: number;
  updated: number;
}

export interface StepChildrenImportResult {
  total: number;
  categories: number;
  parents: number;
  created: number;
  updated: number;
}

interface ParsedStepCategoryRow {
  name: string;
  notes: string | null;
}

interface ParsedStepParentRow {
  categoryName: string;
  parentTitle: string;
}

interface ParsedStepChildRow {
  categoryName: string;
  parentTitle: string;
  childTitle: string;
  standard: string | null;
  valueType: string | null;
  quantity: number | null;
}

@Injectable()
export class ChecklistExcelService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= Nhập 3 bước (B1 danh mục → B2 cha → B3 con) =================

  /** Đọc file .xlsx upload, trả sheet dữ liệu (đúng tên hoặc sheet đầu). */
  private async loadDataSheet(
    file: Express.Multer.File | undefined,
    sheetName: string,
  ): Promise<Worksheet> {
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
      workbook.getWorksheet(sheetName) ?? workbook.worksheets[0] ?? null;
    if (!sheet) {
      throw new BadRequestException('File không có sheet dữ liệu nào.');
    }
    return sheet;
  }

  /** Tạo sheet dữ liệu: tiêu đề đậm + dòng ví dụ + autofilter. */
  private addDataSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    columns: StepColumnDef[],
  ): Worksheet {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = columns.map((col) => ({
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
    columns.forEach((col, index) => {
      if (col.example) sheet.getRow(2).getCell(index + 1).value = col.example;
    });
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };
    return sheet;
  }

  /** Dropdown cho cột "Loại giá trị" (trỏ sang sheet 'Danh mục' cột A). */
  private addValueTypeDropdown(
    sheet: Worksheet,
    columns: StepColumnDef[],
  ): void {
    const valueTypeIndex =
      columns.findIndex((col) => col.key === 'valueType') + 1;
    if (valueTypeIndex <= 0) return;
    const valueLabels = Object.values(VALUE_TYPE_LABEL);
    for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
      sheet.getRow(row).getCell(valueTypeIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'${REF_SHEET}'!$A$2:$A$${valueLabels.length + 1}`],
      };
    }
  }

  /** Sheet tham chiếu 'Danh mục': cột A loại giá trị, cột B tên danh mục. */
  private writeStepReferenceSheet(
    workbook: ExcelJS.Workbook,
    categories: string[],
    withValueTypes: boolean,
  ) {
    const sheet = workbook.addWorksheet(REF_SHEET);
    const columns: Array<{ header: string; key: string; values: string[] }> =
      [];
    if (withValueTypes) {
      columns.push({
        header: 'Loại giá trị (copy nguyên sang sheet dữ liệu)',
        key: 'v',
        values: Object.entries(VALUE_TYPE_LABEL).map(
          ([code, label]) => `${label} (${code})`,
        ),
      });
    }
    if (categories.length > 0) {
      columns.push({
        header: 'Danh mục (copy nguyên sang sheet dữ liệu)',
        key: 'c',
        values: categories,
      });
    }
    if (columns.length === 0) return;
    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
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
    const height = Math.max(...columns.map((col) => col.values.length));
    for (let row = 0; row < height; row += 1) {
      columns.forEach((col, index) => {
        const value = col.values[row];
        if (value !== undefined)
          sheet.getRow(row + 2).getCell(index + 1).value = value;
      });
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /** Dropdown cho cột "Danh mục" theo danh sách danh mục hiện có. */
  private addCategoryDropdown(
    sheet: Worksheet,
    columns: StepColumnDef[],
    count: number,
  ): void {
    if (count === 0) return;
    const categoryIndex =
      columns.findIndex((col) => col.key === 'categoryName') + 1;
    if (categoryIndex <= 0) return;
    // Cột B của sheet tham chiếu (cột A là loại giá trị khi có).
    const hasValueTypes = columns.some((col) => col.key === 'valueType');
    const letter = hasValueTypes ? 'B' : 'A';
    for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
      sheet.getRow(row).getCell(categoryIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'${REF_SHEET}'!$${letter}$2:$${letter}$${count + 1}`],
      };
    }
  }

  /** Tên các danh mục mẫu hiện có (cho dropdown + kiểm tra file B2/B3). */
  private async listTemplateCategories(): Promise<
    Array<{ id: number; title: string; isDeleted: boolean }>
  > {
    return this.prisma.checklistItem.findMany({
      where: { workId: null, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, title: true, isDeleted: true },
    });
  }

  // ---------- B1: danh mục ----------

  async buildStepCategoriesTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    this.addDataSheet(workbook, STEP1_SHEET, STEP1_COLUMNS);
    this.writeGuideSheet(
      workbook,
      STEP1_GUIDE_ROWS,
      STEP1_COLUMNS,
      'Cột bắt buộc: Danh mục. Các cột còn lại không bắt buộc.',
    );
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Xuất danh sách danh mục (nhập lại ở B1 được ngay). */
  async buildStepCategoriesExport(): Promise<Buffer> {
    const categories = await this.listTemplateCategories();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    const sheet = this.addDataSheet(workbook, STEP1_SHEET, STEP1_COLUMNS);
    for (const c of categories.filter((item) => !item.isDeleted)) {
      const full = await this.prisma.checklistItem.findUnique({
        where: { id: c.id },
        select: { notes: true },
      });
      sheet.addRow({ name: c.title, notes: full?.notes ?? '' });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importStepCategories(
    file: Express.Multer.File | undefined,
  ): Promise<StepCategoriesImportResult> {
    const sheet = await this.loadDataSheet(file, STEP1_SHEET);
    const headerMap = this.readHeader(sheet, STEP1_COLUMNS);
    const errors: ChecklistTemplateImportError[] = [];
    const parsedRows = this.parseStepCategories(sheet, headerMap, errors);
    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập danh mục bắt đầu từ dòng 2.',
      );
    }
    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không danh mục nào được nhập.`,
          errors,
        ),
      );
    }
    return this.persistStepCategories(parsedRows);
  }

  private parseStepCategories(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    errors: ChecklistTemplateImportError[],
  ): ParsedStepCategoryRow[] {
    const nameIndex = headerMap.get(normalizeText('Danh mục'));
    const notesIndex = headerMap.get(normalizeText('Mô tả danh mục'));
    const rows: ParsedStepCategoryRow[] = [];
    let dataRowCount = 0;
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const name = cellText(nameIndex ? row.getCell(nameIndex) : undefined);
      const notes = cellText(notesIndex ? row.getCell(notesIndex) : undefined);
      if (!name && !notes) continue;
      dataRowCount += 1;
      if (dataRowCount > MAX_IMPORT_ROWS) {
        throw new BadRequestException(
          `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu. Hãy chia nhỏ thành nhiều file.`,
        );
      }
      if (!name) {
        errors.push({
          row: rowNumber,
          column: 'Danh mục',
          message: 'Danh mục là bắt buộc.',
        });
        continue;
      }
      rows.push({ name, notes: notes || null });
    }
    return rows;
  }

  private async persistStepCategories(
    rows: ParsedStepCategoryRow[],
  ): Promise<StepCategoriesImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.checklistItem.findMany({
        where: { workId: null, parentId: null },
        select: { id: true, title: true },
      });
      const byName = new Map<string, { id: number }>();
      for (const item of existing) {
        const key = normalizeText(item.title);
        if (!byName.has(key)) byName.set(key, { id: item.id });
      }
      let order = await this.maxSortOrder(tx, null);
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const key = normalizeText(row.name);
        const found = byName.get(key);
        if (found) {
          await tx.checklistItem.update({
            where: { id: found.id },
            data: {
              ...(row.notes !== null ? { notes: row.notes } : {}),
              isDeleted: false,
            },
          });
          updated += 1;
        } else {
          order += 1;
          const createdCategory = await tx.checklistItem.create({
            data: {
              title: row.name,
              notes: row.notes,
              workId: null,
              parentId: null,
              sortOrder: order,
            },
            select: { id: true },
          });
          byName.set(key, { id: createdCategory.id });
          created += 1;
        }
      }
      return { total: rows.length, created, updated };
    });
    return result;
  }

  // ---------- B2: nội dung cha ----------

  async buildStepParentsTemplate(): Promise<Buffer> {
    const categories = (await this.listTemplateCategories()).filter(
      (c) => !c.isDeleted,
    );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    const sheet = this.addDataSheet(workbook, STEP2_SHEET, STEP2_COLUMNS);
    this.writeStepReferenceSheet(
      workbook,
      categories.map((c) => c.title),
      false,
    );
    this.addCategoryDropdown(sheet, STEP2_COLUMNS, categories.length);
    this.writeGuideSheet(
      workbook,
      STEP2_GUIDE_ROWS,
      STEP2_COLUMNS,
      'Cột bắt buộc: Danh mục, Nội dung cha.',
    );
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importStepParents(
    file: Express.Multer.File | undefined,
  ): Promise<StepParentsImportResult> {
    const roots = await this.listTemplateCategories();
    const catMap = new Map(
      roots.map((c) => [normalizeText(c.title), c] as const),
    );
    const sheet = await this.loadDataSheet(file, STEP2_SHEET);
    const headerMap = this.readHeader(sheet, STEP2_COLUMNS);
    const errors: ChecklistTemplateImportError[] = [];
    const parsedRows = this.parseStepParents(sheet, headerMap, catMap, errors);
    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập nội dung cha bắt đầu từ dòng 2.',
      );
    }
    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không nội dung cha nào được nhập.`,
          errors,
        ),
      );
    }
    return this.persistStepParents(parsedRows);
  }

  private parseStepParents(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    catMap: Map<string, { id: number; title: string; isDeleted: boolean }>,
    errors: ChecklistTemplateImportError[],
  ): ParsedStepParentRow[] {
    const categoryIndex = headerMap.get(normalizeText('Danh mục'));
    const parentIndex = headerMap.get(normalizeText('Nội dung cha'));
    const rows: ParsedStepParentRow[] = [];
    let dataRowCount = 0;
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const categoryName = cellText(
        categoryIndex ? row.getCell(categoryIndex) : undefined,
      );
      const parentTitle = cellText(
        parentIndex ? row.getCell(parentIndex) : undefined,
      );
      if (!categoryName && !parentTitle) continue;
      dataRowCount += 1;
      if (dataRowCount > MAX_IMPORT_ROWS) {
        throw new BadRequestException(
          `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu. Hãy chia nhỏ thành nhiều file.`,
        );
      }
      const rowErrors: ChecklistTemplateImportError[] = [];
      if (!categoryName) {
        rowErrors.push({
          row: rowNumber,
          column: 'Danh mục',
          message: 'Danh mục là bắt buộc.',
        });
      } else if (!catMap.has(normalizeText(categoryName))) {
        rowErrors.push({
          row: rowNumber,
          column: 'Danh mục',
          message: `Danh mục "${categoryName}" chưa có. Hãy nhập danh mục ở bước 1 trước.`,
        });
      }
      if (!parentTitle) {
        rowErrors.push({
          row: rowNumber,
          column: 'Nội dung cha',
          message: 'Nội dung cha là bắt buộc.',
        });
      }
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }
      rows.push({ categoryName, parentTitle });
    }
    return rows;
  }

  private async persistStepParents(
    rows: ParsedStepParentRow[],
  ): Promise<StepParentsImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const roots = await tx.checklistItem.findMany({
        where: { workId: null, parentId: null },
        select: { id: true, title: true },
      });
      const catByName = new Map<string, number>();
      for (const r of roots) {
        const key = normalizeText(r.title);
        if (!catByName.has(key)) catByName.set(key, r.id);
      }
      const parentByKey = new Map<string, { id: number }>();
      const orderByCategory = new Map<number, number>();
      const seenCategories = new Set<number>();
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        // Đã kiểm tra tồn tại ở bước parse — đây chỉ là lấy id trong transaction.
        const categoryId = catByName.get(normalizeText(row.categoryName));
        if (categoryId === undefined) continue;
        seenCategories.add(categoryId);
        const key = `${categoryId}::${normalizeText(row.parentTitle)}`;
        let parent = parentByKey.get(key);
        if (!parent) {
          const matched = await this.findChildByName(
            tx,
            categoryId,
            row.parentTitle,
          );
          if (matched) {
            await tx.checklistItem.update({
              where: { id: matched.id },
              data: { isDeleted: false },
            });
            updated += 1;
            parent = { id: matched.id };
          } else {
            const base =
              orderByCategory.get(categoryId) ??
              (await this.maxSortOrder(tx, categoryId));
            const next = base + 1;
            orderByCategory.set(categoryId, next);
            const createdParent = await tx.checklistItem.create({
              data: {
                title: row.parentTitle,
                workId: null,
                parentId: categoryId,
                sortOrder: next,
              },
              select: { id: true },
            });
            created += 1;
            parent = { id: createdParent.id };
          }
          parentByKey.set(key, parent);
        } else {
          updated += 1;
        }
      }
      // Danh mục đã xoá mềm nhưng được nhập cha lại → khôi phục để thấy được.
      await tx.checklistItem.updateMany({
        where: { id: { in: [...seenCategories] } },
        data: { isDeleted: false },
      });
      return {
        total: rows.length,
        categories: seenCategories.size,
        created,
        updated,
      };
    });
    return result;
  }

  // ---------- B3: nội dung con ----------

  async buildStepChildrenTemplate(): Promise<Buffer> {
    const categories = (await this.listTemplateCategories()).filter(
      (c) => !c.isDeleted,
    );
    const catIds = new Set(categories.map((c) => c.id));
    const parents = (
      await this.prisma.checklistItem.findMany({
        where: { workId: null, isDeleted: false },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, title: true, parentId: true },
      })
    ).filter((i) => i.parentId !== null && catIds.has(i.parentId));
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    const sheet = this.addDataSheet(workbook, STEP3_SHEET, STEP3_COLUMNS);
    this.writeStepReferenceSheet(
      workbook,
      categories.map((c) => c.title),
      true,
    );
    this.addCategoryDropdown(sheet, STEP3_COLUMNS, categories.length);
    this.addValueTypeDropdown(sheet, STEP3_COLUMNS);
    // Dropdown LIÊN KẾT: chọn Danh mục trước, dropdown "Nội dung cha" cùng
    // dòng tự lọc đúng các cha của danh mục đó — khỏi gõ tay sai tên.
    const cascade = addCascadeLists(
      workbook,
      categories.map((c) => ({ id: c.id, name: c.title })),
      parents.map((p) => ({
        id: p.id,
        name: p.title,
        siteId: p.parentId as number,
        parentId: null,
      })),
    );
    if (cascade) {
      const catLetter = columnLetter(
        STEP3_COLUMNS.findIndex((col) => col.key === 'categoryName') + 1,
      );
      const parentIndex =
        STEP3_COLUMNS.findIndex((col) => col.key === 'parentTitle') + 1;
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(parentIndex).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [cascade.locationFormulaByName(catLetter, row)],
        };
      }
    }
    this.writeGuideSheet(
      workbook,
      STEP3_GUIDE_ROWS,
      STEP3_COLUMNS,
      'Cột bắt buộc: Danh mục, Nội dung cha, Tên nội dung con. Các cột còn lại không bắt buộc.',
    );
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importStepChildren(
    file: Express.Multer.File | undefined,
  ): Promise<StepChildrenImportResult> {
    const items = await this.prisma.checklistItem.findMany({
      where: { workId: null },
      select: { id: true, title: true, parentId: true, isDeleted: true },
    });
    const catByName = new Map<string, { id: number }>();
    for (const item of items) {
      if (item.parentId !== null) continue;
      const key = normalizeText(item.title);
      if (!catByName.has(key)) catByName.set(key, { id: item.id });
    }
    const parentByKey = new Map<string, { id: number }>();
    for (const item of items) {
      if (item.parentId === null) continue;
      const owner = items.find((c) => c.id === item.parentId);
      if (!owner || owner.parentId !== null) continue;
      const key = `${owner.id}::${normalizeText(item.title)}`;
      if (!parentByKey.has(key)) parentByKey.set(key, { id: item.id });
    }
    const sheet = await this.loadDataSheet(file, STEP3_SHEET);
    const headerMap = this.readHeader(sheet, STEP3_COLUMNS);
    const errors: ChecklistTemplateImportError[] = [];
    const parsedRows = this.parseStepChildren(
      sheet,
      headerMap,
      catByName,
      parentByKey,
      errors,
    );
    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập nội dung con bắt đầu từ dòng 2.',
      );
    }
    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không nội dung con nào được nhập.`,
          errors,
        ),
      );
    }
    return this.persistStepChildren(parsedRows);
  }

  private parseStepChildren(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    catByName: Map<string, { id: number }>,
    parentByKey: Map<string, { id: number }>,
    errors: ChecklistTemplateImportError[],
  ): ParsedStepChildRow[] {
    const indexOf = (header: string) => {
      const index = headerMap.get(normalizeText(header));
      return index;
    };
    const categoryIndex = indexOf('Danh mục');
    const parentIndex = indexOf('Nội dung cha');
    const childIndex = indexOf('Tên nội dung con');
    const standardIndex = indexOf('Tiêu chuẩn kiểm tra');
    const valueTypeIndex = indexOf('Loại giá trị');
    const quantityIndex = indexOf('Số lượng');
    const rows: ParsedStepChildRow[] = [];
    let dataRowCount = 0;
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const at = (index: number | undefined) =>
        cellText(index ? row.getCell(index) : undefined);
      const categoryName = at(categoryIndex);
      const parentTitle = at(parentIndex);
      const childTitle = at(childIndex);
      const standard = at(standardIndex);
      const valueTypeRaw = at(valueTypeIndex);
      const quantityRaw = at(quantityIndex);
      if (
        !categoryName &&
        !parentTitle &&
        !childTitle &&
        !standard &&
        !valueTypeRaw &&
        !quantityRaw
      ) {
        continue;
      }
      dataRowCount += 1;
      if (dataRowCount > MAX_IMPORT_ROWS) {
        throw new BadRequestException(
          `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu. Hãy chia nhỏ thành nhiều file.`,
        );
      }
      const rowErrors: ChecklistTemplateImportError[] = [];
      const push = (column: string, message: string) =>
        rowErrors.push({ row: rowNumber, column, message });
      const category = categoryName
        ? catByName.get(normalizeText(categoryName))
        : undefined;
      if (!categoryName) push('Danh mục', 'Danh mục là bắt buộc.');
      else if (!category) {
        push(
          'Danh mục',
          `Danh mục "${categoryName}" chưa có. Hãy nhập danh mục ở bước 1 trước.`,
        );
      }
      const parentKey = category
        ? `${category.id}::${normalizeText(parentTitle)}`
        : null;
      const parent =
        parentKey !== null ? parentByKey.get(parentKey) : undefined;
      if (!parentTitle) push('Nội dung cha', 'Nội dung cha là bắt buộc.');
      else if (category && !parent) {
        push(
          'Nội dung cha',
          `Nội dung cha "${parentTitle}" chưa có trong danh mục "${categoryName}". Hãy nhập ở bước 2 trước.`,
        );
      }
      if (!childTitle)
        push('Tên nội dung con', 'Tên nội dung con là bắt buộc.');
      const valueType = this.resolveValueType(valueTypeRaw, (message) =>
        push('Loại giá trị', message),
      );
      const quantity = this.resolveQuantity(quantityRaw, (message) =>
        push('Số lượng', message),
      );
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }
      rows.push({
        categoryName,
        parentTitle,
        childTitle,
        standard: standard || null,
        valueType,
        quantity,
      });
    }
    return rows;
  }

  private async persistStepChildren(
    rows: ParsedStepChildRow[],
  ): Promise<StepChildrenImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const items = await tx.checklistItem.findMany({
        where: { workId: null },
        select: { id: true, title: true, parentId: true },
      });
      const catByName = new Map<string, number>();
      for (const item of items) {
        if (item.parentId !== null) continue;
        const key = normalizeText(item.title);
        if (!catByName.has(key)) catByName.set(key, item.id);
      }
      const childByKey = new Map<string, { id: number }>();
      const orderByParent = new Map<number, number>();
      const seenCategories = new Set<number>();
      const seenParents = new Set<number>();
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        // Đã kiểm tra tồn tại ở bước parse — đây chỉ là lấy id trong transaction.
        const categoryId = catByName.get(normalizeText(row.categoryName));
        if (categoryId === undefined) continue;
        const parent = await this.findChildByName(
          tx,
          categoryId,
          row.parentTitle,
        );
        if (!parent) continue;
        seenCategories.add(categoryId);
        seenParents.add(parent.id);
        const key = `${parent.id}::${normalizeText(row.childTitle)}`;
        let child = childByKey.get(key);
        if (!child) {
          const matched = await this.findChildByName(
            tx,
            parent.id,
            row.childTitle,
          );
          if (matched) {
            await tx.checklistItem.update({
              where: { id: matched.id },
              data: {
                title: row.childTitle,
                standard: row.standard,
                valueType: row.valueType,
                quantity: row.quantity,
                isDeleted: false,
              },
            });
            updated += 1;
            child = { id: matched.id };
          } else {
            const base =
              orderByParent.get(parent.id) ??
              (await this.maxSortOrder(tx, parent.id));
            const next = base + 1;
            orderByParent.set(parent.id, next);
            const createdChild = await tx.checklistItem.create({
              data: {
                title: row.childTitle,
                standard: row.standard,
                valueType: row.valueType,
                quantity: row.quantity,
                workId: null,
                parentId: parent.id,
                sortOrder: next,
              },
              select: { id: true },
            });
            created += 1;
            child = { id: createdChild.id };
          }
          childByKey.set(key, child);
        } else {
          await tx.checklistItem.update({
            where: { id: child.id },
            data: {
              standard: row.standard ?? undefined,
              valueType: row.valueType ?? undefined,
              quantity: row.quantity ?? undefined,
              isDeleted: false,
            },
          });
          updated += 1;
        }
      }
      // Cha/danh mục đã xoá mềm nhưng được nhập con lại → khôi phục để thấy được.
      await tx.checklistItem.updateMany({
        where: { id: { in: [...seenCategories, ...seenParents] } },
        data: { isDeleted: false },
      });
      return {
        total: rows.length,
        categories: seenCategories.size,
        parents: seenParents.size,
        created,
        updated,
      };
    });
    return result;
  }

  /** Sheet tham chiếu: cột A loại giá trị, cột B nội dung cha của danh mục. */
  private writeReferenceSheet(workbook: ExcelJS.Workbook, parents: string[]) {
    const sheet = workbook.addWorksheet(REF_SHEET);
    const columns: Array<{ header: string; key: string; values: string[] }> = [
      {
        header: 'Loại giá trị (copy nguyên sang sheet dữ liệu)',
        key: 'v',
        values: Object.entries(VALUE_TYPE_LABEL).map(
          ([code, label]) => `${label} (${code})`,
        ),
      },
      ...(parents.length > 0
        ? [
            {
              header: 'Nội dung cha đã có (chọn từ dropdown)',
              key: 'p',
              values: parents,
            },
          ]
        : []),
    ];
    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
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
    const height = Math.max(...columns.map((col) => col.values.length));
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
    guideRows: Array<[string, string]>,
    columns: Array<{ header: string; required?: boolean; example?: string }>,
    requiredNote: string,
  ) {
    const sheet = workbook.addWorksheet(GUIDE_SHEET);
    sheet.columns = [
      { header: 'Bước', key: 'step', width: 8 },
      { header: 'Hướng dẫn', key: 'text', width: 96 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.height = 22;

    for (const [step, text] of guideRows) sheet.addRow([step, text]);
    sheet.addRow(['', '']);
    sheet.addRow(['', requiredNote]);

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
   * Xuất toàn bộ mẫu checklist ra .xlsx 1 sheet phẳng đủ 3 cấp để đối
   * chiếu/sao lưu. Danh mục chưa có nội dung nào vẫn xuất 1 dòng (để trống
   * cha/con).
   */
  async buildExport(): Promise<Buffer> {
    const items = await this.prisma.checklistItem.findMany({
      where: { workId: null, isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const childrenOf = (parentId: number | null) =>
      items.filter((item) => item.parentId === parentId);

    const rows: ParsedTemplateRow[] = [];
    for (const category of childrenOf(null)) {
      const parents = childrenOf(category.id);
      if (parents.length === 0) {
        rows.push({
          categoryName: category.title,
          categoryNotes: category.notes,
          parentTitle: '',
          childTitle: null,
          standard: null,
          valueType: null,
          quantity: null,
        });
        continue;
      }
      for (const parent of parents) {
        const children = childrenOf(parent.id);
        if (children.length === 0) {
          rows.push({
            categoryName: category.title,
            categoryNotes: category.notes,
            parentTitle: parent.title,
            childTitle: null,
            standard: null,
            valueType: null,
            quantity: null,
          });
          continue;
        }
        for (const child of children) {
          rows.push({
            categoryName: category.title,
            categoryNotes: category.notes,
            parentTitle: parent.title,
            childTitle: child.title,
            standard: child.standard,
            valueType: child.valueType,
            quantity:
              child.quantity === null || child.quantity === undefined
                ? null
                : Number(child.quantity),
          });
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(DATA_SHEET, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = COLUMNS.map((col) => ({
      header: col.header,
      key: col.key,
      width: 20,
    }));
    sheet.getColumn(1).width = 34;
    sheet.getColumn(5).width = 40;

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

    for (const row of rows) {
      sheet.addRow({
        categoryName: row.categoryName,
        categoryNotes: row.categoryNotes ?? '',
        parentTitle: row.parentTitle,
        childTitle: row.childTitle ?? '',
        standard: row.standard ?? '',
        valueType: row.valueType
          ? (VALUE_TYPE_LABEL[row.valueType] ?? row.valueType)
          : '',
        quantity: row.quantity ?? '',
      });
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNS.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // ================= Mẫu + nhập/xuất cha-con theo danh mục =================

  /** File mẫu nhập cả nội dung cha + con cho 1 danh mục đã chọn. */
  async buildCategoryTemplate(categoryId: number): Promise<Buffer> {
    const category = await this.findTemplateCategoryOrFail(categoryId);
    const parents = await this.prisma.checklistItem.findMany({
      where: { workId: null, parentId: category.id, isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, title: true },
    });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(DATA_SHEET, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = CATEGORY_COLUMNS.map((col) => ({
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

    // Dòng 2 là ví dụ — người dùng xoá trước khi nhập dữ liệu thật.
    CATEGORY_COLUMNS.forEach((col, index) => {
      if (col.example) sheet.getRow(2).getCell(index + 1).value = col.example;
    });

    // Dropdown cho cột "Loại giá trị" trên MAX_TEMPLATE_ROWS dòng.
    const valueTypeIndex =
      CATEGORY_COLUMNS.findIndex((col) => col.key === 'valueType') + 1;
    const valueLabels = Object.values(VALUE_TYPE_LABEL);
    for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
      sheet.getRow(row).getCell(valueTypeIndex).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'${REF_SHEET}'!$A$2:$A$${valueLabels.length + 1}`],
      };
    }

    // Dropdown cho cột "Nội dung cha" (cột A): các cha đã có của danh mục.
    // Muốn thêm cha mới thì gõ tên mới trực tiếp vào ô.
    if (parents.length > 0) {
      for (let row = 2; row <= MAX_TEMPLATE_ROWS; row += 1) {
        sheet.getRow(row).getCell(1).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`'${REF_SHEET}'!$B$2:$B$${parents.length + 1}`],
        };
      }
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: CATEGORY_COLUMNS.length },
    };

    this.writeReferenceSheet(
      workbook,
      parents.map((p) => p.title),
    );
    this.writeGuideSheet(
      workbook,
      CATEGORY_GUIDE_ROWS,
      CATEGORY_COLUMNS,
      'Cột bắt buộc: Nội dung cha. Các cột còn lại không bắt buộc.',
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Xuất cả nội dung cha + con của 1 danh mục ra file (nhập lại được ngay). */
  async buildCategoryExport(categoryId: number): Promise<Buffer> {
    const category = await this.findTemplateCategoryOrFail(categoryId);
    const parents = await this.prisma.checklistItem.findMany({
      where: { workId: null, parentId: category.id, isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const children = await this.prisma.checklistItem.findMany({
      where: {
        workId: null,
        parentId: { in: parents.map((p) => p.id) },
        isDeleted: false,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const childrenOf = (pid: number) =>
      children.filter((c) => c.parentId === pid);

    const rows: ParsedCategoryRow[] = [];
    for (const parent of parents) {
      const items = childrenOf(parent.id);
      if (items.length === 0) {
        rows.push({
          parentTitle: parent.title,
          childTitle: null,
          standard: null,
          valueType: null,
          quantity: null,
        });
        continue;
      }
      for (const child of items) {
        rows.push({
          parentTitle: parent.title,
          childTitle: child.title,
          standard: child.standard,
          valueType: child.valueType,
          quantity:
            child.quantity === null || child.quantity === undefined
              ? null
              : Number(child.quantity),
        });
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(DATA_SHEET, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = CATEGORY_COLUMNS.map((col) => ({
      header: col.header,
      key: col.key,
      width: 20,
    }));
    sheet.getColumn(1).width = 30;
    sheet.getColumn(3).width = 40;

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

    for (const row of rows) {
      sheet.addRow({
        parentTitle: row.parentTitle,
        childTitle: row.childTitle ?? '',
        standard: row.standard ?? '',
        valueType: row.valueType
          ? (VALUE_TYPE_LABEL[row.valueType] ?? row.valueType)
          : '',
        quantity: row.quantity ?? '',
      });
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: CATEGORY_COLUMNS.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Nhập cả nội dung cha + con từ file vào 1 danh mục đã chọn. */
  async importCategoryFromFile(
    categoryId: number,
    file: Express.Multer.File | undefined,
  ): Promise<ChecklistCategoryImportResult> {
    const category = await this.findTemplateCategoryOrFail(categoryId);

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

    const headerMap = this.readHeader(sheet, CATEGORY_COLUMNS);
    const errors: ChecklistTemplateImportError[] = [];
    const parsedRows = this.parseCategoryRows(sheet, headerMap, errors);

    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập nội dung bắt đầu từ dòng 2.',
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không nội dung nào được nhập.`,
          errors,
        ),
      );
    }

    return this.persistCategory(category.id, parsedRows);
  }

  /** Danh mục mẫu hợp lệ để nhập cha-con: node gốc độc lập (workId null). */
  private async findTemplateCategoryOrFail(categoryId: number) {
    const category = await this.prisma.checklistItem.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.isDeleted) {
      throw new NotFoundException(`Danh mục #${categoryId} không tồn tại.`);
    }
    if (category.workId !== null || category.parentId !== null) {
      throw new BadRequestException(
        'Chỉ nhập Excel cho Danh mục mẫu checklist (module Ứng dụng).',
      );
    }
    return category;
  }

  private parseCategoryRows(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    errors: ChecklistTemplateImportError[],
  ): ParsedCategoryRow[] {
    const column = {} as Record<CategoryColumnKey, number | undefined>;
    for (const col of CATEGORY_COLUMNS) {
      column[col.key] = headerMap.get(normalizeText(col.header));
    }

    const rows: ParsedCategoryRow[] = [];
    const totalRows = sheet.rowCount;
    let dataRowCount = 0;

    for (let rowNumber = 2; rowNumber <= totalRows; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const cell = (key: CategoryColumnKey): Cell | undefined => {
        const index = column[key];
        return index ? row.getCell(index) : undefined;
      };
      const text = (key: CategoryColumnKey) => cellText(cell(key));

      if (CATEGORY_COLUMNS.every((col) => !text(col.key))) continue;

      dataRowCount += 1;
      if (dataRowCount > MAX_IMPORT_ROWS) {
        throw new BadRequestException(
          `File vượt quá ${MAX_IMPORT_ROWS} dòng dữ liệu. Hãy chia nhỏ thành nhiều file.`,
        );
      }

      const rowErrors: ChecklistTemplateImportError[] = [];
      const push = (key: CategoryColumnKey, message: string) =>
        rowErrors.push({
          row: rowNumber,
          column: CATEGORY_COLUMN_BY_KEY[key].header,
          message,
        });

      const childTitle = text('childTitle');
      const parentTitle = text('parentTitle');
      if (!parentTitle) push('parentTitle', 'Nội dung cha là bắt buộc.');

      const valueType = this.resolveValueType(text('valueType'), (message) =>
        push('valueType', message),
      );
      const quantity = this.resolveQuantity(text('quantity'), (message) =>
        push('quantity', message),
      );

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      rows.push({
        parentTitle,
        childTitle: childTitle || null,
        standard: text('standard') || null,
        valueType,
        quantity,
      });
    }

    return rows;
  }

  /** Ghi cả cha + con vào 1 danh mục trong 1 transaction: trùng tên thì dùng lại. */
  private async persistCategory(
    categoryId: number,
    rows: ParsedCategoryRow[],
  ): Promise<ChecklistCategoryImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const parentByKey = new Map<string, { id: number }>();
      const childByKey = new Map<string, { id: number }>();
      const seenParents = new Set<number>();
      const childOrderByParent = new Map<number, number>();

      let parentOrder = await this.maxSortOrder(tx, categoryId);
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const parentKey = normalizeText(row.parentTitle);
        let parent = parentByKey.get(parentKey);
        if (!parent) {
          const matched = await this.findChildByName(
            tx,
            categoryId,
            row.parentTitle,
          );
          if (matched) {
            await tx.checklistItem.update({
              where: { id: matched.id },
              data: { isDeleted: false },
            });
            parent = { id: matched.id };
          } else {
            parentOrder += 1;
            const createdParent = await tx.checklistItem.create({
              data: {
                title: row.parentTitle,
                workId: null,
                parentId: categoryId,
                sortOrder: parentOrder,
              },
              select: { id: true },
            });
            parent = { id: createdParent.id };
          }
          parentByKey.set(parentKey, parent);
        }
        seenParents.add(parent.id);

        // Dòng không có tên con → chỉ đảm bảo Nội dung cha tồn tại.
        if (!row.childTitle) continue;

        const childKey = `${parent.id}::${normalizeText(row.childTitle)}`;
        let child = childByKey.get(childKey);
        if (!child) {
          const matched = await this.findChildByName(
            tx,
            parent.id,
            row.childTitle,
          );
          if (matched) {
            await tx.checklistItem.update({
              where: { id: matched.id },
              data: {
                title: row.childTitle,
                standard: row.standard,
                valueType: row.valueType,
                quantity: row.quantity,
                isDeleted: false,
              },
            });
            updated += 1;
            child = { id: matched.id };
          } else {
            const base =
              childOrderByParent.get(parent.id) ??
              (await this.maxSortOrder(tx, parent.id));
            const next = base + 1;
            childOrderByParent.set(parent.id, next);
            const createdChild = await tx.checklistItem.create({
              data: {
                title: row.childTitle,
                standard: row.standard,
                valueType: row.valueType,
                quantity: row.quantity,
                workId: null,
                parentId: parent.id,
                sortOrder: next,
              },
              select: { id: true },
            });
            created += 1;
            child = { id: createdChild.id };
          }
          childByKey.set(childKey, child);
        } else {
          await tx.checklistItem.update({
            where: { id: child.id },
            data: {
              standard: row.standard ?? undefined,
              valueType: row.valueType ?? undefined,
              quantity: row.quantity ?? undefined,
              isDeleted: false,
            },
          });
          updated += 1;
        }
      }

      return {
        total: rows.length,
        parents: seenParents.size,
        created,
        updated,
      };
    });
    return result;
  }

  private readHeader(
    sheet: Worksheet,
    columns: Array<{ header: string; required?: boolean }>,
  ): Map<string, number> {
    const known = new Set(columns.map((col) => normalizeText(col.header)));
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
          `Các cột hợp lệ: ${columns.map((col) => col.header).join(', ')}. ` +
          'Hãy tải lại file mẫu mới nhất.',
      });
    }

    const missing = columns.filter(
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

  /** Loại giá trị: nhận mã hoặc tên tiếng Việt ("Đúng / Sai (BOOLEAN)"...). */
  private resolveValueType(
    raw: string,
    onError: (message: string) => void,
  ): string | null {
    if (!raw) return null;
    // Cho phép copy nguyên từ sheet Danh mục: "Đúng / Sai (BOOLEAN)".
    const codeInParens = /\(([A-Za-z]+)\)\s*$/.exec(raw)?.[1]?.toUpperCase();
    if (codeInParens && VALUE_TYPE_LABEL[codeInParens]) return codeInParens;
    const upper = raw.trim().toUpperCase();
    if (VALUE_TYPE_LABEL[upper]) return upper;
    const wanted = normalizeText(raw);
    const found = Object.entries(VALUE_TYPE_LABEL).find(
      ([, label]) => normalizeText(label) === wanted,
    );
    if (found) return found[0];
    onError(
      `"${raw}" không hợp lệ. Giá trị đúng: "Đúng / Sai", "Chữ", "Số".`,
    );
    return null;
  }

  private resolveQuantity(
    raw: string,
    onError: (message: string) => void,
  ): number | null {
    if (!raw) return null;
    const parsed = parseQuantityValue(raw);
    if (parsed.error) {
      onError(parsed.error);
      return null;
    }
    return parsed.quantity ?? null;
  }

  private async findChildByName(
    tx: {
      checklistItem: {
        findMany: (args: {
          where: { workId: null; parentId: number };
          select: { id: true; title: true };
        }) => Promise<Array<{ id: number; title: string }>>;
      };
    },
    parentId: number,
    title: string,
  ): Promise<{ id: number; title: string } | null> {
    const siblings = await tx.checklistItem.findMany({
      where: { workId: null, parentId },
      select: { id: true, title: true },
    });
    const wanted = normalizeText(title);
    return siblings.find((s) => normalizeText(s.title) === wanted) ?? null;
  }

  private async maxSortOrder(
    tx: {
      checklistItem: {
        findFirst: (args: {
          where: { workId: null; parentId: number | null };
          orderBy: { sortOrder: 'desc' };
          select: { sortOrder: true };
        }) => Promise<{ sortOrder: number } | null>;
      };
    },
    parentId: number | null,
  ): Promise<number> {
    const last = await tx.checklistItem.findFirst({
      where: { workId: null, parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return last?.sortOrder ?? -1;
  }
}
