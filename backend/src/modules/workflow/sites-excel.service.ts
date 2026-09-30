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
  parseIntValue,
  parseQuantityValue,
  splitNameId,
  withIdSuffix,
} from '../../common/excel.js';
import {
  SiteManagementStatus,
  SiteOperationStatus,
  SiteRentalStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Nhập hồ sơ dự án bằng file Excel theo khuôn mẫu do backend sinh ra.
//
// Nguyên tắc:
// - Không có cột ID rời. Các cột tham chiếu nhập theo dạng "Tên (id)" — ví
//   dụ "Hà Nội (1)"; BE bóc id trong ngoặc để lấy đúng bản ghi, chỉ dựa vào
//   id. Chỉ gõ tên vẫn được (khớp không phân biệt hoa/dấu).
// - "Mã dự án" là duy nhất: dòng có mã trùng dự án đã có thì CẬP NHẬT dự án
//   đó (kể cả bản đã xoá mềm sẽ được khôi phục); không có mã thì luôn tạo mới.
// - Địa lý phân cấp phải khớp tầng (Miền thuộc Quốc gia, Tỉnh thuộc Miền,
//   Phường thuộc Tỉnh) — sai thì báo đúng dòng, không ghi gì.
// - Validate toàn bộ file trước, chỉ khi sạch lỗi mới ghi trong một transaction.

const MAX_IMPORT_ROWS = 2000;
const MAX_TEMPLATE_ROWS = 500;

const DATA_SHEET = 'Dự án';
const REF_SHEET = 'Danh mục';
const GUIDE_SHEET = 'Hướng dẫn';

type ColumnKey =
  | 'name'
  | 'code'
  | 'lot'
  | 'stage'
  | 'countryName'
  | 'regionName'
  | 'provinceName'
  | 'wardName'
  | 'address'
  | 'geoPoints'
  | 'investorName'
  | 'floors'
  | 'serviceTypeName'
  | 'serviceName'
  | 'landArea'
  | 'gfaArea'
  | 'glaArea'
  | 'roadArea'
  | 'leasedArea'
  | 'greenArea'
  | 'occupancyRate'
  | 'receivedAt'
  | 'operationStatus'
  | 'rentalStatus'
  | 'managementStatus'
  | 'managerName'
  | 'notes';

type SiteRefColumn =
  | 'country'
  | 'region'
  | 'province'
  | 'ward'
  | 'investor'
  | 'serviceType'
  | 'service'
  | 'manager'
  | 'operationStatus'
  | 'rentalStatus'
  | 'managementStatus';

interface ColumnDef {
  key: ColumnKey;
  header: string;
  width: number;
  required?: boolean;
  /** Cột lấy danh sách gợi ý (dropdown) từ sheet 'Danh mục'. */
  refColumn?: SiteRefColumn;
  example?: string;
  /** Giá trị mẫu nên để dạng text để Excel không tự đổi thành ngày. */
  textExample?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'name',
    header: 'Tên dự án',
    width: 34,
    required: true,
    example: 'Khu đô thị mới ABC',
  },
  { key: 'code', header: 'Mã dự án', width: 14, example: 'DA-001' },
  { key: 'lot', header: 'Lô', width: 12, example: 'Lô A1' },
  { key: 'stage', header: 'Giai đoạn', width: 14, example: 'Giai đoạn 1' },
  {
    key: 'countryName',
    header: 'Quốc gia',
    width: 20,
    refColumn: 'country',
    example: 'Việt Nam (1)',
  },
  {
    key: 'regionName',
    header: 'Miền',
    width: 20,
    refColumn: 'region',
    example: 'Miền Bắc (1)',
  },
  {
    key: 'provinceName',
    header: 'Tỉnh thành',
    width: 20,
    refColumn: 'province',
    example: 'Hà Nội (1)',
  },
  {
    key: 'wardName',
    header: 'Phường xã',
    width: 22,
    refColumn: 'ward',
    example: 'Phường Cầu Giấy (1)',
  },
  {
    key: 'address',
    header: 'Địa chỉ',
    width: 28,
    example: 'Số 1 đường ABC',
  },
  {
    key: 'geoPoints',
    header: 'Định vị',
    width: 28,
    example: '21.0285,105.8542',
  },
  {
    key: 'investorName',
    header: 'Chủ đầu tư',
    width: 26,
    refColumn: 'investor',
    example: 'Tập đoàn XYZ (1)',
  },
  { key: 'floors', header: 'Số tầng', width: 10, example: '25' },
  {
    key: 'serviceTypeName',
    header: 'Loại hình dịch vụ',
    width: 22,
    refColumn: 'serviceType',
    example: 'Khu đô thị (1)',
  },
  {
    key: 'serviceName',
    header: 'Dịch vụ cung cấp',
    width: 24,
    refColumn: 'service',
    example: 'Quản lý vận hành (1)',
  },
  { key: 'landArea', header: 'Diện tích đất (m²)', width: 16, example: '10000' },
  { key: 'gfaArea', header: 'Tổng GFA (m²)', width: 14, example: '50000' },
  { key: 'glaArea', header: 'Tổng GLA (m²)', width: 14, example: '40000' },
  {
    key: 'roadArea',
    header: 'Diện tích đường (m²)',
    width: 16,
    example: '5000',
  },
  {
    key: 'leasedArea',
    header: 'Diện tích cho thuê (m²)',
    width: 18,
    example: '35000',
  },
  {
    key: 'greenArea',
    header: 'Diện tích xanh (m²)',
    width: 16,
    example: '2000',
  },
  {
    key: 'occupancyRate',
    header: 'Tỷ lệ lấp đầy (%)',
    width: 14,
    example: '85',
  },
  {
    key: 'receivedAt',
    header: 'Ngày tiếp nhận',
    width: 14,
    textExample: '01/01/2024',
  },
  {
    key: 'operationStatus',
    header: 'Tình trạng dự án',
    width: 18,
    refColumn: 'operationStatus',
    example: 'Đang hoạt động',
  },
  {
    key: 'rentalStatus',
    header: 'Trạng thái cho thuê',
    width: 18,
    refColumn: 'rentalStatus',
    example: 'Đang cho thuê',
  },
  {
    key: 'managementStatus',
    header: 'Trạng thái quản lý',
    width: 18,
    refColumn: 'managementStatus',
    example: 'Đang quản lý',
  },
  {
    key: 'managerName',
    header: 'Quản lý',
    width: 22,
    refColumn: 'manager',
    example: 'nv001 (3)',
  },
  {
    key: 'notes',
    header: 'Ghi chú',
    width: 30,
    example: 'Dự án trọng điểm',
  },
];

