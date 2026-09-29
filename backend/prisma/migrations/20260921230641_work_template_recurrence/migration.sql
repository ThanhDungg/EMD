-- DropForeignKey
ALTER TABLE "work_recurrences" DROP CONSTRAINT "work_recurrences_category_id_fkey";

-- DropForeignKey
ALTER TABLE "work_recurrences" DROP CONSTRAINT "work_recurrences_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "work_recurrences" DROP CONSTRAINT "work_recurrences_site_id_fkey";

-- DropForeignKey
ALTER TABLE "works" DROP CONSTRAINT "works_recurrence_id_fkey";

-- AlterTable
ALTER TABLE "works" ADD COLUMN     "frequency" "RecurrenceFrequency",
ADD COLUMN     "is_recurrence" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "month_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "next_run_at" TIMESTAMP(3),
ADD COLUMN     "quarterly_mode" "QuarterlyMode",
ADD COLUMN     "recurrence_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "year_day" INTEGER,
ADD COLUMN     "year_month" INTEGER;

-- DropTable
DROP TABLE "work_recurrences";

-- CreateIndex
CREATE INDEX "works_is_recurrence_category_id_idx" ON "works"("is_recurrence", "category_id");

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_recurrence_id_fkey" FOREIGN KEY ("recurrence_id") REFERENCES "works"("id") ON DELETE SET NULL ON UPDATE CASCADE;

