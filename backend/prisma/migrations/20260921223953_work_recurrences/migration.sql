-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "QuarterlyMode" AS ENUM ('START_OF_QUARTER', 'END_OF_QUARTER');

-- AlterTable
ALTER TABLE "workflow_categories" ADD COLUMN     "supports_recurrence" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "recurrence_id" INTEGER,
ADD COLUMN     "scheduled_date" DATE;

-- CreateTable
CREATE TABLE "work_recurrences" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category_id" INTEGER NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "month_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "quarterly_mode" "QuarterlyMode",
    "year_month" INTEGER,
    "year_day" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "handler_user_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "follower_user_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "site_id" INTEGER,
    "priority" "WorkflowPriority" NOT NULL DEFAULT 'MEDIUM',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_recurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_recurrences_uuid_key" ON "work_recurrences"("uuid");

-- CreateIndex
CREATE INDEX "work_recurrences_is_active_is_deleted_next_run_at_idx" ON "work_recurrences"("is_active", "is_deleted", "next_run_at");

-- CreateIndex
CREATE INDEX "work_recurrences_category_id_idx" ON "work_recurrences"("category_id");

-- CreateIndex
CREATE INDEX "works_recurrence_id_idx" ON "works"("recurrence_id");

-- CreateIndex
CREATE UNIQUE INDEX "works_recurrence_id_scheduled_date_key" ON "works"("recurrence_id", "scheduled_date");

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_recurrence_id_fkey" FOREIGN KEY ("recurrence_id") REFERENCES "work_recurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_recurrences" ADD CONSTRAINT "work_recurrences_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "workflow_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_recurrences" ADD CONSTRAINT "work_recurrences_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_recurrences" ADD CONSTRAINT "work_recurrences_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

