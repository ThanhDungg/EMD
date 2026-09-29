-- Danh mục kiểm tra năng lượng: khách hàng + nhà xưởng (droplist) +
-- bảng nối nhiều-nhiều khách hàng ↔ dự án (site).

-- 1. Droplist nhà xưởng (cùng shape các droplist khác)
CREATE TABLE "factories" (
    "id"         SERIAL       NOT NULL,
    "uuid"       TEXT         NOT NULL,
    "code"       TEXT,
    "name"       TEXT         NOT NULL,
    "is_deleted" BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factories_pkey" PRIMARY KEY ("id")
);

-- 2. Trạng thái khách hàng
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- 3. Bảng khách hàng
CREATE TABLE "customers" (
    "id"          SERIAL            NOT NULL,
    "uuid"        TEXT              NOT NULL,
    "code"        TEXT              NOT NULL,
    "name"        TEXT              NOT NULL,
    "short_name"  TEXT,
    "tax_code"    TEXT,
    "country_id"  INTEGER,
    "province_id" INTEGER,
    "ward_id"     INTEGER,
    "address"     TEXT,
    "hotline"     TEXT,
    "email"       TEXT,
    "status"      "CustomerStatus"  NOT NULL DEFAULT 'ACTIVE',
    "factory_id"  INTEGER,
    "notes"       TEXT,
    "is_deleted"  BOOLEAN           NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- 4. Bảng nối nhiều-nhiều khách hàng ↔ dự án
CREATE TABLE "customer_sites" (
    "id"          SERIAL       NOT NULL,
    "uuid"        TEXT         NOT NULL,
    "customer_id" INTEGER      NOT NULL,
    "site_id"     INTEGER      NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_sites_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE UNIQUE INDEX "factories_uuid_key" ON "factories"("uuid");
CREATE UNIQUE INDEX "factories_code_key" ON "factories"("code");
CREATE UNIQUE INDEX "customers_uuid_key" ON "customers"("uuid");
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");
CREATE INDEX "customers_status_idx" ON "customers"("status");
CREATE UNIQUE INDEX "customer_sites_uuid_key" ON "customer_sites"("uuid");
CREATE UNIQUE INDEX "customer_sites_customer_id_site_id_key" ON "customer_sites"("customer_id", "site_id");
CREATE INDEX "customer_sites_site_id_idx" ON "customer_sites"("site_id");

-- Khóa ngoại
ALTER TABLE "customers" ADD CONSTRAINT "customers_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_factory_id_fkey" FOREIGN KEY ("factory_id") REFERENCES "factories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_sites" ADD CONSTRAINT "customer_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
