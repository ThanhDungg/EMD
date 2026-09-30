// Helper đọc/ghi .xlsx dùng chung cho các module import Excel.
// Chỉ chứa hàm thuần tuý, không phụ thuộc Prisma hay Nest.
import type { Cell, Workbook } from 'exceljs';

/** Bỏ dấu + gộp khoảng trắng + hạ chữ thường, để so khớp tên không nhạy cảm. */
export function normalizeText(value: string): string {
  return value
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Định dạng ngày kiểu Việt Nam dd/MM/yyyy. */
export function formatDateVi(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
}

/** Đọc giá trị ô về chuỗi, xử lý rich-text / công thức / date. */
export function cellText(cell: Cell | undefined): string {
  if (!cell) return '';
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return formatDateVi(value);
  if (typeof value === 'object') {
    if ('text' in value && value.text !== undefined) {
      return String(value.text).trim();
    }
    if ('result' in value && value.result !== undefined) {
      return String(value.result).trim();
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim();
    }
    return '';
  }
  return String(value).trim();
}

export interface ParsedDate {
  date?: Date;
  error?: string;
}

/** Chấp nhận Date của Excel, số serial, dd/MM/yyyy, yyyy-MM-dd. */
export function parseDateValue(raw: unknown): ParsedDate {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return { error: 'Ngày không hợp lệ.' };
    return { date: raw };
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Excel serial có gốc 30/12/1899 (do lỗi năm nhuận 1900).
    return {
      date: new Date(Date.UTC(1899, 11, 30) + Math.round(raw) * 86_400_000),
    };
  }

  const text = String(raw ?? '').trim();
  if (!text) return {};

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(text);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (year < 1900 || year > 9999) {
      return { error: `"${text}" không phải ngày hợp lệ.` };
    }
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return { error: `"${text}" không phải ngày hợp lệ.` };
    }
    return { date };
  }

  const iso = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/.exec(text);
  if (iso) {
    const date = new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
    );
    if (Number.isNaN(date.getTime())) {
      return { error: `"${text}" không phải ngày hợp lệ.` };
    }
    return { date };
  }

  return { error: `"${text}" không phải ngày hợp lệ, cần định dạng dd/MM/yyyy.` };
}

/** Số lượng: chấp nhận "12", "1.5", "1,5". Trả về đã làm tròn về 2 chữ số. */
export function parseQuantityValue(raw: string): {
  quantity?: number;
  error?: string;
} {
  const text = raw.replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return { error: `"${raw}" không phải số hợp lệ.` };
  }
  const value = Number(text);
  if (Number.isNaN(value) || value < 0) {
    return { error: 'Số lượng phải là số lớn hơn hoặc bằng 0.' };
  }
  return { quantity: Math.round(value * 100) / 100 };
}

/** Số nguyên không âm (thứ tự, stt). Trả null nếu để trống. */
export function parseIntValue(raw: string): {
  value?: number;
  error?: string;
} {
  const text = raw.replace(/\s/g, '');
  if (!text) return {};
  if (!/^\d+$/.test(text)) return { error: `"${raw}" phải là số nguyên.` };
  return { value: Number(text) };
}

/**
 * Ô ID. Trả `value: null` khi để trống — import sẽ ưu tiên ID, nhưng để trống
 * thì quay sang khớp theo tên. Ô ghi sai định dạng là lỗi chứ không phải "trống".
 */
export function parseIdValue(raw: string): {
  value?: number | null;
  error?: string;
} {
  const text = raw.replace(/\s/g, '');
  if (!text) return { value: null };
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    return { error: `"${raw}" không phải ID hợp lệ (số nguyên từ 1).` };
  }
  return { value: Number(text) };
}

/**
 * Ô tham chiếu dạng "Tên (id)" — ví dụ "Phòng kế toán (12)".
 * Chỉ nhận "(số)" ở CUỐI chuỗi; tên có ngoặc khác (VD "Máy bơm (2HP)")
 * vẫn là tên thuần. Trả `id: null` khi không có hậu tố.
 */
const NAME_ID_SUFFIX = /^(.*?)\s*\(\s*(\d+)\s*\)\s*$/;

export function splitNameId(value: string): {
  name: string;
  id: number | null;
} {
  const text = value.trim();
  const matched = NAME_ID_SUFFIX.exec(text);
  if (!matched) return { name: text, id: null };
  return { name: matched[1].trim(), id: Number(matched[2]) };
}

/** Ghép "Tên (id)" để xuất file / gợi ý dropdown. Chưa có id thì giữ tên. */
export function withIdSuffix(
  name: string,
  id: number | null | undefined,
): string {
  if (id == null) return name;
  return `${name} (${id})`;
}

/** 1 -> A, 2 -> B, 27 -> AA (dùng cho data validation trỏ tới sheet khác). */
export function columnLetter(index: number): string {
  let letter = '';
  let value = index;
  while (value > 0) {
    const rest = (value - 1) % 26;
    letter = String.fromCharCode(65 + rest) + letter;
    value = Math.floor((value - 1) / 26);
  }
  return letter;
}

