-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_file_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "delivery_attempts" DROP CONSTRAINT "delivery_attempts_outbox_message_id_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_manager_id_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_parent_department_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_access_definitions" DROP CONSTRAINT "eoffice_access_definitions_definition_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_definitions" DROP CONSTRAINT "eoffice_definitions_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_definitions" DROP CONSTRAINT "eoffice_definitions_current_published_version_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instance_seen" DROP CONSTRAINT "eoffice_instance_seen_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instance_seen" DROP CONSTRAINT "eoffice_instance_seen_user_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instance_shares" DROP CONSTRAINT "eoffice_instance_shares_granted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instance_shares" DROP CONSTRAINT "eoffice_instance_shares_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instance_shares" DROP CONSTRAINT "eoffice_instance_shares_opened_by_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instances" DROP CONSTRAINT "eoffice_instances_current_assignee_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instances" DROP CONSTRAINT "eoffice_instances_definition_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instances" DROP CONSTRAINT "eoffice_instances_initiator_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_instances" DROP CONSTRAINT "eoffice_instances_version_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_tasks" DROP CONSTRAINT "eoffice_tasks_assignee_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_tasks" DROP CONSTRAINT "eoffice_tasks_completed_by_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_tasks" DROP CONSTRAINT "eoffice_tasks_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_transitions" DROP CONSTRAINT "eoffice_transitions_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_transitions" DROP CONSTRAINT "eoffice_transitions_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_transitions" DROP CONSTRAINT "eoffice_transitions_task_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_versions" DROP CONSTRAINT "eoffice_versions_definition_id_fkey";

-- DropForeignKey
ALTER TABLE "eoffice_versions" DROP CONSTRAINT "eoffice_versions_published_by_id_fkey";

-- DropForeignKey
ALTER TABLE "files" DROP CONSTRAINT "files_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_recipient_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_preferences" DROP CONSTRAINT "user_preferences_user_id_fkey";

-- DropIndex
DROP INDEX "departments_manager_id_idx";

-- DropIndex
DROP INDEX "departments_parent_department_id_idx";

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "is_active",
DROP COLUMN "manager_id",
DROP COLUMN "parent_department_id";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "account_status",
DROP COLUMN "display_name";

-- DropTable
DROP TABLE "attachments";

-- DropTable
DROP TABLE "audit_logs";

-- DropTable
DROP TABLE "delivery_attempts";

-- DropTable
DROP TABLE "eoffice_access_definitions";

-- DropTable
DROP TABLE "eoffice_definitions";

-- DropTable
DROP TABLE "eoffice_instance_seen";

-- DropTable
DROP TABLE "eoffice_instance_shares";

-- DropTable
DROP TABLE "eoffice_instances";

-- DropTable
DROP TABLE "eoffice_tasks";

-- DropTable
DROP TABLE "eoffice_transitions";

-- DropTable
DROP TABLE "eoffice_versions";

-- DropTable
DROP TABLE "event_inboxes";

-- DropTable
DROP TABLE "files";

-- DropTable
DROP TABLE "notification_preferences";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "outbox_messages";

-- DropTable
DROP TABLE "user_preferences";

-- DropEnum
DROP TYPE "AttachmentModuleType";

-- DropEnum
DROP TYPE "AuditResult";

-- DropEnum
DROP TYPE "EofficeAccess";

-- DropEnum
DROP TYPE "EofficeAction";

-- DropEnum
DROP TYPE "EofficeAssignmentType";

-- DropEnum
DROP TYPE "EofficeBusinessType";

-- DropEnum
DROP TYPE "EofficeDefinitionStatus";

-- DropEnum
DROP TYPE "EofficeInstanceStatus";

-- DropEnum
DROP TYPE "EofficeSubjectType";

-- DropEnum
DROP TYPE "EofficeTaskStatus";

-- DropEnum
DROP TYPE "EofficeVersionStatus";

-- DropEnum
DROP TYPE "NotificationChannel";

-- DropEnum
DROP TYPE "OutboxStatus";

-- DropEnum
DROP TYPE "UploadState";

-- DropEnum
DROP TYPE "UserAccountStatus";

