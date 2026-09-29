-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "manager_id" INTEGER;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
