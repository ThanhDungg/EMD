-- Dashboard báo cáo tự custom kiểu Power BI (1 bảng duy nhất, widgets trong JSON).
CREATE TABLE "report_boards" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" INTEGER,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_boards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_boards_uuid_key" ON "report_boards"("uuid");
CREATE INDEX "report_boards_owner_id_idx" ON "report_boards"("owner_id");
