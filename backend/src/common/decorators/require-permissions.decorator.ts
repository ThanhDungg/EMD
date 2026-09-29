import { SetMetadata } from '@nestjs/common';

// Yêu cầu 1 trong các quyền (OR) — quyền lấy từ group của user.
// Vd: @RequirePermissions('ADMIN') hoặc @RequirePermissions('ADMIN', 'CEO')
export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, codes);
