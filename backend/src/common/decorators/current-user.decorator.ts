import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: number;
  accountName: string;
  // Quyền gộp từ các group (do JwtAuthGuard nạp) + rank cao nhất
  permissions: string[];
  rank: number;
}

// Lấy payload JWT đã verify từ request (do JwtAuthGuard gắn vào)
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return req.user;
  },
);