/** Danh sách gợi ý nằm ở cột nào của sheet 'Danh mục' (1 = A). */
const REF_COLUMN_INDEX: Record<SiteRefColumn, number> = {
  country: 1,
  region: 2,
  province: 3,
  ward: 4,
  investor: 5,
  serviceType: 6,
  service: 7,
  manager: 8,
  operationStatus: 9,
  rentalStatus: 10,
  managementStatus: 11,
};

/** Tra cột theo key thay vì chỉ số mảng — tránh lệch khi thêm/bớt cột. */
const COLUMN_BY_KEY = Object.fromEntries(
  COLUMNS.map((col) => [col.key, col]),
) as Record<ColumnKey, ColumnDef>;

const OPERATION_STATUS_LABEL: Record<SiteOperationStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Ngưng hoạt động',
};

const RENTAL_STATUS_LABEL: Record<SiteRentalStatus, string> = {
  RENTED: 'Đang cho thuê',
  VACANT: 'Trống',
  PREPARING: 'Chuẩn bị cho thuê',
};

const MANAGEMENT_STATUS_LABEL: Record<SiteManagementStatus, string> = {
  MANAGED: 'Đang quản lý',
  NOT_MANAGED: 'Chưa quản lý',
  SUSPENDED: 'Ngưng quản lý',
};

