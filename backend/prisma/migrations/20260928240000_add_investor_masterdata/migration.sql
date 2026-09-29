-- Chủ đầu tư chuyển sang "Khai báo master data":
-- 1) bảng droplist chủ đầu tư cha (investor_groups)
-- 2) mở rộng bảng investors thành hồ sơ đầy đủ (chủ đầu tư cha, MST,
--    đại diện pháp nhân, địa lý, số nhà tên đường, email, hotline, ghi chú).

-- 1. Chủ đầu tư cha (droplist)
CREATE TABLE "investor_groups" (
    "id"         SERIAL       NOT NULL,
    "uuid"       TEXT         NOT NULL,
    "code"       TEXT,
    "name"       TEXT         NOT NULL,
    "short_name" TEXT,
    "is_deleted" BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investor_groups_uuid_key" ON "investor_groups"("uuid");
CREATE UNIQUE INDEX "investor_groups_code_key" ON "investor_groups"("code");

-- 2. Mã chủ đầu tư thành bắt buộc (dữ liệu cũ chưa có mã thì sinh mã theo id)
UPDATE "investors" SET "code" = 'INV-' || "id" WHERE "code" IS NULL;
ALTER TABLE "investors" ALTER COLUMN "code" SET NOT NULL;

-- 3. Thêm field hồ sơ chủ đầu tư
ALTER TABLE "investors"
    ADD COLUMN "investor_group_id" INTEGER,
    ADD COLUMN "tax_code" TEXT,
    ADD COLUMN "legal_representative" TEXT,
    ADD COLUMN "country_id" INTEGER,
    ADD COLUMN "province_id" INTEGER,
    ADD COLUMN "ward_id" INTEGER,
    ADD COLUMN "address" TEXT,
    ADD COLUMN "email" TEXT,
    ADD COLUMN "hotline" TEXT,
    ADD COLUMN "notes" TEXT;

CREATE INDEX "investors_investor_group_id_idx" ON "investors"("investor_group_id");

ALTER TABLE "investors" ADD CONSTRAINT "investors_investor_group_id_fkey" FOREIGN KEY ("investor_group_id") REFERENCES "investor_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investors" ADD CONSTRAINT "investors_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investors" ADD CONSTRAINT "investors_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "investors" ADD CONSTRAINT "investors_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
