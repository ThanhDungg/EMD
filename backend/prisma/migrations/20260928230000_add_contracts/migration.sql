-- Khai báo master data: hợp đồng + bảng nối nhiều-nhiều hợp đồng ↔ dự án
-- + bảng đường dẫn tài liệu của hợp đồng.

-- 1. Enum
CREATE TYPE "ContractType" AS ENUM ('INPUT', 'OUTPUT');
CREATE TYPE "ContractTermType" AS ENUM ('TERM', 'OPEN_ENDED');

-- 2. Bảng hợp đồng
CREATE TABLE "contracts" (
    "id"             SERIAL             NOT NULL,
    "uuid"           TEXT               NOT NULL,
    "code"           TEXT               NOT NULL,
    "company_name"   TEXT               NOT NULL,
    "type_name"      TEXT               NOT NULL,
    "contract_type"  "ContractType"     NOT NULL,
    "service_type_id" INTEGER,
    "start_date"     DATE,
    "end_date"       DATE,
    "term_type"      "ContractTermType" NOT NULL,
    "notes"          TEXT,
    "is_deleted"     BOOLEAN            NOT NULL DEFAULT false,
    "created_at"     TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3)       NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- 3. Bảng nối nhiều-nhiều hợp đồng ↔ dự án
CREATE TABLE "contract_sites" (
    "id"          SERIAL       NOT NULL,
    "uuid"        TEXT         NOT NULL,
    "contract_id" INTEGER      NOT NULL,
    "site_id"     INTEGER      NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_sites_pkey" PRIMARY KEY ("id")
);

-- 4. Đường dẫn tài liệu của hợp đồng
CREATE TABLE "contract_documents" (
    "id"          SERIAL       NOT NULL,
    "uuid"        TEXT         NOT NULL,
    "contract_id" INTEGER      NOT NULL,
    "name"        TEXT         NOT NULL,
    "path"        TEXT         NOT NULL,
    "sort_order"  INTEGER      NOT NULL DEFAULT 0,
    "is_deleted"  BOOLEAN      NOT NULL DEFAULT false,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE UNIQUE INDEX "contracts_uuid_key" ON "contracts"("uuid");
CREATE UNIQUE INDEX "contracts_code_key" ON "contracts"("code");
CREATE INDEX "contracts_contract_type_idx" ON "contracts"("contract_type");
CREATE UNIQUE INDEX "contract_sites_uuid_key" ON "contract_sites"("uuid");
CREATE UNIQUE INDEX "contract_sites_contract_id_site_id_key" ON "contract_sites"("contract_id", "site_id");
CREATE INDEX "contract_sites_site_id_idx" ON "contract_sites"("site_id");
CREATE UNIQUE INDEX "contract_documents_uuid_key" ON "contract_documents"("uuid");
CREATE INDEX "contract_documents_contract_id_idx" ON "contract_documents"("contract_id");

-- Khóa ngoại
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_sites" ADD CONSTRAINT "contract_sites_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_sites" ADD CONSTRAINT "contract_sites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
