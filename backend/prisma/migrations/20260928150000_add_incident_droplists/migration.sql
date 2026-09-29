-- Module Ứng dụng: 3 bảng droplist cho chi tiết sự cố hư hỏng
-- (phân loại sửa chữa · phân loại hư hỏng · đơn vị phụ trách).

-- CreateTable
CREATE TABLE "repair_types" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_types" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "damage_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pic_units" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pic_units_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "incident_details" ADD COLUMN     "repair_type_id" INTEGER,
ADD COLUMN     "damage_type_id" INTEGER,
ADD COLUMN     "pic_unit_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "repair_types_uuid_key" ON "repair_types"("uuid");
CREATE UNIQUE INDEX "repair_types_code_key" ON "repair_types"("code");
CREATE UNIQUE INDEX "damage_types_uuid_key" ON "damage_types"("uuid");
CREATE UNIQUE INDEX "damage_types_code_key" ON "damage_types"("code");
CREATE UNIQUE INDEX "pic_units_uuid_key" ON "pic_units"("uuid");
CREATE UNIQUE INDEX "pic_units_code_key" ON "pic_units"("code");

-- AddForeignKey
ALTER TABLE "incident_details" ADD CONSTRAINT "incident_details_repair_type_id_fkey" FOREIGN KEY ("repair_type_id") REFERENCES "repair_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incident_details" ADD CONSTRAINT "incident_details_damage_type_id_fkey" FOREIGN KEY ("damage_type_id") REFERENCES "damage_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incident_details" ADD CONSTRAINT "incident_details_pic_unit_id_fkey" FOREIGN KEY ("pic_unit_id") REFERENCES "pic_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
