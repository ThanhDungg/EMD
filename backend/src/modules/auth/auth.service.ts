import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PasswordService } from '../../common/crypto/index.js';
import { highestRankOf } from '../permissions/permissions.constants.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';

const INVALID_CREDENTIALS = 'Tài khoản hoặc mật khẩu không đúng.';

// jsonwebtoken chấp nhận '15m', '7d'... — ép kiểu string env về dạng này
type ExpiresIn = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

function toExpiresIn(value: string | undefined, fallback: ExpiresIn): ExpiresIn {
  return (value ?? fallback) as ExpiresIn;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private signAccess(userId: number, accountName: string) {
    return this.jwt.signAsync(
      { sub: userId, accountName },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: toExpiresIn(this.config.get<string>('jwt.expiresIn'), '15m'),
      },
    );
  }

  private signRefresh(userId: number) {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: toExpiresIn(this.config.get<string>('jwt.refreshExpiresIn'), '7d'),
      },
    );
  }

  // Đăng nhập: nhận accountName hoặc email + mật khẩu
  async login(dto: LoginDto) {
    const user = await this.usersService.findActiveByAccount(dto.account.trim());
    // Không phân biệt "sai tài khoản" / "sai mật khẩu" để chống dò tài khoản
    const ok = user
      ? await this.passwordService.compare(dto.password, user.password)
      : false;
    if (!user || !ok) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccess(user.id, user.accountName),
      this.signRefresh(user.id),
    ]);
    // Chỉ lưu hash refresh token (xoay vòng mỗi lần refresh, thu hồi khi logout)
    await this.usersService.setRefreshTokenHash(
      user.id,
      await bcrypt.hash(refreshToken, 10),
    );

    const { password: _p, refreshTokenHash: _r, ...safeUser } = user;
    return { accessToken, refreshToken, user: safeUser };
  }

  // Cấp lại cặp token bằng refresh token (xoay vòng: refresh cũ hết hiệu lực)
  async refresh(refreshToken: string) {
    let userId: number;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    const user = await this.usersService.findActiveById(userId);
    const stored = user?.refreshTokenHash;
    if (!user || !stored || !(await bcrypt.compare(refreshToken, stored))) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      this.signAccess(user.id, user.accountName),
      this.signRefresh(user.id),
    ]);
    await this.usersService.setRefreshTokenHash(
      user.id,
      await bcrypt.hash(newRefreshToken, 10),
    );
    return { accessToken, refreshToken: newRefreshToken };
  }

  // Đăng xuất: thu hồi refresh token
  async logout(userId: number) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }

  // Thông tin tôi + quyền gộp từ group + rank cao nhất (FE dùng để ẩn/hiện menu)
  async me(userId: number) {
    const user = await this.usersService.findOne(userId);
    const permissionCodes = [
      ...new Set(user.groups.flatMap((g) => g.permissions.map((p) => p.code))),
    ];
    return { ...user, permissionCodes, highestRank: highestRankOf(permissionCodes) };
  }
}
