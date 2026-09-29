// Prisma 7 config chuẩn: schema + migrations + seed + datasource.
// Seed chạy thủ công qua `pnpm prisma:seed` (prisma db seed).
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
