-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "item_priority" TEXT,
ADD COLUMN     "required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "required_image" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "value_type" TEXT;