const GUIDE_ROWS: Array<[string, string]> = [
  ['Cách dùng', ''],
  [
    '1',
    'Chỉ sửa dữ liệu trong sheet "Dự án". Không đổi tên hoặc thứ tự các cột tiêu đề.',
  ],
  [
    '2',
    'Mỗi dòng dữ liệu là một dự án. Dòng trống hoàn toàn sẽ bị bỏ qua. Xoá dòng ví dụ (dòng 2) trước khi nhập dữ liệu thật.',
  ],
  ['3', 'Cột "Tên dự án" là bắt buộc. Các cột còn lại để trống được.'],
  [
    '4',
    '"Mã dự án" là duy nhất: dòng có mã trùng dự án đã có thì cập nhật dự án đó (kể cả bản đã xoá sẽ được khôi phục). Không có mã thì luôn tạo mới — nhập lại file sẽ tạo trùng. Nên điền mã để nhập nhiều lần không trùng.',
  ],
  [
    '5',
    'Các cột tham chiếu (Quốc gia, Chủ đầu tư, Quản lý...) nhập theo dạng "Tên (id)" — ví dụ "Hà Nội (1)". Phần (id) trong ngoặc giúp lấy đúng bản ghi, tránh nhầm khi trùng tên.',
  ],
  [
    '6',
    'Chỉ gõ tên (không có "(id)") vẫn được: khớp không phân biệt hoa thường và dấu tiếng Việt. Nếu tên bị trùng, hệ thống báo lỗi và gợi ý (id) — xem sheet "Danh mục" để copy đúng chuỗi "Tên (id)". Chọn từ dropdown để tránh sai.',
  ],
  [
    '7',
    'Địa lý phân cấp phải khớp tầng: Miền thuộc Quốc gia, Tỉnh thành thuộc Miền, Phường xã thuộc Tỉnh thành. Nhập lệch tầng thì dòng đó báo lỗi.',
  ],
  [
    '8',
    'Trạng thái nhập tên tiếng Việt (ví dụ "Đang hoạt động") hoặc mã (ví dụ "ACTIVE"). Quản lý nhập tên đăng nhập kèm (id), ví dụ "nv001 (3)".',
  ],
  [
    '9',
    'Diện tích nhập theo m², tỷ lệ lấp đầy theo % (nhập số, không có dấu phẩy phân cách nghìn). Ngày nhập theo dd/MM/yyyy (ví dụ 01/01/2024).',
  ],
  [
    '10',
    'Muốn nhập nhiều đợt: nhập đợt 1, bấm "Xuất Excel" để lấy file đã có sẵn "Tên (id)" và "Mã dự án", dùng tiếp cho đợt 2.',
  ],
  [
    '11',
    'Hệ thống kiểm tra TOÀN BỘ file trước khi ghi. Nếu có bất kỳ dòng nào sai thì không dự án nào được tạo hay sửa.',
  ],
];

export interface SiteImportError {
  /** Số dòng trong Excel (1 = dòng tiêu đề). */
  row: number;
  column: string;
  message: string;
}

export interface SiteImportResult {
  total: number;
  created: number;
  updated: number;
}

interface GeoRef {
  id: number;
  name: string;
  /** Id cha trực tiếp: miền -> quốc gia, tỉnh -> miền, phường -> tỉnh. */
  parentId: number | null;
}

interface DroplistRef {
  id: number;
  code: string | null;
  name: string;
}

interface ManagerRef {
  id: number;
  accountName: string;
  fullName: string | null;
}

interface SiteCodeRef {
  id: number;
  code: string;
  isDeleted: boolean;
}

interface ReferenceData {
  countries: DroplistRef[];
  regions: GeoRef[];
  provinces: GeoRef[];
  wards: GeoRef[];
  investors: DroplistRef[];
  serviceTypes: DroplistRef[];
  services: DroplistRef[];
  managers: ManagerRef[];
  sites: SiteCodeRef[];
}

/** Tra cứu tên -> bản ghi đã chuẩn hoá, dùng khi đọc file nhập. */
interface ReferenceLookups {
  countries: Map<string, DroplistRef[]>;
  regions: Map<string, GeoRef[]>;
  provinces: Map<string, GeoRef[]>;
  wards: Map<string, GeoRef[]>;
  investors: Map<string, DroplistRef[]>;
  serviceTypes: Map<string, DroplistRef[]>;
  services: Map<string, DroplistRef[]>;
  managersByAccount: Map<string, ManagerRef[]>;
  managersByFullName: Map<string, ManagerRef[]>;
  // Tra cứu theo ID — hậu tố "(id)" trong ô được ưu tiên hơn tên.
  countriesById: Map<number, DroplistRef>;
  regionsById: Map<number, GeoRef>;
  provincesById: Map<number, GeoRef>;
  wardsById: Map<number, GeoRef>;
  investorsById: Map<number, DroplistRef>;
  serviceTypesById: Map<number, DroplistRef>;
  servicesById: Map<number, DroplistRef>;
  managersById: Map<number, ManagerRef>;
  sitesByCode: Map<string, SiteCodeRef>;
}

