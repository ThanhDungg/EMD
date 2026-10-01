-- CreateTable
CREATE TABLE "report_dashboards" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_charts" (
    "id" SERIAL NOT NULL,
    "dashboard_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "chart_type" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "metric" TEXT NOT NULL DEFAULT 'count',
    "dimension" TEXT,
    "filters" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReportDashboardSharedUsers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ReportDashboardSharedUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ReportDashboardSharedGroups" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ReportDashboardSharedGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ReportDashboardSharedUsers_B_index" ON "_ReportDashboardSharedUsers"("B");

-- CreateIndex
CREATE INDEX "_ReportDashboardSharedGroups_B_index" ON "_ReportDashboardSharedGroups"("B");

-- AddForeignKey
ALTER TABLE "report_dashboards" ADD CONSTRAINT "report_dashboards_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_charts" ADD CONSTRAINT "report_charts_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "report_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReportDashboardSharedUsers" ADD CONSTRAINT "_ReportDashboardSharedUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "report_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReportDashboardSharedUsers" ADD CONSTRAINT "_ReportDashboardSharedUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReportDashboardSharedGroups" ADD CONSTRAINT "_ReportDashboardSharedGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReportDashboardSharedGroups" ADD CONSTRAINT "_ReportDashboardSharedGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "report_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
