-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('TODO', 'DOING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MeterType" AS ENUM ('ELECTRICITY', 'WATER', 'DO_OIL');

-- CreateEnum
CREATE TYPE "MeterPhase" AS ENUM ('NORMAL', 'PEAK', 'OFF_PEAK');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "account_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT,
    "gender" "Gender",
    "birthday" DATE,
    "address" TEXT,
    "internal_phone" TEXT,
    "phone" TEXT,
    "hire_date" DATE,
    "user_level" INTEGER,
    "avatar_path" TEXT,
    "signature_path" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_investor" BOOLEAN NOT NULL DEFAULT false,
    "refresh_token_hash" TEXT,
    "position_id" INTEGER,
    "department_id" INTEGER,
    "co_department_id" INTEGER,
    "status_id" INTEGER,
    "manager_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_categories" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "vn_name" TEXT NOT NULL,
    "eng_name" TEXT,
    "image" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_tasks" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "WorkflowPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_date" DATE,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "category_id" INTEGER NOT NULL,
    "assigner_id" INTEGER NOT NULL,
    "assignee_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profile" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo_path" TEXT,
    "description" TEXT,
    "app_intro" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "works" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "WorkflowPriority" NOT NULL DEFAULT 'MEDIUM',
    "start_date" DATE,
    "end_date" DATE,
    "completed_at" TIMESTAMP(3),
    "location" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "category_id" INTEGER NOT NULL,
    "assigner_id" INTEGER NOT NULL,
    "handler_id" INTEGER,
    "site_id" INTEGER,
    "incident_type_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "before_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "after_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phase" TEXT,
    "rbf_rbw" TEXT,
    "unit" TEXT,
    "location" TEXT,
    "related_asset" TEXT,
    "repair_type" TEXT,
    "damage_type" TEXT,
    "cause" TEXT,
    "pic_unit" TEXT,
    "solution" TEXT,
    "next_work" TEXT,
    "reopen_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "work_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_checks" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "check_time" TIMESTAMP(3),
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "work_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_meters" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "meter_code" TEXT NOT NULL,
    "meter_type" "MeterType" NOT NULL,
    "location" TEXT,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checkpoint" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "check_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masterplan_systems" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "vn_name" TEXT NOT NULL,
    "eng_name" TEXT,
    "image" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "work_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masterplan_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masterplan_categories" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "vn_name" TEXT NOT NULL,
    "eng_name" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "system_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masterplan_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "masterplan_tasks" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pic" TEXT,
    "frequency" TEXT,
    "form_template" TEXT,
    "classification" TEXT,
    "plan_data" JSONB,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "masterplan_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_readings" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "phase" "MeterPhase" NOT NULL DEFAULT 'NORMAL',
    "start_index" DECIMAL(18,2) NOT NULL,
    "end_index" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "meter_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "standard" TEXT,
    "quantity" DECIMAL(18,2),
    "value" DECIMAL(18,2),
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checkpoint" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'TODO',
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" INTEGER,
    "work_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_types" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_statuses" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT,
    "image" TEXT,
    "vn_name" TEXT NOT NULL,
    "eng_name" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WorkFollowers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_WorkFollowers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProjectToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GroupToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GroupToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GroupToPermission" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GroupToPermission_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ModuleViewerGroups" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ModuleViewerGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ModuleViewers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ModuleViewers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_account_name_key" ON "users"("account_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_categories_uuid_key" ON "workflow_categories"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_categories_code_key" ON "workflow_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_tasks_uuid_key" ON "workflow_tasks"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "works_uuid_key" ON "works"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "incident_details_uuid_key" ON "incident_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "incident_details_work_id_key" ON "incident_details"("work_id");

-- CreateIndex
CREATE UNIQUE INDEX "energy_checks_uuid_key" ON "energy_checks"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "energy_meters_uuid_key" ON "energy_meters"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "masterplan_systems_uuid_key" ON "masterplan_systems"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "masterplan_systems_code_key" ON "masterplan_systems"("code");

-- CreateIndex
CREATE UNIQUE INDEX "masterplan_categories_uuid_key" ON "masterplan_categories"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "masterplan_categories_code_key" ON "masterplan_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "masterplan_tasks_uuid_key" ON "masterplan_tasks"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "energy_readings_uuid_key" ON "energy_readings"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_uuid_key" ON "checklist_items"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "sites_uuid_key" ON "sites"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "incident_types_uuid_key" ON "incident_types"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "incident_types_code_key" ON "incident_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "positions_code_key" ON "positions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "user_statuses_code_key" ON "user_statuses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "groups_uuid_key" ON "groups"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "modules_uuid_key" ON "modules"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "modules_code_key" ON "modules"("code");

-- CreateIndex
CREATE INDEX "_WorkFollowers_B_index" ON "_WorkFollowers"("B");

-- CreateIndex
CREATE INDEX "_ProjectToUser_B_index" ON "_ProjectToUser"("B");

-- CreateIndex
CREATE INDEX "_GroupToUser_B_index" ON "_GroupToUser"("B");

-- CreateIndex
CREATE INDEX "_GroupToPermission_B_index" ON "_GroupToPermission"("B");

-- CreateIndex
CREATE INDEX "_ModuleViewerGroups_B_index" ON "_ModuleViewerGroups"("B");

-- CreateIndex
CREATE INDEX "_ModuleViewers_B_index" ON "_ModuleViewers"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_co_department_id_fkey" FOREIGN KEY ("co_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "user_statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "workflow_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tasks" ADD CONSTRAINT "workflow_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "workflow_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_handler_id_fkey" FOREIGN KEY ("handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "works" ADD CONSTRAINT "works_incident_type_id_fkey" FOREIGN KEY ("incident_type_id") REFERENCES "incident_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_details" ADD CONSTRAINT "incident_details_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_checks" ADD CONSTRAINT "energy_checks_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_meters" ADD CONSTRAINT "energy_meters_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "energy_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masterplan_systems" ADD CONSTRAINT "masterplan_systems_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masterplan_categories" ADD CONSTRAINT "masterplan_categories_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "masterplan_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "masterplan_tasks" ADD CONSTRAINT "masterplan_tasks_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "masterplan_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "energy_meters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkFollowers" ADD CONSTRAINT "_WorkFollowers_A_fkey" FOREIGN KEY ("A") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkFollowers" ADD CONSTRAINT "_WorkFollowers_B_fkey" FOREIGN KEY ("B") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToUser" ADD CONSTRAINT "_ProjectToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectToUser" ADD CONSTRAINT "_ProjectToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToUser" ADD CONSTRAINT "_GroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToUser" ADD CONSTRAINT "_GroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToPermission" ADD CONSTRAINT "_GroupToPermission_A_fkey" FOREIGN KEY ("A") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToPermission" ADD CONSTRAINT "_GroupToPermission_B_fkey" FOREIGN KEY ("B") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleViewerGroups" ADD CONSTRAINT "_ModuleViewerGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleViewerGroups" ADD CONSTRAINT "_ModuleViewerGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleViewers" ADD CONSTRAINT "_ModuleViewers_A_fkey" FOREIGN KEY ("A") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuleViewers" ADD CONSTRAINT "_ModuleViewers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
