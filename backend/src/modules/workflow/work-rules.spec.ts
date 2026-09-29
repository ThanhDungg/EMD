import { describe, expect, it } from 'vitest';
import {
  canDeleteWork,
  canEditWork,
  canViewWork,
  dedupeIds,
  isCompletionStatus,
  resolveStatusChange,
  roleOf,
  validateWorkDates,
  type StatusSnapshot,
} from './work-rules.js';

const work = { assignerId: 1, handlerIds: [2, 3], followerIds: [4] };

const OPEN: StatusSnapshot = { id: 10, code: 'DANG_XU_LY', isClosed: false };
const DONE: StatusSnapshot = { id: 11, code: 'HOAN_THANH', isClosed: true };
const REJECTED: StatusSnapshot = { id: 12, code: 'TU_CHOI', isClosed: true };

describe('roleOf + quyền theo vai trò (§4.11)', () => {
  it('admin được quyền cao nhất', () => {
    expect(roleOf(work, 99, true)).toBe('admin');
  });

  it('người giao > người thực hiện > người theo dõi > người ngoài cuộc', () => {
    expect(roleOf(work, 1)).toBe('assigner');
    expect(roleOf(work, 2)).toBe('handler');
    expect(roleOf(work, 4)).toBe('follower');
    expect(roleOf(work, 50)).toBe('outsider');
  });

  it('người theo dõi chỉ xem được, không sửa/xoá', () => {
    expect(canViewWork('follower')).toBe(true);
    expect(canEditWork('follower')).toBe(false);
    expect(canDeleteWork('follower')).toBe(false);
  });

  it('người ngoài cuộc không được xem/sửa/xoá', () => {
    expect(canViewWork('outsider')).toBe(false);
    expect(canEditWork('outsider')).toBe(false);
    expect(canDeleteWork('outsider')).toBe(false);
  });

  it('người giao và người thực hiện được xem + sửa', () => {
    for (const role of ['assigner', 'handler', 'admin'] as const) {
      expect(canViewWork(role)).toBe(true);
      expect(canEditWork(role)).toBe(true);
    }
  });

  it('chỉ người giao và admin được xoá (người thực hiện chỉ hoàn thành việc)', () => {
    expect(canDeleteWork('assigner')).toBe(true);
    expect(canDeleteWork('admin')).toBe(true);
    expect(canDeleteWork('handler')).toBe(false);
  });
});

describe('dedupeIds', () => {
  it('loại id trùng giữ nguyên thứ tự', () => {
    expect(dedupeIds([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
  });

  it('undefined thì giữ undefined (không ghi đè danh sách cũ)', () => {
    expect(dedupeIds(undefined)).toBeUndefined();
  });
});

describe('validateWorkDates', () => {
  it('ngày hợp lệ thì không có lỗi', () => {
    expect(
      validateWorkDates({
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-05T00:00:00.000Z',
        completedAt: '2026-01-05T10:00:00.000Z',
      }),
    ).toEqual([]);
  });

  it('chặn ngày kết thúc trước ngày bắt đầu', () => {
    expect(
      validateWorkDates({
        startDate: '2026-01-05T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z',
      }),
    ).toContain('Ngày kết thúc phải sau ngày bắt đầu.');
  });

  it('chặn hoàn thành trước khi bắt đầu', () => {
    expect(
      validateWorkDates({
        startDate: '2026-01-05T00:00:00.000Z',
        completedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toContain('Thời điểm hoàn thành phải sau ngày bắt đầu.');
  });

  it('chỉ cần 1 mốc thì không kiểm tra chéo', () => {
    expect(validateWorkDates({ endDate: '2020-01-01T00:00:00.000Z' })).toEqual([]);
    expect(validateWorkDates({})).toEqual([]);
  });
});

describe('isCompletionStatus', () => {
  it('trạng thái đóng kiểu hoàn thành', () => {
    expect(isCompletionStatus(DONE)).toBe(true);
  });

  it('trạng thái đóng kiểu từ chối/hủy không phải hoàn thành', () => {
    expect(isCompletionStatus(REJECTED)).toBe(false);
  });

  it('trạng thái đang xử lý thì không', () => {
    expect(isCompletionStatus(OPEN)).toBe(false);
  });
});

describe('resolveStatusChange - hoàn thành (§4.7, §12.5)', () => {
  const now = new Date('2026-09-25T08:00:00.000Z');

  it('chuyển sang trạng thái hoàn thành tự đặt progress = 100 và completedAt', () => {
    const result = resolveStatusChange({ current: OPEN, target: DONE, now });
    expect(result.progress).toBe(100);
    expect(result.completedAt).toBe(now.toISOString());
    expect(result.statusChanged).toBe(true);
  });

  it('chuyển sang trạng thái đóng không phải hoàn thành thì giữ tiến độ, vẫn ghi completedAt', () => {
    const result = resolveStatusChange({ current: OPEN, target: REJECTED, now });
    expect(result.progress).toBeNull();
    expect(result.completedAt).toBe(now.toISOString());
  });

  it('client tự truyền progress vẫn được dùng', () => {
    const result = resolveStatusChange({ current: OPEN, target: DONE, progress: 100, now });
    expect(result.progress).toBe(100);
  });

  it('chặn progress = 100 khi trạng thái chưa kết thúc', () => {
    expect(() =>
      resolveStatusChange({ current: OPEN, target: OPEN, progress: 100, now }),
    ).toThrow(/chưa kết thúc/i);
  });

  it('chặn progress khác 100 khi trạng thái là hoàn thành', () => {
    expect(() =>
      resolveStatusChange({ current: OPEN, target: DONE, progress: 60, now }),
    ).toThrow(/tiến độ phải là 100/i);
  });
});

describe('resolveStatusChange - trạng thái kết thúc là terminal', () => {
  const now = new Date('2026-09-25T08:00:00.000Z');

  it('người thường không mở lại được việc đã kết thúc', () => {
    expect(() => resolveStatusChange({ current: DONE, target: OPEN, now })).toThrow(
      /Chỉ ADMIN mới mở lại/i,
    );
  });

  it('ADMIN thì mở lại được và xoá completedAt', () => {
    const result = resolveStatusChange({
      current: DONE,
      target: OPEN,
      isAdmin: true,
      now,
    });
    expect(result.completedAt).toBeNull();
    expect(result.statusChanged).toBe(true);
  });

  it('trạng thái hoàn thành luôn đòi tiến độ 100 (kể cả khi không đổi trạng thái)', () => {
    const result = resolveStatusChange({ current: DONE, target: DONE, isAdmin: true, now });
    expect(result.progress).toBe(100);
    // completedAt = null nghĩa là service giữ nguyên (hàm chỉ được gọi khi
    // trạng thái thực sự đổi, lúc đó mới áp dụng giá trị trả về).
    expect(result.completedAt).toBeNull();
    expect(result.statusChanged).toBe(false);
  });
});
