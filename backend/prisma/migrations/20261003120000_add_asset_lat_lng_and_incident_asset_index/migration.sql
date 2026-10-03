-- Vị trí lat/lng của tài sản: chọn trên bản đồ ở form tài sản, dùng cho bản đồ
-- vị trí tài sản + in tem QR dán ngoài thực tế.
ALTER TABLE "assets"
  ADD COLUMN "latitude" DECIMAL(10, 7),
  ADD COLUMN "longitude" DECIMAL(10, 7);

-- Màn sự cố hư hỏng (mở từ tem QR) lọc sự cố theo tài sản.
CREATE INDEX "incident_details_asset_id_idx" ON "incident_details" ("asset_id");