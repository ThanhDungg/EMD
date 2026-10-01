import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Prisma 7 yêu cầu driver adapter cho PostgreSQL (lấy connection string từ env)
  constructor(config: ConfigService) {
    const connectionString =
      config.get<string>('database.url') ?? process.env.DATABASE_URL ?? '';
    // Supabase session-pooler giới hạn ~15 connections (pool_size: 15) dùng
    // chung cho mọi client. pg Pool mặc định max=10/instance nên 1-2 instance
    // là cạn pool (EMAXCONNSESSION). Giới hạn còn max=3 để luôn đủ slot cho
    // query song song (count + findMany) mà không chiếm hết pool.
    const pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    });
    super({ adapter: new PrismaPg(pool) });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
