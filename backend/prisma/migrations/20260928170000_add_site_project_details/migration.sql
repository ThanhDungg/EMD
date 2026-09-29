-- Module Ứng dụng: hồ sơ dự án (site) — thông tin dự án + địa lý phân cấp
-- (quốc gia → miền → tỉnh thành → phường xã) + droplist chủ đầu tư / loại
-- hình dịch vụ / dịch vụ cung cấp + 5 bảng con theo dự án.

-- CreateEnum
CREATE TYPE "SiteOperationStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "SiteRentalStatus" AS ENUM ('RENTED', 'VACANT', 'PREPARING');
CREATE TYPE "SiteManagementStatus" AS ENUM ('MANAGED', 'NOT_MANAGED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "country_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provinces" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "region_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wards" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "province_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investors" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "service_types" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "provided_services" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provided_services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_members" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "site_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_service_providers" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "site_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_service_providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_contractors" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "site_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_contractors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_partner_contacts" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "site_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_partner_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_units" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "site_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" DECIMAL(18,2),
    "status" TEXT,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_units_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "lot" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "geo_points" TEXT,
ADD COLUMN     "country_id" INTEGER,
ADD COLUMN     "region_id" INTEGER,
ADD COLUMN     "province_id" INTEGER,
ADD COLUMN     "ward_id" INTEGER,
ADD COLUMN     "investor_id" INTEGER,
ADD COLUMN     "floors" INTEGER,
ADD COLUMN     "service_type_id" INTEGER,
ADD COLUMN     "service_id" INTEGER,
ADD COLUMN     "land_area" DECIMAL(18,2),
ADD COLUMN     "gfa_area" DECIMAL(18,2),
ADD COLUMN     "gla_area" DECIMAL(18,2),
ADD COLUMN     "road_area" DECIMAL(18,2),
ADD COLUMN     "leased_area" DECIMAL(18,2),
ADD COLUMN     "green_area" DECIMAL(18,2),
ADD COLUMN     "occupancy_rate" DECIMAL(5,2),
ADD COLUMN     "received_at" DATE,
ADD COLUMN     "operation_status" "SiteOperationStatus",
ADD COLUMN     "rental_status" "SiteRentalStatus",
ADD COLUMN     "management_status" "SiteManagementStatus",
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "countries_uuid_key" ON "countries"("uuid");
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");
CREATE UNIQUE INDEX "regions_uuid_key" ON "regions"("uuid");
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");
CREATE INDEX "regions_country_id_idx" ON "regions"("country_id");
CREATE UNIQUE INDEX "provinces_uuid_key" ON "provinces"("uuid");
CREATE UNIQUE INDEX "provinces_code_key" ON "provinces"("code");
CREATE INDEX "provinces_region_id_idx" ON "provinces"("region_id");
CREATE UNIQUE INDEX "wards_uuid_key" ON "wards"("uuid");
CREATE UNIQUE INDEX "wards_code_key" ON "wards"("code");
CREATE INDEX "wards_province_id_idx" ON "wards"("province_id");
CREATE UNIQUE INDEX "investors_uuid_key" ON "investors"("uuid");
CREATE UNIQUE INDEX "investors_code_key" ON "investors"("code");
CREATE UNIQUE INDEX "service_types_uuid_key" ON "service_types"("uuid");
CREATE UNIQUE INDEX "service_types_code_key" ON "service_types"("code");
CREATE UNIQUE INDEX "provided_services_uuid_key" ON "provided_services"("uuid");
CREATE UNIQUE INDEX "provided_services_code_key" ON "provided_services"("code");
CREATE UNIQUE INDEX "site_members_uuid_key" ON "site_members"("uuid");
CREATE UNIQUE INDEX "site_members_site_id_user_id_key" ON "site_members"("site_id", "user_id");
CREATE INDEX "site_members_user_id_idx" ON "site_members"("user_id");
CREATE UNIQUE INDEX "site_service_providers_uuid_key" ON "site_service_providers"("uuid");
CREATE INDEX "site_service_providers_site_id_idx" ON "site_service_providers"("site_id");
CREATE UNIQUE INDEX "site_contractors_uuid_key" ON "site_contractors"("uuid");
CREATE INDEX "site_contractors_site_id_idx" ON "site_contractors"("site_id");
CREATE UNIQUE INDEX "site_partner_contacts_uuid_key" ON "site_partner_contacts"("uuid");
CREATE INDEX "site_partner_contacts_site_id_idx" ON "site_partner_contacts"("site_id");
CREATE UNIQUE INDEX "site_units_uuid_key" ON "site_units"("uuid");
CREATE INDEX "site_units_site_id_idx" ON "site_units"("site_id");

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provinces" ADD CONSTRAINT "provinces_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wards" ADD CONSTRAINT "wards_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_members" ADD CONSTRAINT "site_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_service_providers" ADD CONSTRAINT "site_service_providers_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_contractors" ADD CONSTRAINT "site_contractors_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_partner_contacts" ADD CONSTRAINT "site_partner_contacts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_units" ADD CONSTRAINT "site_units_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_province_id_fkey" FOREIGN KEY ("province_id") REFERENCES "provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sites" ADD CONSTRAINT "sites_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "provided_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
