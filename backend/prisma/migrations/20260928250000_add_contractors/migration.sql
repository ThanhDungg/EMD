-- Nhà thầu (khai báo master data): bảng loại nhà thầu (droplist) + hồ sơ
-- nhà thầu đầy đủ.

-- 1. Trạng thái nhà thầu
CREATE TYPE "ContractorStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- 2. Loại nhà thầu (droplist, cùng shape droplist chuẩn)
CREATE TABLE "contractor_types" (
    "id"         SERIAL       NOT NULL,
    "uuid"       TEXT         NOT NULL,
    "code"       TEXT,
    "name"       TEXT         NOT NULL,
    "is_deleted" BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contractor_types_uuid_key" ON "contractor_types"("uuid");
CREATE UNIQUE INDEX "contractor_types_code_key" ON "contractor_types"("code");

-- 3. Nhà thầu
CREATE TABLE "contractors" (
    "id"                SERIAL             NOT NULL,
    "uuid"              TEXT               NOT NULL,
    "code"              TEXT,
    "name"              TEXT               NOT NULL,
    "contractor_type_id" INTEGER,
    "service_id"        INTEGER,
    "tax_code"          TEXT,
    "hotline"           TEXT,
    "country_id"        INTEGER,
    "province_id"       INTEGER,
    "ward_id"           INTEGER,
    "address"           TEXT,
    "email"             TEXT,
    "status"            "ContractorStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes"             TEXT,
    "is_deleted"        BOOLEAN            NOT NULL DEFAULT false,
    "created_at"        TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contractors_uuid_key" ON "contractors"("uuid");
CREATE UNIQUE INDEX "contractors_code_key" ON "contractors"("code");
CREATE INDEX "contractors_contractor_type_id_idx" ON "contractors"("contractor_type_id");
CREATE INDEX "contractors_status_idx" ON "contractors"("status");

ALTER TABLE "contractors" ADD CONSTRAINT "contractors_contractor_type_id_fkey" FOREIGN KEY ("contractor_type_id") REFERENCES "contractor_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "provided_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