@Injectable()
export class SitesExcelService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= Danh mục tham chiếu =================

  private async loadReferenceData(): Promise<ReferenceData> {
    const notDeleted = { isDeleted: false };
    const byName = { name: 'asc' as const };
    const [
      countries,
      regions,
      provinces,
      wards,
      investors,
      serviceTypes,
      services,
      managers,
      sites,
    ] = await Promise.all([
      this.prisma.country.findMany({ where: notDeleted, orderBy: byName }),
      this.prisma.region.findMany({
        where: notDeleted,
        orderBy: byName,
        select: { id: true, name: true, countryId: true },
      }),
      this.prisma.province.findMany({
        where: notDeleted,
        orderBy: byName,
        select: { id: true, name: true, regionId: true },
      }),
      this.prisma.ward.findMany({
        where: notDeleted,
        orderBy: byName,
        select: { id: true, name: true, provinceId: true },
      }),
      this.prisma.investor.findMany({ where: notDeleted, orderBy: byName }),
      this.prisma.serviceType.findMany({ where: notDeleted, orderBy: byName }),
      this.prisma.providedService.findMany({
        where: notDeleted,
        orderBy: byName,
      }),
      this.prisma.user.findMany({
        where: notDeleted,
        orderBy: { accountName: 'asc' },
        select: { id: true, accountName: true, fullName: true },
      }),
      this.prisma.site.findMany({
        select: { id: true, code: true, isDeleted: true },
      }),
    ]);

    return {
      countries,
      regions: regions.map((r) => ({
        id: r.id,
        name: r.name,
        parentId: r.countryId,
      })),
      provinces: provinces.map((r) => ({
        id: r.id,
        name: r.name,
        parentId: r.regionId,
      })),
      wards: wards.map((r) => ({
        id: r.id,
        name: r.name,
        parentId: r.provinceId,
      })),
      investors,
      serviceTypes,
      services,
      managers,
      sites: sites
        .filter((s) => s.code)
        .map((s) => ({ id: s.id, code: s.code as string, isDeleted: s.isDeleted })),
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

  async buildTemplate(): Promise<Buffer> {
    const ref = await this.loadReferenceData();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
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
      const example = col.textExample ?? col.example;
      if (example) sheet.getRow(2).getCell(index + 1).value = example;
    });

    // Dropdown cho các cột tham chiếu / trạng thái trên MAX_TEMPLATE_ROWS dòng.
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
      if (col.key !== 'receivedAt') return;
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

  /** Giá trị "Tên (id)" (trạng thái: tên tiếng Việt) cho từng cột dropdown. */
  private referenceValues(ref: ReferenceData): Record<SiteRefColumn, string[]> {
    const named = (rows: Array<{ id: number; name: string }>) =>
      rows.map((r) => withIdSuffix(r.name, r.id));
    const labels = (labels: Record<string, string>) => Object.values(labels);
    return {
      country: named(ref.countries),
      region: named(ref.regions),
      province: named(ref.provinces),
      ward: named(ref.wards),
      investor: named(ref.investors),
      serviceType: named(ref.serviceTypes),
      service: named(ref.services),
      manager: ref.managers.map((m) => withIdSuffix(m.accountName, m.id)),
      operationStatus: labels(OPERATION_STATUS_LABEL),
      rentalStatus: labels(RENTAL_STATUS_LABEL),
      managementStatus: labels(MANAGEMENT_STATUS_LABEL),
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
      { header: 'Quốc gia', values: values.country },
      { header: 'Miền', values: values.region },
      { header: 'Tỉnh thành', values: values.province },
      { header: 'Phường xã', values: values.ward },
      { header: 'Chủ đầu tư', values: values.investor },
      { header: 'Loại hình dịch vụ', values: values.serviceType },
      { header: 'Dịch vụ cung cấp', values: values.service },
      { header: 'Quản lý', values: values.manager },
      { header: 'Tình trạng dự án', values: values.operationStatus },
      { header: 'Trạng thái cho thuê', values: values.rentalStatus },
      { header: 'Trạng thái quản lý', values: values.managementStatus },
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
      'Cột bắt buộc: Tên dự án. Các cột còn lại không bắt buộc.',
    ]);

    for (const col of columns) {
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

  // ================= Xuất dữ liệu =================

  /**
   * Xuất toàn bộ dự án ra .xlsx 1 sheet. File xuất dùng nguyên thứ tự cột
   * của file nhập nên nhập lại được ngay — các cột tham chiếu đã ở dạng
   * "Tên (id)", "Mã dự án" giữ nguyên để nhập lại thì cập nhật.
   */
  async buildExport(includeDeleted = false): Promise<Buffer> {
    const rows = await this.prisma.site.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      include: {
        country: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
        province: { select: { id: true, name: true } },
        ward: { select: { id: true, name: true } },
        investor: { select: { id: true, name: true } },
        serviceType: { select: { id: true, name: true } },
        service: { select: { id: true, name: true } },
        manager: { select: { id: true, accountName: true } },
      },
      orderBy: { id: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMD - Module Ứng dụng';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet(DATA_SHEET, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = COLUMNS.map((col) => ({
      header: col.header,
      key: col.key,
      width: 18,
    }));
    sheet.getColumn(columnIndex('name') + 1).width = 34;
    sheet.getColumn(columnIndex('address') + 1).width = 28;
    sheet.getColumn(columnIndex('notes') + 1).width = 30;

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

    const named = (
      item: { id: number; name: string } | null | undefined,
      id?: number | null,
    ): string => {
      if (!item) return '';
      return withIdSuffix(item.name, id ?? item.id);
    };

    for (const row of rows) {
      sheet.addRow({
        [COLUMN_BY_KEY.name.header]: row.name,
        [COLUMN_BY_KEY.code.header]: row.code ?? '',
        [COLUMN_BY_KEY.lot.header]: row.lot ?? '',
        [COLUMN_BY_KEY.stage.header]: row.stage ?? '',
        [COLUMN_BY_KEY.countryName.header]: named(row.country, row.countryId),
        [COLUMN_BY_KEY.regionName.header]: named(row.region, row.regionId),
        [COLUMN_BY_KEY.provinceName.header]: named(row.province, row.provinceId),
        [COLUMN_BY_KEY.wardName.header]: named(row.ward, row.wardId),
        [COLUMN_BY_KEY.address.header]: row.address ?? '',
        [COLUMN_BY_KEY.geoPoints.header]: row.geoPoints ?? '',
        [COLUMN_BY_KEY.investorName.header]: named(row.investor, row.investorId),
        [COLUMN_BY_KEY.floors.header]: row.floors ?? '',
        [COLUMN_BY_KEY.serviceTypeName.header]: named(
          row.serviceType,
          row.serviceTypeId,
        ),
        [COLUMN_BY_KEY.serviceName.header]: named(row.service, row.serviceId),
        [COLUMN_BY_KEY.landArea.header]: toNumber(row.landArea),
        [COLUMN_BY_KEY.gfaArea.header]: toNumber(row.gfaArea),
        [COLUMN_BY_KEY.glaArea.header]: toNumber(row.glaArea),
        [COLUMN_BY_KEY.roadArea.header]: toNumber(row.roadArea),
        [COLUMN_BY_KEY.leasedArea.header]: toNumber(row.leasedArea),
        [COLUMN_BY_KEY.greenArea.header]: toNumber(row.greenArea),
        [COLUMN_BY_KEY.occupancyRate.header]: toNumber(row.occupancyRate),
        [COLUMN_BY_KEY.receivedAt.header]: row.receivedAt
          ? formatDateVi(new Date(row.receivedAt))
          : '',
        [COLUMN_BY_KEY.operationStatus.header]: row.operationStatus
          ? OPERATION_STATUS_LABEL[row.operationStatus]
          : '',
        [COLUMN_BY_KEY.rentalStatus.header]: row.rentalStatus
          ? RENTAL_STATUS_LABEL[row.rentalStatus]
          : '',
        [COLUMN_BY_KEY.managementStatus.header]: row.managementStatus
          ? MANAGEMENT_STATUS_LABEL[row.managementStatus]
          : '',
        [COLUMN_BY_KEY.managerName.header]: row.manager
          ? withIdSuffix(row.manager.accountName, row.manager.id)
          : '',
        [COLUMN_BY_KEY.notes.header]: row.notes ?? '',
      });
    }

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: COLUMNS.length },
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
    const errors: SiteImportError[] = [];
    const parsedRows = this.parseRows(sheet, headerMap, lookup, errors);

    if (errors.length === 0 && parsedRows.length === 0) {
      throw new BadRequestException(
        'File chưa có dòng dữ liệu nào. Hãy nhập dự án bắt đầu từ dòng 2.',
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        buildImportError(
          `File có ${errors.length} lỗi, không dự án nào được nhập.`,
          errors,
        ),
      );
    }

    return this.persist(parsedRows);
  }

  /** Ghi tất cả dự án trong 1 transaction: có mã trùng thì cập nhật. */
  private async persist(
    rows: Array<{
      existingId: number | null;
      name: string;
      code: string | null;
      lot: string | null;
      stage: string | null;
      countryId: number | null;
      regionId: number | null;
      provinceId: number | null;
      wardId: number | null;
      address: string | null;
      geoPoints: string | null;
      investorId: number | null;
      floors: number | null;
      serviceTypeId: number | null;
      serviceId: number | null;
      landArea: number | null;
      gfaArea: number | null;
      glaArea: number | null;
      roadArea: number | null;
      leasedArea: number | null;
      greenArea: number | null;
      occupancyRate: number | null;
      receivedAt: Date | null;
      operationStatus: SiteOperationStatus | null;
      rentalStatus: SiteRentalStatus | null;
      managementStatus: SiteManagementStatus | null;
      managerId: number | null;
      notes: string | null;
    }>,
  ): Promise<SiteImportResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const { existingId, ...data } = row;
        if (existingId !== null) {
          await tx.site.update({
            where: { id: existingId },
            data: { ...data, isDeleted: false },
          });
          updated += 1;
        } else {
          await tx.site.create({ data });
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
    const managersByFullName = new Map<string, ManagerRef[]>();
    for (const manager of ref.managers) {
      const accountKey = normalizeText(manager.accountName);
      const accountList = managersByAccount.get(accountKey);
      if (accountList) accountList.push(manager);
      else managersByAccount.set(accountKey, [manager]);
      if (manager.fullName) {
        const fullKey = normalizeText(manager.fullName);
        const fullList = managersByFullName.get(fullKey);
        if (fullList) fullList.push(manager);
        else managersByFullName.set(fullKey, [manager]);
      }
    }
    return {
      countries: this.indexByName(ref.countries),
      regions: this.indexByName(ref.regions),
      provinces: this.indexByName(ref.provinces),
      wards: this.indexByName(ref.wards),
      investors: this.indexByName(ref.investors),
      serviceTypes: this.indexByName(ref.serviceTypes),
      services: this.indexByName(ref.services),
      managersByAccount,
      managersByFullName,
      countriesById: this.indexById(ref.countries),
      regionsById: this.indexById(ref.regions),
      provincesById: this.indexById(ref.provinces),
      wardsById: this.indexById(ref.wards),
      investorsById: this.indexById(ref.investors),
      serviceTypesById: this.indexById(ref.serviceTypes),
      servicesById: this.indexById(ref.services),
      managersById: this.indexById(ref.managers),
      sitesByCode: new Map(ref.sites.map((s) => [s.code, s])),
    };
  }

  private parseRows(
    sheet: Worksheet,
    headerMap: Map<string, number>,
    lookup: ReferenceLookups,
    errors: SiteImportError[],
  ) {
    const column = {} as Record<ColumnKey, number | undefined>;
    for (const col of COLUMNS) {
      column[col.key] = headerMap.get(normalizeText(col.header));
    }

    const rows: Array<{
      existingId: number | null;
      name: string;
      code: string | null;
      lot: string | null;
      stage: string | null;
      countryId: number | null;
      regionId: number | null;
      provinceId: number | null;
      wardId: number | null;
      address: string | null;
      geoPoints: string | null;
      investorId: number | null;
      floors: number | null;
      serviceTypeId: number | null;
      serviceId: number | null;
      landArea: number | null;
      gfaArea: number | null;
      glaArea: number | null;
      roadArea: number | null;
      leasedArea: number | null;
      greenArea: number | null;
      occupancyRate: number | null;
      receivedAt: Date | null;
      operationStatus: SiteOperationStatus | null;
      rentalStatus: SiteRentalStatus | null;
      managementStatus: SiteManagementStatus | null;
      managerId: number | null;
      notes: string | null;
    }> = [];

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

      const rowErrors: SiteImportError[] = [];
      const push = (key: ColumnKey, message: string) =>
        rowErrors.push({
          row: rowNumber,
          column: COLUMN_BY_KEY[key].header,
          message,
        });

      const name = text('name');
      if (!name) push('name', 'Tên dự án là bắt buộc.');

      const code = text('code') || null;
      if (code) {
        const stagedRow = stagedCodes.get(code);
        if (stagedRow !== undefined && stagedRow !== rowNumber) {
          push('code', `Mã "${code}" đã dùng ở dòng ${stagedRow}.`);
        } else {
          stagedCodes.set(code, rowNumber);
        }
      }
      const existingId = code ? (lookup.sitesByCode.get(code)?.id ?? null) : null;

      const countryId = this.resolveDroplist(
        text('countryName'),
        'countryName',
        lookup.countriesById,
        lookup.countries,
        'Quốc gia',
        push,
      );
      const regionId = this.resolveGeo(
        text('regionName'),
        'regionName',
        'Miền',
        lookup.regionsById,
        lookup.regions,
        push,
      );
      const provinceId = this.resolveGeo(
        text('provinceName'),
        'provinceName',
        'Tỉnh thành',
        lookup.provincesById,
        lookup.provinces,
        push,
      );
      const wardId = this.resolveGeo(
        text('wardName'),
        'wardName',
        'Phường xã',
        lookup.wardsById,
        lookup.wards,
        push,
      );

      // Địa lý phân cấp phải khớp tầng — kiểm tra từ dữ liệu đã tải, không
      // cần query thêm.
      const regionParent =
        regionId !== null
          ? (lookup.regionsById.get(regionId)?.parentId ?? null)
          : null;
      const provinceParent =
        provinceId !== null
          ? (lookup.provincesById.get(provinceId)?.parentId ?? null)
          : null;
      const wardParent =
        wardId !== null
          ? (lookup.wardsById.get(wardId)?.parentId ?? null)
          : null;
      this.assertGeoChain('regionName', 'Miền', regionId, regionParent, 'countryName', 'Quốc gia', countryId, push);
      this.assertGeoChain('provinceName', 'Tỉnh thành', provinceId, provinceParent, 'regionName', 'Miền', regionId, push);
      this.assertGeoChain('wardName', 'Phường xã', wardId, wardParent, 'provinceName', 'Tỉnh thành', provinceId, push);

      const investorId = this.resolveDroplist(
        text('investorName'),
        'investorName',
        lookup.investorsById,
        lookup.investors,
        'Chủ đầu tư',
        push,
      );
      const serviceTypeId = this.resolveDroplist(
        text('serviceTypeName'),
        'serviceTypeName',
        lookup.serviceTypesById,
        lookup.serviceTypes,
        'Loại hình dịch vụ',
        push,
      );
      const serviceId = this.resolveDroplist(
        text('serviceName'),
        'serviceName',
        lookup.servicesById,
        lookup.services,
        'Dịch vụ cung cấp',
        push,
      );
      const managerId = this.resolveManager(text('managerName'), lookup, push);

      const floors = this.resolveInt(text('floors'), 'floors', push);
      const landArea = this.resolveDecimal(text('landArea'), 'landArea', push);
      const gfaArea = this.resolveDecimal(text('gfaArea'), 'gfaArea', push);
      const glaArea = this.resolveDecimal(text('glaArea'), 'glaArea', push);
      const roadArea = this.resolveDecimal(text('roadArea'), 'roadArea', push);
      const leasedArea = this.resolveDecimal(text('leasedArea'), 'leasedArea', push);
      const greenArea = this.resolveDecimal(text('greenArea'), 'greenArea', push);
      const occupancyRate = this.resolveDecimal(
        text('occupancyRate'),
        'occupancyRate',
        push,
      );
      const receivedAt = this.resolveDate(cell('receivedAt'), (message) =>
        push('receivedAt', message),
      );

      const operationStatus = this.resolveStatus(
        text('operationStatus'),
        'operationStatus',
        OPERATION_STATUS_LABEL,
        push,
      );
      const rentalStatus = this.resolveStatus(
        text('rentalStatus'),
        'rentalStatus',
        RENTAL_STATUS_LABEL,
        push,
      );
      const managementStatus = this.resolveStatus(
        text('managementStatus'),
        'managementStatus',
        MANAGEMENT_STATUS_LABEL,
        push,
      );

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      rows.push({
        existingId,
        name,
        code,
        lot: orNull(text('lot')),
        stage: orNull(text('stage')),
        countryId,
        regionId,
        provinceId,
        wardId,
        address: orNull(text('address')),
        geoPoints: orNull(text('geoPoints')),
        investorId,
        floors,
        serviceTypeId,
        serviceId,
        landArea,
        gfaArea,
        glaArea,
        roadArea,
        leasedArea,
        greenArea,
        occupancyRate,
        receivedAt,
        operationStatus,
        rentalStatus,
        managementStatus,
        managerId,
        notes: orNull(text('notes')),
      });
    }

    return rows;
  }

  /**
   * Ô tham chiếu dạng "Tên (id)": có "(id)" thì lấy đúng bản ghi đó — BE chỉ
   * dựa vào id, phần tên chỉ để người đọc hiểu. Không có "(id)" thì khớp
   * theo tên (không phân biệt hoa/dấu); trùng tên phải thêm "(id)".
   */
  private resolveDroplist<T extends { id: number; name: string }>(
    rawText: string,
    nameKey: ColumnKey,
    byId: Map<number, T>,
    byName: Map<string, T[]>,
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
    const matches = byName.get(normalizeText(name));
    if (!matches) {
      push(
        nameKey,
        byName.size > 0
          ? `"${name}" không khớp ${label} nào. Xem sheet "Danh mục" để chọn đúng.`
          : `Chưa có ${label} nào trong hệ thống.`,
      );
      return null;
    }
    if (matches.length > 1) {
      push(
        nameKey,
        `"${name}" khớp nhiều ${label} — thêm (id) vào sau tên, ví dụ "${name} (${matches[0].id})". Xem sheet "Danh mục".`,
      );
      return null;
    }
    return matches[0].id;
  }

  /** Địa lý phân cấp (Miền/Tỉnh/Phường) — cùng cách giải như droplist thường. */
  private resolveGeo(
    rawText: string,
    nameKey: ColumnKey,
    label: string,
    byId: Map<number, GeoRef>,
    byName: Map<string, GeoRef[]>,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    return this.resolveDroplist(rawText, nameKey, byId, byName, label, push);
  }

  /** Cấp con phải thuộc đúng cấp cha đã chọn (cả 2 cùng được điền). */
  private assertGeoChain(
    childKey: ColumnKey,
    childLabel: string,
    childId: number | null,
    actualParentId: number | null,
    parentKey: ColumnKey,
    parentLabel: string,
    parentId: number | null,
    push: (key: ColumnKey, message: string) => void,
  ): void {
    if (childId === null || parentId === null) return;
    if (actualParentId !== parentId) {
      push(
        childKey,
        `${childLabel} đã chọn không thuộc ${parentLabel} đã chọn. Kiểm tra lại cột "${COLUMN_BY_KEY[parentKey].header}".`,
      );
    }
  }

  /** Quản lý: ưu tiên "(id)", rồi tên đăng nhập (duy nhất), rồi họ tên. */
  private resolveManager(
    rawText: string,
    lookup: ReferenceLookups,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!rawText) return null;
    const { name, id } = splitNameId(rawText);
    if (id !== null) {
      if (!lookup.managersById.has(id)) {
        push(
          'managerName',
          `"${rawText}" có (id) #${id} không tồn tại. Xem sheet "Danh mục" để copy đúng.`,
        );
        return null;
      }
      return id;
    }
    const byAccount = lookup.managersByAccount.get(normalizeText(name));
    if (byAccount) {
      if (byAccount.length > 1) {
        push(
          'managerName',
          `"${name}" khớp nhiều tài khoản — thêm (id) vào sau tên. Xem sheet "Danh mục".`,
        );
        return null;
      }
      return byAccount[0].id;
    }
    const byFull = lookup.managersByFullName.get(normalizeText(name));
    if (!byFull) {
      push(
        'managerName',
        `"${name}" không khớp tài khoản nào. Xem sheet "Danh mục" để chọn đúng tên đăng nhập.`,
      );
      return null;
    }
    if (byFull.length > 1) {
      push(
        'managerName',
        `"${name}" khớp nhiều người — thêm (id) vào sau tên, ví dụ "${name} (${byFull[0].id})". Xem sheet "Danh mục".`,
      );
      return null;
    }
    return byFull[0].id;
  }

  /** Trạng thái: nhận tên tiếng Việt hoặc mã (ACTIVE...). */
  private resolveStatus<T extends string>(
    rawText: string,
    nameKey: ColumnKey,
    labels: Record<T, string>,
    push: (key: ColumnKey, message: string) => void,
  ): T | null {
    if (!rawText) return null;
    const codes = Object.keys(labels) as T[];
    const upper = rawText.trim().toUpperCase();
    if ((codes as string[]).includes(upper)) return upper as T;
    const wanted = normalizeText(rawText);
    const found = codes.find((code) => normalizeText(labels[code]) === wanted);
    if (!found) {
      const valid = codes.map((code) => `"${labels[code]}"`).join(', ');
      push(
        nameKey,
        `"${rawText}" không hợp lệ. Giá trị đúng: ${valid}.`,
      );
      return null;
    }
    return found;
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

  private resolveInt(
    value: string,
    key: ColumnKey,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!value) return null;
    const parsed = parseIntValue(value);
    if (parsed.error) {
      push(key, parsed.error);
      return null;
    }
    return parsed.value ?? null;
  }

  private resolveDecimal(
    value: string,
    key: ColumnKey,
    push: (key: ColumnKey, message: string) => void,
  ): number | null {
    if (!value) return null;
    const parsed = parseQuantityValue(value);
    if (parsed.error) {
      push(key, parsed.error);
      return null;
    }
    return parsed.quantity ?? null;
  }
}

function orNull(value: string): string | null {
  return value ? value : null;
}

function toNumber(value: unknown): number | '' {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  return Number.isNaN(num) ? '' : num;
}

/** Vị trí cột (1-based) trong sheet dữ liệu theo key — tránh ghi số cứng. */
function columnIndex(key: ColumnKey): number {
  return COLUMNS.findIndex((col) => col.key === key) + 1;
}
