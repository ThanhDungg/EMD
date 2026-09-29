/*
  Warnings:

  - You are about to drop the column `handler_id` on the `works` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "work_handlers" (
    "work_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_handlers_pkey" PRIMARY KEY ("work_id","user_id")
);

-- CreateIndex
CREATE INDEX "work_handlers_user_id_idx" ON "work_handlers"("user_id");

-- AddForeignKey
ALTER TABLE "work_handlers" ADD CONSTRAINT "work_handlers_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_handlers" ADD CONSTRAINT "work_handlers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill không mất data: chuyển handler đơn cũ sang bảng trung gian
INSERT INTO "work_handlers" ("work_id", "user_id")
SELECT "id", "handler_id" FROM "works" WHERE "handler_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- DropForeignKey
ALTER TABLE "works" DROP CONSTRAINT "works_handler_id_fkey";

-- AlterTable
ALTER TABLE "works" DROP COLUMN "handler_id";

-- CreateIndex
CREATE INDEX "works_is_deleted_id_idx" ON "works"("is_deleted", "id" DESC);

-- CreateIndex
CREATE INDEX "works_assigner_id_idx" ON "works"("assigner_id");

-- CreateIndex
CREATE INDEX "works_category_id_idx" ON "works"("category_id");

-- CreateIndex
CREATE INDEX "works_status_idx" ON "works"("status");
