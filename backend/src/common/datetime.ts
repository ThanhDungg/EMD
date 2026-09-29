// Chuẩn hoá chuỗi ngày từ DTO trước khi đưa vào Prisma.
// Prisma 7 query compiler chỉ nhận ISO-8601 đầy đủ (VD "2020-01-01T00:00:00.000Z"),
// trong khi DTO @IsDateString() cho phép cả ngày rút gọn ("2020-01-01").
// Không chuẩn hoá → Prisma ném "premature end of input. Expected ISO-8601 DateTime".
export function toDateTimeInput(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const time = new Date(value).getTime();
  // Chuỗi lỗi để nguyên cho ValidationPipe/Prisma báo lỗi chuẩn
  if (Number.isNaN(time)) return value;
  return new Date(time).toISOString();
}

// Tương tự toDateTimeInput nhưng cho cột kiểu DATE (@db.Date) — chỉ giữ
// phần ngày, ép nửa đêm UTC để không lệch ngày do múi giờ của client.
export function toDateOnly(
  value: string | null | undefined,
): Date | undefined {
  if (value === null || value === undefined) return undefined;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return undefined;
  return new Date(
    Date.UTC(
      new Date(time).getUTCFullYear(),
      new Date(time).getUTCMonth(),
      new Date(time).getUTCDate(),
    ),
  );
}
