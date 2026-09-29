-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE', 'DENIED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "UploadState" AS ENUM ('PENDING', 'READY', 'ABORTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttachmentModuleType" AS ENUM ('WORKFLOW_INSTANCE', 'WORK', 'ASSET', 'CHAT', 'LIBRARY');

-- CreateEnum
CREATE TYPE "EofficeDefinitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EofficeVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EofficeInstanceStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'RETURNED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EofficeAction" AS ENUM ('SUBMIT', 'APPROVE', 'RETURN', 'REJECT', 'RECALL', 'CANCEL');

-- CreateEnum
CREATE TYPE "EofficeAssignmentType" AS ENUM ('USER', 'GROUP', 'DEPARTMENT', 'MANAGER', 'INITIATOR', 'SELECTED_USER');

-- CreateEnum
CREATE TYPE "EofficeTaskStatus" AS ENUM ('PENDING', 'CLAIMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EofficeBusinessType" AS ENUM ('WORK', 'ASSET', 'LIBRARY', 'GENERIC');

-- CreateEnum
CREATE TYPE "EofficeSubjectType" AS ENUM ('USER', 'GROUP', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "EofficeAccess" AS ENUM ('VIEW', 'SHARE', 'ACT', 'ADMIN');

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "manager_id" INTEGER,
ADD COLUMN     "parent_department_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_status" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "display_name" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "actor_id" INTEGER,
    "actor_account_name" TEXT,
    "action" TEXT NOT NULL,
    "module_type" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS',
    "ip" TEXT,
    "user_agent" TEXT,
    "correlation_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_attempts" (
    "id" SERIAL NOT NULL,
    "outbox_message_id" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "OutboxStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_inboxes" (
    "id" SERIAL NOT NULL,
    "consumer_name" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "recipient_user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "module_type" TEXT NOT NULL,
    "module_id" TEXT,
    "content_key" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "template_data" JSONB NOT NULL,
    "rendered_content" TEXT NOT NULL,
    "url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "notification_type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "muted_until" TIMESTAMP(3),

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "dark_mode" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "file_id" INTEGER,
    "temporary_storage_key" TEXT,
    "upload_state" "UploadState" NOT NULL DEFAULT 'PENDING',
    "module_type" "AttachmentModuleType" NOT NULL,
    "module_id" INTEGER,
    "field_type" TEXT NOT NULL,
    "field_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_definitions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "EofficeDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "current_published_version_id" INTEGER,
    "created_by_id" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eoffice_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_versions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "definition_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "form_json" JSONB NOT NULL,
    "steps_json" JSONB NOT NULL,
    "status" "EofficeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eoffice_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_instances" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "definition_id" INTEGER NOT NULL,
    "version_id" INTEGER NOT NULL,
    "business_type" "EofficeBusinessType" NOT NULL DEFAULT 'GENERIC',
    "business_id" INTEGER,
    "initiator_id" INTEGER NOT NULL,
    "current_assignee_id" INTEGER,
    "status" "EofficeInstanceStatus" NOT NULL DEFAULT 'DRAFT',
    "current_step_key" TEXT,
    "resume_step_key" TEXT,
    "data_json" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "lock_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eoffice_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_tasks" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "step_key" TEXT NOT NULL,
    "assignment_type" "EofficeAssignmentType" NOT NULL,
    "candidate_group_id" INTEGER,
    "candidate_department_id" INTEGER,
    "assignee_id" INTEGER,
    "status" "EofficeTaskStatus" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_id" INTEGER,
    "comment" TEXT,
    "lock_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eoffice_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_transitions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "task_id" INTEGER,
    "actor_id" INTEGER NOT NULL,
    "from_status" "EofficeInstanceStatus",
    "to_status" "EofficeInstanceStatus" NOT NULL,
    "action" "EofficeAction" NOT NULL,
    "resume_step_key" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eoffice_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_access_definitions" (
    "id" SERIAL NOT NULL,
    "definition_id" INTEGER NOT NULL,
    "subject_type" "EofficeSubjectType" NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "access" "EofficeAccess" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eoffice_access_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_instance_shares" (
    "id" SERIAL NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "subject_type" "EofficeSubjectType" NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "access" "EofficeAccess" NOT NULL,
    "granted_by_id" INTEGER NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by_id" INTEGER,
    "opened_at" TIMESTAMP(3),

    CONSTRAINT "eoffice_instance_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eoffice_instance_seen" (
    "instance_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eoffice_instance_seen_pkey" PRIMARY KEY ("instance_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_uuid_key" ON "audit_logs"("uuid");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_module_type_entity_type_entity_id_idx" ON "audit_logs"("module_type", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_messages_uuid_key" ON "outbox_messages"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_messages_idempotency_key_key" ON "outbox_messages"("idempotency_key");

-- CreateIndex
CREATE INDEX "outbox_messages_status_next_attempt_at_idx" ON "outbox_messages"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "outbox_messages_type_created_at_idx" ON "outbox_messages"("type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_attempts_outbox_message_id_attempt_key" ON "delivery_attempts"("outbox_message_id", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "event_inboxes_consumer_name_event_id_key" ON "event_inboxes"("consumer_name", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_uuid_key" ON "notifications"("uuid");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_is_read_id_idx" ON "notifications"("recipient_user_id", "is_read", "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_channel_key" ON "notification_preferences"("user_id", "notification_type", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_uuid_key" ON "files"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_owner_id_is_deleted_idx" ON "files"("owner_id", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_uuid_key" ON "attachments"("uuid");

-- CreateIndex
CREATE INDEX "attachments_upload_state_expires_at_idx" ON "attachments"("upload_state", "expires_at");

-- CreateIndex
CREATE INDEX "attachments_module_type_module_id_idx" ON "attachments"("module_type", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_definitions_uuid_key" ON "eoffice_definitions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_definitions_key_key" ON "eoffice_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_definitions_code_key" ON "eoffice_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_definitions_current_published_version_id_key" ON "eoffice_definitions"("current_published_version_id");

-- CreateIndex
CREATE INDEX "eoffice_definitions_status_idx" ON "eoffice_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_versions_uuid_key" ON "eoffice_versions"("uuid");

-- CreateIndex
CREATE INDEX "eoffice_versions_definition_id_status_idx" ON "eoffice_versions"("definition_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_versions_definition_id_version_key" ON "eoffice_versions"("definition_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_instances_uuid_key" ON "eoffice_instances"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_instances_code_key" ON "eoffice_instances"("code");

-- CreateIndex
CREATE INDEX "eoffice_instances_status_id_idx" ON "eoffice_instances"("status", "id" DESC);

-- CreateIndex
CREATE INDEX "eoffice_instances_initiator_id_status_idx" ON "eoffice_instances"("initiator_id", "status");

-- CreateIndex
CREATE INDEX "eoffice_instances_definition_id_status_idx" ON "eoffice_instances"("definition_id", "status");

-- CreateIndex
CREATE INDEX "eoffice_instances_business_type_business_id_idx" ON "eoffice_instances"("business_type", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_tasks_uuid_key" ON "eoffice_tasks"("uuid");

-- CreateIndex
CREATE INDEX "eoffice_tasks_status_assignee_id_idx" ON "eoffice_tasks"("status", "assignee_id");

-- CreateIndex
CREATE INDEX "eoffice_tasks_status_candidate_group_id_idx" ON "eoffice_tasks"("status", "candidate_group_id");

-- CreateIndex
CREATE INDEX "eoffice_tasks_status_candidate_department_id_idx" ON "eoffice_tasks"("status", "candidate_department_id");

-- CreateIndex
CREATE INDEX "eoffice_tasks_instance_id_status_idx" ON "eoffice_tasks"("instance_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_transitions_uuid_key" ON "eoffice_transitions"("uuid");

-- CreateIndex
CREATE INDEX "eoffice_transitions_instance_id_id_idx" ON "eoffice_transitions"("instance_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_access_definitions_definition_id_subject_type_subje_key" ON "eoffice_access_definitions"("definition_id", "subject_type", "subject_id", "access");

-- CreateIndex
CREATE INDEX "eoffice_instance_shares_subject_type_subject_id_idx" ON "eoffice_instance_shares"("subject_type", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "eoffice_instance_shares_instance_id_subject_type_subject_id_key" ON "eoffice_instance_shares"("instance_id", "subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "departments_parent_department_id_idx" ON "departments"("parent_department_id");

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "departments"("manager_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_outbox_message_id_fkey" FOREIGN KEY ("outbox_message_id") REFERENCES "outbox_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_definitions" ADD CONSTRAINT "eoffice_definitions_current_published_version_id_fkey" FOREIGN KEY ("current_published_version_id") REFERENCES "eoffice_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_definitions" ADD CONSTRAINT "eoffice_definitions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_versions" ADD CONSTRAINT "eoffice_versions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "eoffice_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_versions" ADD CONSTRAINT "eoffice_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instances" ADD CONSTRAINT "eoffice_instances_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "eoffice_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instances" ADD CONSTRAINT "eoffice_instances_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "eoffice_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instances" ADD CONSTRAINT "eoffice_instances_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instances" ADD CONSTRAINT "eoffice_instances_current_assignee_id_fkey" FOREIGN KEY ("current_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_tasks" ADD CONSTRAINT "eoffice_tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "eoffice_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_tasks" ADD CONSTRAINT "eoffice_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_tasks" ADD CONSTRAINT "eoffice_tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_transitions" ADD CONSTRAINT "eoffice_transitions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "eoffice_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_transitions" ADD CONSTRAINT "eoffice_transitions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "eoffice_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_transitions" ADD CONSTRAINT "eoffice_transitions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_access_definitions" ADD CONSTRAINT "eoffice_access_definitions_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "eoffice_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instance_shares" ADD CONSTRAINT "eoffice_instance_shares_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "eoffice_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instance_shares" ADD CONSTRAINT "eoffice_instance_shares_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instance_shares" ADD CONSTRAINT "eoffice_instance_shares_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instance_seen" ADD CONSTRAINT "eoffice_instance_seen_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "eoffice_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eoffice_instance_seen" ADD CONSTRAINT "eoffice_instance_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
