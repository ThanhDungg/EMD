-- Lịch sử: migration này đã được áp trên DB local (tạo report_dashboards +
-- report_charts từ thử nghiệm dashboard trước đó) nhưng thư mục migration
-- không còn trong repo. Module Báo cáo hiện dùng bảng report_boards (widget
-- lưu dạng JSON trong config) nên 2 bảng kia không còn dùng.
-- File giữ no-op để lịch sử migration khớp với DB đang chạy; DB mới không cần
-- tạo 2 bảng này.
SELECT 1;
