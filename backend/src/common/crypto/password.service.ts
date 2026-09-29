import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

// Chuẩn quốc tế cho mật khẩu: bcrypt (salt tự sinh theo rounds) + pepper từ env.
// Pepper là key mã hoá nằm trong env, khác nhau giữa các môi trường.
@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  private get pepper(): string {
    return this.config.get<string>('security.passwordPepper') ?? 'dev_pepper';
  }

  private get rounds(): number {
    return this.config.get<number>('security.bcryptRounds') ?? 10;
  }

  hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword + this.pepper, this.rounds);
  }

  compare(plainPassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainPassword + this.pepper, hash);
  }
}
