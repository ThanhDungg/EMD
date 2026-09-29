# ĐẶC TẢ GIAO DIỆN DANH SÁCH CÔNG VIỆC (AS-BUILT)

> Tài liệu này mô tả **đúng source hiện tại** (cập nhật 22/09/2026).
> Mọi thay đổi giao diện sau này phải sửa cả file này để lần sau không phải
> đối chiếu lại với mẫu cũ. Sidebar/icon rail giữ nguyên, không mô tả lại.

## 1. Stack & quy ước

- React 19 + antd v5 + react-router-dom v7 + TanStack Query v5.
- Mọi gọi API đi qua hooks trong `src/entities/work/queries.ts`
  (`useWorks`, `useWorksPage`, `useWorkDetail`, ...) và
  `src/pages/home/api/homeQueries.ts`. **Không fetch tay bằng `useEffect`.**
- Table dùng `Table` shared (`src/shared/ui/table/Table.tsx`, API kiểu beca-ui):
  `bordered`, `tableLayout="fixed"`, `resizable` (kéo mép tiêu đề đổi rộng,
  min 60px), `striped` (dòng lẻ nền `#f8faff`).
- UI kit shared: `BodyCard` (card có `title` + `extra`), `Tag`, `Button`,
  `EllipsisText` (1 dòng + ellipsis + tooltip).
- FSD: domain dùng chung ở `src/entities/work` (model/api/queries qua
  `index.ts`); page chỉ chứa UI + filter của nó.

## 2. Routes (mỗi tab là 1 trang riêng)

```
Layout: HomeLayout (rail + menu + <Outlet/>) — sidebar hiển thị ở MỌI trang,
kể cả trang detail. Highlight menu suy từ URL; ở trang detail giữ highlight
tab gốc (state lastKey).
/                 → HomeDashboard (thống kê + việc mới nhất + công ty)
/assigned         → ScopeWorksPage scope="assigned" (Việc tôi giao)
/handled          → ScopeWorksPage scope="handled" (Việc tôi thực hiện)
/categories/:id   → CategoryWorksPage (1 loại việc, id trên URL)
/works/:id        → WorkDetailPage (chi tiết)
```

## 3. Bảng danh sách công việc (CategoryWorksPage)

### 3.1 Toolbar trên bảng

- Bên trái: chips lọc — `Tất cả`, `Trễ hạn` + 1 chip cho mỗi status của loại
  việc (màu chấm riêng). Chip đang chọn viền `#2174cd`.
- Bên phải: nút `Xóa lọc` (khi có filter) + nút `Lọc` kèm badge đếm.
- Loại có `supportsRecurrence` thì có thêm Segmented `Công việc | Việc lặp`
  (tab Việc lặp render `RecurrencePanel`).

### 3.2 Nút Lọc → Drawer phải (`WorkFilterDrawer`)

3 filter mặc định: **Dự án** (select sites), **Nhân viên** (select search,
gộp danh bạ `/users` + người trong list), **Từ ngày → Đến ngày**
(RangePicker `DD/MM/YYYY`). Nút `Áp dụng` / `Xóa lọc`.
Bảng theo loại: filter chạy **server-side** (`?siteId&userId&from&to`).
Bảng Tôi giao/thực hiện: filter client-side trên list đã tải.

### 3.3 Cột bảng (theo đúng thứ tự)

`Tiêu đề` (link xanh, weight 600, ellipsis + tooltip, click → `/works/:id`),
`Tiến độ` (pill xám `#b9bdc4`, `%` trắng bên trong trái, fill xanh `#1677e8`
khi > 0), `Dự án` (= site.name), [`Vị trí` — chỉ loại Checklist, giữa Dự án
và Tình trạng], `Tình trạng` (badge bo góc 3px + chấm màu), `Từ ngày`,
`Ngày HT`, `Độ ưu tiên`.
Định dạng ngày `DD/MM/YYYY`. Build cột ở `buildWorkColumns()` trong
`pages/home/ui/workColumns.tsx`.

### 3.4 Phân trang server

`GET /workflow/works` trả envelope `{ data, total, page, limit, totalPages }`.
Bảng theo loại: 20/trang, đổi trang giữ nguyên sidebar, đổi menu/filter tự
về trang 1. Badge menu Tôi giao/thực hiện lấy `total` thật (request limit 1).

## 4. Trang Tôi giao / Tôi thực hiện (ScopeWorksPage)

`BodyCard` với filter nằm ở `extra` (cùng hàng title, bên phải).
Bảng + Drawer filter giống mục 3 (không có chips status). Đổi tab reset filter.

## 5. Trang chủ (HomeDashboard)

4 stat: Việc tôi giao / Tôi thực hiện (total thật) / Loại việc / Phân hệ.
Card Công việc mới nhất (8 dòng, cột + Table giống mục 3.3).
Card Giới thiệu công ty + Giới thiệu phần mềm (`company_profile`).

## 6. Màu/token đang dùng trong code

- Primary theme: `#2174cd` (`src/shared/theme`). Màu fill progress `#1677e8`.
- Nền dòng lẻ table: `#f8faff`. Nền pill progress: `#b9bdc4`.
- Ribbon/card sự cố: xanh lá `#55ad70`, xanh đậm `#075ac4/#0969da`,
  đỏ `#d13b3b` (nền nhạt `#ffdede`).
- File đặc tả cũ (màu ước lượng `#1677e8` primary...) chỉ còn giá trị tham
  khảo — code mới là chuẩn.

## 7. Không làm (đã chốt)

- Sidebar + icon rail: đang đẹp, không sửa.
- Filter các bảng Tôi giao/thực hiện vẫn client-side (limit 100).
  Muốn lọc server-side ở 2 bảng này thì thêm `page` + dùng `useWorksPage`.
