-- Module Tài sản: cây vị trí theo site, tài sản/thiết bị, 4 bảng droplist;
-- sự cố hư hỏng nối FK vị trí + tài sản.

-- CreateTable
CREATE TABLE "site_locations" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "site_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_units" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_usage_statuses" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_usage_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_conditions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "usage_date" DATE,
    "usage_status_id" INTEGER,
    "category_id" INTEGER,
    "location_id" INTEGER,
    "supplier" TEXT,
    "origin" TEXT,
    "model" TEXT,
    "quantity" DECIMAL(18,2),
    "unit_id" INTEGER,
    "warranty_end" DATE,
    "condition_id" INTEGER,
    "remarks" TEXT,
    "detail" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "incident_details" ADD COLUMN     "location_id" INTEGER,
ADD COLUMN     "asset_id" INTEGER,
ADD COLUMN     "location_name" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "site_locations_uuid_key" ON "site_locations"("uuid");
CREATE UNIQUE INDEX "site_locations_code_key" ON "site_locations"("code");
CREATE INDEX "site_locations_site_id_idx" ON "site_locations"("site_id");
CREATE UNIQUE INDEX "asset_categories_uuid_key" ON "asset_categories"("uuid");
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");
CREATE UNIQUE INDEX "asset_units_uuid_key" ON "asset_units"("uuid");
CREATE UNIQUE INDEX "asset_units_code_key" ON "asset_units"("code");
CREATE UNIQUE INDEX "asset_usage_statuses_uuid_key" ON "asset_usage_statuses"("uuid");
CREATE UNIQUE INDEX "asset_usage_statuses_code_key" ON "asset_usage_statuses"("code");
CREATE UNIQUE INDEX "asset_conditions_uuid_key" ON "asset_conditions"("uuid");
CREATE UNIQUE INDEX "asset_conditions_code_key" ON "asset_conditions"("code");
CREATE UNIQUE INDEX "assets_uuid_key" ON "assets"("uuid");
CREATE UNIQUE INDEX "assets_code_key" ON "assets"("code");
CREATE INDEX "assets_location_id_idx" ON "assets"("location_id");
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- AddForeignKey
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "site_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_usage_status_id_fkey" FOREIGN KEY ("usage_status_id") REFERENCES "asset_usage_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "site_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "asset_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "asset_conditions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incident_details" ADD CONSTRAINT "incident_details_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "site_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "incident_details" ADD CONSTRAINT "incident_details_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
