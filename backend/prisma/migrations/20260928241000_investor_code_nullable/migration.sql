-- Mã chủ đầu tư cho phép trống (droplist key `investor` dùng chung với các
-- droplist khác vốn cho phép bỏ trống code; API chủ đầu tư vẫn yêu cầu mã).
ALTER TABLE "investors" ALTER COLUMN "code" DROP NOT NULL;
