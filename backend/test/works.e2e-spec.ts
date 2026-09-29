/**
 * E2E khí nghiệp vụ công việc (works) trên server đang chạy.
 *
 *   PORT=3311 node dist/main.js &
 *   E2E_API=http://localhost:3311/api pnpm test:e2e
 *
 * Không set E2E_API thì bộ test bị skip.
 */
import { beforeAll, describe, expect, it } from 'vitest';

const API = process.env.E2E_API;
const ADMIN_ACCOUNT = process.env.E2E_ADMIN_ACCOUNT ?? 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';

interface Result<T = any> {
  status: number;
  body: T;
}

async function call<T = any>(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
): Promise<Result<T>> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: body as T };
}

async function login(account: string, password: string): Promise<string> {
  const { body } = await call('POST', '/auth/login', { body: { account, password } });
  expect(body?.accessToken, `đăng nhập ${account}`).toBeTruthy();
  return body.accessToken as string;
}

const stamp = Date.now().toString().slice(-6);

describe.skipIf(!API)('Công việc end-to-end', () => {
  let admin = '';
  let staff = '';
  let outsider = '';
  let staffId = 0;
  let outsiderId = 0;
  let categoryId = 0;
  let openStatusId = 0;
  let doneStatusId = 0;

  beforeAll(async () => {
    admin = await login(ADMIN_ACCOUNT, ADMIN_PASSWORD);

    // 2 user: 1 nhân viên được giao việc, 1 người ngoài cuộc
    const staffName = `wrk${stamp}`;
    const staffCreated = await call('POST', '/users', {
      token: admin,
      body: { accountName: staffName, email: `${staffName}@emd.local`, password: 'Nv@12345' },
    });
    expect(staffCreated.status).toBe(201);
    staffId = staffCreated.body.id;

    const outsiderName = `out${stamp}`;
    const outsiderCreated = await call('POST', '/users', {
      token: admin,
      body: {
        accountName: outsiderName,
        email: `${outsiderName}@emd.local`,
        password: 'Nv@12345',
      },
    });
    outsiderId = outsiderCreated.body.id;

    const categories = await call('GET', '/workflow/categories', { token: admin });
    categoryId = categories.body[0].id;
    const statuses = await call('GET', `/workflow/statuses?categoryId=${categoryId}`, {
      token: admin,
    });
    const list = statuses.body as { id: number; code: string; isClosed: boolean }[];
    openStatusId = (list.find((s) => !s.isClosed) ?? list[0]).id;
    doneStatusId = (list.find((s) => s.code === 'HOAN_THANH') ?? list[list.length - 1]).id;

    staff = await login(staffName, 'Nv@12345');
    outsider = await login(outsiderName, 'Nv@12345');
  }, 60_000);

  async function createWork(token: string, extra: Record<string, unknown> = {}) {
    const { status, body } = await call('POST', '/workflow/works', {
      token,
      body: {
        title: `Công việc E2E ${stamp}`,
        description: 'Kiểm tra nghiệp vụ',
        categoryId,
        statusId: openStatusId,
        handlerIds: [staffId],
        ...extra,
      },
    });
    expect(status, `tạo công việc: ${JSON.stringify(body)}`).toBe(201);
    return body as {
      id: number;
      statusId: number | null;
      progress: number;
      completedAt: string | null;
      handlers: { id: number }[];
    };
  }

  it('tạo công việc: gắn đúng người giao/người thực hiện, ghi lịch sử khởi tạo', async () => {
    const work = await createWork(admin);
    expect(work.handlers.map((h) => h.id)).toEqual([staffId]);

    const me = await call('GET', '/auth/me', { token: admin });
    const detail = await call('GET', `/workflow/works/${work.id}`, { token: admin });
    expect(detail.body.assignerId).toBe(me.body.id);

    const history = await call('GET', `/workflow/works/${work.id}/history`, { token: admin });
    expect(history.status).toBe(200);
    // fromStatus = null (lúc tạo), toStatus = trạng thái đầu tiên
    expect(history.body).toHaveLength(1);
    expect(history.body[0].fromStatusId).toBeNull();
    expect(history.body[0].toStatusId).toBe(openStatusId);
  });

  it('từ chối dữ liệu sai: ngày kết thúc trước ngày bắt đầu', async () => {
    const { status } = await call('POST', '/workflow/works', {
      token: admin,
      body: {
        title: 'Công việc sai ngày',
        categoryId,
        startDate: '2026-05-10',
        endDate: '2026-05-01',
      },
    });
    expect(status).toBe(400);
  });

  it('từ chối gán người thực hiện không tồn tại', async () => {
    const { status, body } = await call('POST', '/workflow/works', {
      token: admin,
      body: {
        title: 'Công việc sai người thực hiện',
        categoryId,
        handlerIds: [999_999],
      },
    });
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toContain('Người thực hiện');
  });

  it('loại trùng id người thực hiện khi cập nhật', async () => {
    const work = await createWork(admin);
    const { status, body } = await call('PATCH', `/workflow/works/${work.id}`, {
      token: admin,
      body: { handlerIds: [staffId, staffId] },
    });
    expect(status).toBe(200);
    expect(body.handlers).toHaveLength(1);
  });

  it('quyền xem: người ngoài cuộc bị chặn, danh sách không lộ việc của người khác', async () => {
    const work = await createWork(admin);
    const denied = await call('GET', `/workflow/works/${work.id}`, { token: outsider });
    expect(denied.status).toBe(403);

    const list = await call('GET', '/workflow/works?scope=all&limit=100', { token: outsider });
    expect(list.status).toBe(200);
    expect(list.body.data.map((w: { id: number }) => w.id)).not.toContain(work.id);
  });

  it('người thực hiện được xem và sửa công việc được giao', async () => {
    const work = await createWork(admin);
    const detail = await call('GET', `/workflow/works/${work.id}`, { token: staff });
    expect(detail.status).toBe(200);

    const updated = await call('PATCH', `/workflow/works/${work.id}`, {
      token: staff,
      body: { description: 'Đã cập nhật bởi người thực hiện' },
    });
    expect(updated.status).toBe(200);
  });

  it('người thực hiện không xoá được công việc (chỉ người giao/ADMIN)', async () => {
    const work = await createWork(admin);
    const removed = await call('DELETE', `/workflow/works/${work.id}`, { token: staff });
    expect(removed.status).toBe(403);
  });

  it('đổi sang trạng thái hoàn thành tự đặt progress = 100 và completedAt', async () => {
    const work = await createWork(admin);
    const { status, body } = await call('PATCH', `/workflow/works/${work.id}`, {
      token: admin,
      body: { statusId: doneStatusId, statusNote: 'Đã xong' },
    });
    expect(status).toBe(200);
    expect(body.progress).toBe(100);
    expect(body.completedAt).toBeTruthy();
    expect(body.statusId).toBe(doneStatusId);

    const history = await call('GET', `/workflow/works/${work.id}/history`, { token: admin });
    expect(history.body).toHaveLength(2);
    expect(history.body[0].toStatusId).toBe(doneStatusId);
    expect(history.body[0].note).toBe('Đã xong');
  });

  it('chặn đặt progress = 100 khi trạng thái chưa kết thúc', async () => {
    const work = await createWork(admin);
    const { status, body } = await call('PATCH', `/workflow/works/${work.id}`, {
      token: admin,
      body: { statusId: openStatusId, progress: 100 },
    });
    expect(status).toBe(400);
    expect(JSON.stringify(body)).toContain('tiến độ 100');
  });

  it('việc đã kết thúc chỉ ADMIN mới mở lại được', async () => {
    const work = await createWork(admin);
    await call('PATCH', `/workflow/works/${work.id}`, {
      token: admin,
      body: { statusId: doneStatusId },
    });
    const byStaff = await call('PATCH', `/workflow/works/${work.id}`, {
      token: staff,
      body: { statusId: openStatusId },
    });
    expect(byStaff.status).toBe(403);

    const byAdmin = await call('PATCH', `/workflow/works/${work.id}`, {
      token: admin,
      body: { statusId: openStatusId },
    });
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.completedAt).toBeNull();
  });

  it('trạng thái đóng kiểu từ chối/hủy: giữ tiến độ nhưng vẫn ghi completedAt', async () => {
    // Bỏ qua nếu bộ status hiện tại không có trạng thái đóng kiểu từ chối/hủy.
    const categories = await call('GET', '/workflow/categories', { token: admin });
    let found: { categoryId: number; statusId: number; openStatusId: number } | null = null;
    for (const category of categories.body as { id: number }[]) {
      const res = await call('GET', `/workflow/statuses?categoryId=${category.id}`, {
        token: admin,
      });
      const list = res.body as { id: number; code: string; isClosed: boolean }[];
      const match = list.find((s) => s.isClosed && s.code !== 'HOAN_THANH');
      const open = list.find((s) => !s.isClosed);
      if (match && open) {
        found = { categoryId: category.id, statusId: match.id, openStatusId: open.id };
        break;
      }
    }
    if (!found) return;

    const work = await createWork(admin, {
      categoryId: found.categoryId,
      statusId: found.openStatusId,
    });
    const { status, body } = await call('PATCH', `/workflow/works/${work.id}`, {
      token: admin,
      body: { statusId: found.statusId, progress: 40 },
    });
    expect(status).toBe(200);
    expect(body.progress).toBe(40);
    expect(body.completedAt).toBeTruthy();
  });

  it('xoá mềm và khôi phục: bản đã xoá không hiện trong danh sách', async () => {
    const work = await createWork(admin);
    const removed = await call('DELETE', `/workflow/works/${work.id}`, { token: admin });
    expect(removed.status).toBe(200);

    const detail = await call('GET', `/workflow/works/${work.id}`, { token: admin });
    expect(detail.status).toBe(404);

    const active = await call('GET', '/workflow/works?limit=100', { token: admin });
    expect(active.body.data.map((w: { id: number }) => w.id)).not.toContain(work.id);

    const restored = await call('POST', `/workflow/works/${work.id}/restore`, { token: admin });
    expect(restored.status).toBe(201);

    const back = await call('GET', `/workflow/works/${work.id}`, { token: admin });
    expect(back.status).toBe(200);
  });

  it('checklist: không cho tạo vòng lặp cha-con', async () => {
    const work = await createWork(admin);
    const parent = await call('POST', '/workflow/checklists', {
      token: admin,
      body: { workId: work.id, title: 'Cha' },
    });
    expect(parent.status).toBe(201);
    const child = await call('POST', '/workflow/checklists', {
      token: admin,
      body: { workId: work.id, title: 'Con', parentId: parent.body.id },
    });
    expect(child.status).toBe(201);

    // Chọn chính "Con" làm cha của "Cha" -> vòng lặp
    const cycle = await call('PATCH', `/workflow/checklists/${parent.body.id}`, {
      token: admin,
      body: { parentId: child.body.id },
    });
    expect(cycle.status).toBe(400);
    expect(JSON.stringify(cycle.body)).toContain('vòng lặp');
    void outsiderId;
  });
});
