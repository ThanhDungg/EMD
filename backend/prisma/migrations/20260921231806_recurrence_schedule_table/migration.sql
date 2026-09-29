-- CreateEnum
CREATE TYPE "RecurrenceEndType" AS ENUM ('NEVER', 'ON_DATE');

-- AlterTable
ALTER TABLE "works" DROP COLUMN "frequency",
DROP COLUMN "month_days",
DROP COLUMN "next_run_at",
DROP COLUMN "quarterly_mode",
DROP COLUMN "recurrence_active",
DROP COLUMN "weekdays",
DROP COLUMN "year_day",
DROP COLUMN "year_month",
ADD COLUMN     "recurrence_schedule_id" INTEGER;

-- CreateTable
CREATE TABLE "work_recurrence_schedules" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "month_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "quarterly_mode" "QuarterlyMode",
    "year_month" INTEGER,
    "year_day" INTEGER,
    "start_date" DATE,
    "end_type" "RecurrenceEndType" NOT NULL DEFAULT 'NEVER',
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_recurrence_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_recurrence_schedules_uuid_key" ON "work_recurrence_schedules"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "works_recurrence_schedule_id_key" ON "works"("recurrence_schedule_id");

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_recurrence_schedule_id_fkey" FOREIGN KEY ("recurrence_schedule_id") REFERENCES "work_recurrence_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

