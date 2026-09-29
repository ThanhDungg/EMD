import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Prisma 7 yêu cầu driver adapter cho PostgreSQL (lấy connection string từ env)
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString:
          config.get<string>('database.url') ?? process.env.DATABASE_URL ?? '',
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
