import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { REQUIRE_PERMISSIONS_KEY } from '../../common/decorators/require-permissions.decorator.js';
import { highestRankOf } from '../permissions/permissions.constants.js';
import { UsersService } from '../users/users.service.js';

// Chuẩn quốc tế: mọi request mang header "Authorization: Bearer <accessToken>".
// Route gắn @Public() được bỏ qua. Route gắn @RequirePermissions(...) thì
// guard nạp quyền từ group của user (tạo account → thêm vào group → có quyền)
// và từ chối khi thiếu. Áp dụng toàn cục trong AppModule.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu access token.');
    }

    let payload: { sub: number; accountName: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ hoặc đã hết hạn.');
    }

    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];

    // Nạp quyền hiện tại từ group (luôn gắn để handler dùng, kể cả khi không yêu cầu)
    const user = await this.usersService.findOne(payload.sub).catch(() => null);
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xoá.');
    }
    const permissions = [
      ...new Set(user.groups.flatMap((g) => g.permissions.map((p) => p.code))),
    ];
    req.user = {
      sub: payload.sub,
      accountName: payload.accountName,
      permissions,
      rank: highestRankOf(permissions),
    };

    if (required.length > 0 && !required.some((code) => permissions.includes(code))) {
      throw new ForbiddenException('Không có quyền truy cập.');
    }
    return true;
  }
}
