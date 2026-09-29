/**
 * apiClient ném lỗi dạng `API <status>: <json>`. Hàm này bóc ra thông điệp
 * nghiệp vụ để hiển thị đúng lý do (VD "Ngày kết thúc phải sau ngày bắt đầu",
 * "Chỉ người giao hoặc ADMIN được xoá công việc") thay vì báo chung chung.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const match = raw.match(/^API\s+(\d+):\s*([\s\S]*)$/);
  const body = match?.[2];
  if (body) {
    try {
      const parsed = JSON.parse(body) as {
        message?: unknown;
        issues?: { path?: string; message?: string }[];
      };
      if (Array.isArray(parsed.issues) && parsed.issues.length > 0) {
        return parsed.issues
          .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
          .filter(Boolean)
          .join('; ');
      }
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message;
      }
      // message dạng object: { message, issues }
      const nested = parsed.message as { message?: string; issues?: { message?: string }[] };
      if (Array.isArray(nested?.issues) && nested.issues.length > 0) {
        return nested.issues
          .map((issue) => issue.message)
          .filter(Boolean)
          .join('; ');
      }
      if (typeof nested?.message === 'string' && nested.message.trim()) {
        return nested.message;
      }
      // message dạng object: { message: ["lỗi 1", "lỗi 2"] } (Nest validate)
      if (Array.isArray(nested?.message) && nested.message.length > 0) {
        return nested.message.filter(Boolean).join('; ');
      }
    } catch {
      // Không parse được JSON → dùng raw
    }
    if (body.trim() && body.length < 300) return body.trim();
  }
  return fallback;
}
