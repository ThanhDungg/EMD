-- AlterTable
ALTER TABLE "checklist_items" ADD COLUMN     "photo_lat" DECIMAL(10,7),
ADD COLUMN     "photo_lng" DECIMAL(10,7),
ADD COLUMN     "photo_taken_at" TIMESTAMP(3);
