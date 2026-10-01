-- Danh mục cấp bậc nhân viên + chuyển User.user_level (INT tự do)
-- sang FK user_level_id. Dữ liệu cũ toàn NULL nên bỏ cột cũ an toàn.
-- Kèm 4 trạng thái nhân sự mặc định.

-- 1. Bảng cấp bậc
CREATE TABLE "user_levels" (
    "id"         SERIAL       NOT NULL,
    "code"       TEXT,
    "name"       TEXT         NOT NULL,
    "is_deleted" BOOLEAN      NOT NULL DEFAULT false,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_levels_code_key" ON "user_levels"("code");

-- 2. FK mới trên users, bỏ cột INT cũ
ALTER TABLE "users" ADD COLUMN "user_level_id" INTEGER;

ALTER TABLE "users" ADD CONSTRAINT "users_user_level_id_fkey" FOREIGN KEY ("user_level_id") REFERENCES "user_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "users" DROP COLUMN "user_level";

-- 3. Trạng thái nhân sự mặc định (chạy lại không trùng nhờ ON CONFLICT)
INSERT INTO "user_statuses" ("code", "name") VALUES
    ('REGULAR', 'Chính thức'),
    ('PROBATION', 'Thử việc'),
    ('LEAVING_SOON', 'Sắp nghỉ việc'),
    ('RESIGNED', 'Nghỉ việc')
ON CONFLICT ("code") DO NOTHING;
