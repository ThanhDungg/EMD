# ĐẶC TẢ GIAO DIỆN CHI TIẾT CÔNG VIỆC / SỰ CỐ (AS-BUILT)

> Tài liệu này mô tả **đúng source hiện tại** (cập nhật 22/09/2026).
> Mọi thay đổi giao diện sau này phải sửa cả file này.
> Sidebar/icon rail dùng chung layout, không mô tả lại.
> Trang detail là route con (`/works/:id`) — sidebar giữ nguyên, chỉ content đổi.

## 1. Cấu trúc chung (`pages/work-detail/`)

```
WorkDetailPage (/works/:id)
├── Thanh nút: Quay lại | Export, Chỉnh sửa, Select trạng thái, Xóa
├── Modal Sửa công việc (title, mô tả, ưu tiên, dự án, vị trí, tiến độ %,
│   người xử lý multi, 3 mốc ngày)
├── Modal Xác nhận chuyển trạng thái (Từ → Đến + ô ghi chú → lưu lịch sử)
├── Loại INCIDENT → IncidentDetailView
├── Loại khác     → WorkSummaryCard (kiểu card sự cố, data riêng từng loại)
├── Loại CHECKLIST → + card Nội dung checklist (cây cha-con, dưới summary)
└── Mọi loại → card Lịch sử (WorkHistoryTimeline)
```

Data qua hooks `@/entities/work`: `useWorkDetail`, `useChecklistTree`,
`useSites`, `useDirectory`, `useStatusesByCategory`, `useUpdateWork`,
`useDeleteWork`, `useCreateWork`. Mutation xong tự invalidate list.

## 2. Card tóm tắt dùng chung (`WorkSummaryCard`)

Áp dụng cho **mọi loại công việc**:

- Ribbon trạng thái nghiêng `-6deg` chồng góc trái card (xanh lá `#55ad70`
  khi đã đóng, còn lại theo màu status), chữ trắng 12px.
- Tiêu đề + dòng phụ `{vnName} #{id}` + `Mô tả` + `Mã #id` + `Tạo bởi`
  (avatar đỏ chữ cái đầu).
- Lưới tổng quan **responsive** `column={{ xs: 1, sm: 2, xl: 4 }}`
  (mobile 1 cột, tablet 2, desktop 4), không border:
  `Dự án | Quản lý dự án (suy từ site.manager) | Người xử lý (n) | Vị trí |
  Ngày bắt đầu | Hạn hoàn thành | Ngày hoàn thành thực tế | Độ ưu tiên`
  (badge đỏ nhạt khi Cao). Label đen đậm 12px, value xám 12px.

## 3. Riêng loại Sự cố (`IncidentDetailView`, category.code === 'INCIDENT')

- Nút `+ Tạo công việc` sát mép phải trên card đầu (modal: tạo việc cùng
  loại, giữ sẵn site + người xử lý, xong nhảy sang việc mới).
- Card tóm tắt: dùng chung `StatusRibbon/CreatorMeta/PriorityBadge`,
  thêm `Ngày xảy ra sự cố / Hạn hoàn thành / Ngày HTTT` (giờ phút),
  `Phân loại sự cố` (= incidentType), `Đính kèm` (ảnh trước/sau xử lý).
- Card **Thông tin chi tiết**: form readonly 3 cột responsive
  (`xs 1 / sm 2 / xl 3`), input nền xám `#f5f5f5` (copy được, không disabled),
  sao đỏ các trường bắt buộc, field dài ellipsis + tooltip, `Ghi chú` full width.
  Thứ tự: Phase, RBF/RBW, Unit, Vị trí sự cố, Tài sản/Thiết bị,
  Phân loại sửa chữa, Phân loại hư hỏng, Nguyên nhân, Đơn vị phụ trách (PIC),
  Giải pháp khắc phục, Công việc tiếp theo, Số lần Re-Open, Ghi chú.
