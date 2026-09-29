// Toán lịch lặp (pure functions, không DB — dễ unit test).
// Mọi ngày tính theo UTC-midnight (Date.UTC) để khớp cột @db.Date của Postgres:
// tránh lệch 1 ngày khi server/FE khác múi giờ. Thứ 2 = 1 ... Chủ nhật = 7 (ISO).

export type Frequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type QuarterlyMode = 'START_OF_QUARTER' | 'END_OF_QUARTER';

export interface RecurrenceRule {
  frequency: Frequency;
  weekdays: number[];
  monthDays: number[];
  quarterlyMode: QuarterlyMode | null;
  yearMonth: number | null;
  yearDay: number | null;
}

const DAY_MS = 86_400_000;

/** Cắt giờ, giữ ngày UTC (khớp @db.Date, tránh lệch múi giờ). */
export function toDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoWeekday(d: Date): number {
  return ((d.getUTCDay() + 6) % 7) + 1;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

function validDate(year: number, month0: number, day: number): Date | null {
  if (day < 1 || day > daysInMonth(year, month0)) return null;
  return new Date(Date.UTC(year, month0, day));
}

/**
 * Ngày lặp kế tiếp SAU `after` (không bao gồm `after`).
 * Trả null khi rule không bao giờ ra ngày nữa (VD YEARLY thiếu field).
 */
export function computeNextRun(rule: RecurrenceRule, after: Date): Date | null {
  const base = toDay(after).getTime();

  if (rule.frequency === 'WEEKLY') {
    const days = [...new Set(rule.weekdays)].filter((w) => w >= 1 && w <= 7);
    if (days.length === 0) return null;
    for (let i = 1; i <= 7; i += 1) {
      const cand = new Date(base + i * DAY_MS);
      if (days.includes(isoWeekday(cand))) return cand;
    }
    return null;
  }

  if (rule.frequency === 'MONTHLY') {
    const days = [...new Set(rule.monthDays)].filter((d) => d >= 1 && d <= 31).sort((a, b) => a - b);
    if (days.length === 0) return null;
    const y0 = new Date(base).getUTCFullYear();
    const m0 = new Date(base).getUTCMonth();
    for (let off = 0; off < 13; off += 1) {
      const yy = y0 + Math.floor((m0 + off) / 12);
      const mm = (m0 + off) % 12;
      for (const day of days) {
        const cand = validDate(yy, mm, day);
        if (cand && cand.getTime() > base) return cand;
      }
    }
    return null;
  }

  if (rule.frequency === 'QUARTERLY') {
    if (!rule.quarterlyMode) return null;
    const ref = new Date(base);
    const startQ = Math.floor(ref.getUTCMonth() / 3);
    for (let off = 0; off < 9; off += 1) {
      const q = startQ + off;
      const yy = ref.getUTCFullYear() + Math.floor(q / 4);
      const firstMonth = (q % 4) * 3;
      const cand =
        rule.quarterlyMode === 'START_OF_QUARTER'
          ? new Date(Date.UTC(yy, firstMonth, 1))
          : new Date(Date.UTC(yy, firstMonth + 3, 0)); // ngày cuối quý
      if (cand.getTime() > base) return cand;
    }
    return null;
  }

  // YEARLY: 1 ngày cố định mỗi năm (29/2 chỉ rơi vào năm nhuận — năm thường bỏ qua)
  if (rule.yearMonth == null || rule.yearDay == null) return null;
  const y0 = new Date(base).getUTCFullYear();
  for (let off = 0; off < 7; off += 1) {
    const cand = validDate(y0 + off, rule.yearMonth - 1, rule.yearDay);
    if (cand && cand.getTime() > base) return cand;
  }
  return null;
}

/** Liệt kê `count` ngày lặp kế tiếp từ `from` (from exclusive). Dừng ở endDate. */
export function previewOccurrences(
  rule: RecurrenceRule,
  from: Date,
  count = 10,
  endDate?: Date | null,
): Date[] {
  const out: Date[] = [];
  let cursor = toDay(from);
  const end = endDate ? toDay(endDate).getTime() : null;
  const safeCount = Math.min(Math.max(count, 1), 50);
  for (let i = 0; i < safeCount; i += 1) {
    const next = computeNextRun(rule, cursor);
    if (!next) break;
    if (end !== null && next.getTime() > end) break;
    out.push(next);
    cursor = next;
  }
  return out;
}
