-- CreateTable
CREATE TABLE "work_status_histories" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "work_id" INTEGER NOT NULL,
    "from_status_id" INTEGER,
    "to_status_id" INTEGER,
    "changed_by_id" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_status_histories_uuid_key" ON "work_status_histories"("uuid");

-- CreateIndex
CREATE INDEX "work_status_histories_work_id_id_idx" ON "work_status_histories"("work_id", "id" DESC);

-- AddForeignKey
ALTER TABLE "work_status_histories" ADD CONSTRAINT "work_status_histories_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_status_histories" ADD CONSTRAINT "work_status_histories_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "workflow_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_status_histories" ADD CONSTRAINT "work_status_histories_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "workflow_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_status_histories" ADD CONSTRAINT "work_status_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