- Card **Tiến độ công việc**: empty state (chưa có bảng tiến độ/bình luận).
- Card **Lịch sử**: `WorkHistoryTimeline` dùng chung (mục 5).
- Nút chat tròn góc phải (placeholder, bấm báo sắp ra mắt).

## 4. Cây checklist (`/works/:id` loại CHECKLIST)

Card **Nội dung checklist**: bảng phẳng luôn mở (không nút +/-),
row cha merge full 9 cột (nền `#f3f5f9`, chữ đậm, chỉ show tiêu đề),
row con full thông tin. Đủ 8 cột nghiệp vụ, thứ tự:
`Tiêu đề, Tiêu chuẩn kiểm tra, Số lượng,
Giá trị (hiển thị theo loại giá trị của mẫu: tag Đúng/Sai · số có phân tách
nghìn · chữ), Đính kèm (thumbnail ảnh, click xem lớn; file khác hiện tên +
link), Checkpoint (vị trí lat/long thiết bị gửi lên: photo_lat , photo_lng),
Trạng thái (tag Đạt / Không đạt / Chưa đánh giá), Ghi chú`.
API `GET /workflow/checklists?workId=` trả sẵn cây `children`.

## 5. Lịch sử trạng thái (`WorkHistoryTimeline`, mọi loại)

- Bảng `work_status_histories`: work nào, từ status nào → sang status nào
  (null = lúc tạo), ai đổi, khi nào, ghi chú. Backend **tự ghi 1 mốc** khi
  tạo work và mỗi lần đổi status (kể cả đổi loại kéo theo reset status).
- Đổi status trên detail phải qua **modal xác nhận**: hiện Từ → Đến,
  ô nhập ghi chú, nút **Xác nhận / Hủy**. Ghi chú lưu vào `history.note`,
  timeline hiện dưới mốc đổi trạng thái.
- Timeline: khối ngày xanh `#075ac4` (`DD-MM- / YYYY / HH:mm:ss`) + chấm tròn
  + card nội dung (tên người xanh đậm + dòng `Cập nhật Trạng thái: trước →
  sau` hoặc `Tạo công việc...` + ghi chú). Mới nhất trước.
  `GET /workflow/works/:id/history`.

## 6. Export / Xóa / Sửa (thanh nút chung)

- **Export**: tải CSV (BOM tiếng Việt) thông tin việc + cây checklist,
  tên `work-{id}.csv`.
- **Chỉnh sửa**: modal như mục 1 (PATCH, reload detail tại chỗ).
- **Xóa**: Popconfirm (xoá mềm, khôi phục được), xong về `/`.
- Thiếu quyền (không phải người giao/thực hiện/ADMIN) thì các nút báo lỗi
  tương ứng — backend check, FE không tự ẩn nút.

## 7. Responsive

- Lưới tổng quan + form sự cố: mobile 1 cột, tablet 2, desktop 3–4 cột.
- Bảng checklist: `tableLayout="fixed"` + `resizable` (kéo mép tiêu đề),
  nền dòng xen kẽ.
- Nút chat giữ fixed góc phải mọi cỡ màn hình.

## 8. Chưa làm (đã chốt, xem docs/database.md mục gaps)

- Chụp ảnh ngay trên điện thoại (gửi kèm lat/long/giờ chụp tự động) — hiện đã
  có API upload ảnh (`POST /api/uploads/images`, nhận `photoLat/photoLng/
  photoTakenAt`) nhưng form web chưa thu thập GPS; ô ảnh trong modal tạo việc
  và các màn hình chi tiết đã đọc ảnh qua `GET /api/uploads/file`.
- Sửa trực tiếp ảnh trước/sau của incident (2 ô text nhập path tay).
- Bảng tiến độ/bình luận theo thời gian (card Tiến độ đang empty).
- Lịch sử đầy đủ thao tác khác ngoài đổi trạng thái (cần bảng audit chung).
- Sửa trực tiếp nội dung incident-detail trên form (hiện readonly).
