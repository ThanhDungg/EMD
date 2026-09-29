/*
  Warnings:

  - You are about to drop the column `status` on the `works` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "works_status_idx";

-- AlterTable
ALTER TABLE "works" DROP COLUMN "status",
ADD COLUMN     "status_id" INTEGER;

-- CreateTable
CREATE TABLE "workflow_statuses" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_statuses_uuid_key" ON "workflow_statuses"("uuid");

-- CreateIndex
CREATE INDEX "workflow_statuses_category_id_sort_order_idx" ON "workflow_statuses"("category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_statuses_category_id_code_key" ON "workflow_statuses"("category_id", "code");

-- CreateIndex
CREATE INDEX "works_status_id_idx" ON "works"("status_id");

-- AddForeignKey
ALTER TABLE "workflow_statuses" ADD CONSTRAINT "workflow_statuses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "workflow_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "workflow_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