/** Tách đường dẫn "Tầng 1 > Hành chính" thành các cấp. */
export function splitPath(value: string): string[] {
  return value
    .split(/\s*(?:>|\/|»|›)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/**
 * Dựng payload lỗi 400 dạng danh sách lỗi theo dòng — frontend hiển thị bảng
 * lỗi để người dùng sửa file. Giới hạn 50 dòng cho response không phình to.
 * Gọi kèm `new BadRequestException(buildImportError(...))`.
 */
export function buildImportError(
  message: string,
  errors: Array<{ row: number; column: string; message: string }>,
) {
  const shown = errors.slice(0, 50);
  return {
    message,
    errors: shown,
    hiddenErrorCount: Math.max(0, errors.length - shown.length),
  };
}

export interface CascadeSite {
  id: number;
  name: string;
}

export interface CascadeLocation {
  id: number;
  name: string;
  siteId: number;
  parentId: number | null;
}

export interface CascadeLists {
  /** Tên range chứa ID các dự án (dòng 1 của sheet ẩn). */
  siteIdsName: string;
  /** Tên range chứa tên các dự án (dòng 2 của sheet ẩn). */
  siteNamesName: string;
  /**
   * Công thức dropdown cho ô vị trí ở `row`, lọc theo dự án cùng dòng.
   * `idCol`/`nameCol` là chữ cột (VD 'B', 'C') của "ID dự án"/"Dự án".
   * Người dùng điền 1 trong 2 cột là dropdown vị trí lọc đúng.
   */
  locationFormula: (idCol: string, nameCol: string, row: number) => string;
  /**
   * Công thức dropdown cho ô vị trí ở `row`, chỉ lọc theo cột TÊN dự án
   * (dùng khi file không còn cột "ID dự án").
   */
  locationFormulaByName: (nameCol: string, row: number) => string;
  /** Công thức dropdown cho cột "Dự án" (tên). */
  siteNameFormula: string;
}

/**
 * Tạo sheet ẩn `_lists` + named ranges để làm dropdown LIÊN KẾT Dự án → Vị trí:
 * - Dòng 1: ID dự án | Dòng 2: tên dự án | từ dòng 3: đường dẫn vị trí mỗi site.
 * - `SITE_IDS`, `SITE_NAMES`, `LOC_1..LOC_n` (theo thứ tự site).
 *
 * Vì tên dự án tiếng Việt có dấu/cách nên không đặt thẳng làm tên range được —
 * dropdown vị trí dùng `INDIRECT("LOC_"&MATCH(...))` để tra vị trí thứ mấy.
 * Đường dẫn vị trí KHÔNG kèm tên dự án (đã lọc theo site nên không cần).
 */
export function addCascadeLists(
  workbook: Workbook,
  sites: CascadeSite[],
  locations: CascadeLocation[],
  options?: {
    /** Chuỗi hiện trong dropdown "Dự án" — mặc định tên thuần. */
    siteLabel?: (site: CascadeSite) => string;
  },
): CascadeLists | null {
  if (sites.length === 0) return null;

  const label = options?.siteLabel ?? ((site) => site.name);

  const sheet = workbook.addWorksheet('_lists');
  sheet.state = 'hidden';

  const byParent = new Map<number, CascadeLocation[]>();
  for (const item of locations) {
    const key = item.parentId ?? 0;
    const list = byParent.get(key);
    if (list) list.push(item);
    else byParent.set(key, [item]);
  }
  const pathsOf = (siteId: number): string[] => {
    const out: string[] = [];
    const walk = (parentId: number | null, prefix: string) => {
      for (const item of byParent.get(parentId ?? 0) ?? []) {
        if (item.siteId !== siteId) continue;
        const full = prefix ? `${prefix} > ${item.name}` : item.name;
        out.push(full);
        walk(item.id, full);
      }
    };
    walk(null, '');
    return out;
  };

  const definedNames = workbook.definedNames;
  sites.forEach((site, index) => {
    const col = columnLetter(index + 1);
    sheet.getCell(`${col}1`).value = site.id;
    sheet.getCell(`${col}2`).value = label(site);
    const paths = pathsOf(site.id);
    paths.forEach((path, rowIndex) => {
      sheet.getCell(`${col}${rowIndex + 3}`).value = path;
    });
    if (paths.length > 0) {
      definedNames.add(
        `_lists!$${col}$3:$${col}$${paths.length + 2}`,
        `LOC_${index + 1}`,
      );
    } else {
      // Site chưa có vị trí: trỏ vào ô tên để dropdown rỗng chứ không lỗi name.
      definedNames.add(`_lists!$${col}$2:$${col}$2`, `LOC_${index + 1}`);
    }
  });

  const lastCol = columnLetter(sites.length);
  definedNames.add(`_lists!$A$1:$${lastCol}$1`, 'SITE_IDS');
  definedNames.add(`_lists!$A$2:$${lastCol}$2`, 'SITE_NAMES');

  return {
    siteIdsName: 'SITE_IDS',
    siteNamesName: 'SITE_NAMES',
    siteNameFormula: 'SITE_NAMES',
    locationFormula: (idCol: string, nameCol: string, row: number) =>
      `INDIRECT("LOC_"&IF($${idCol}${row}<>"",MATCH($${idCol}${row},SITE_IDS,0),MATCH($${nameCol}${row},SITE_NAMES,0)))`,
    locationFormulaByName: (nameCol: string, row: number) =>
      `INDIRECT("LOC_"&MATCH($${nameCol}${row},SITE_NAMES,0))`,
  };
}
