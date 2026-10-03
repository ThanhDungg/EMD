# EMD — Monorepo (frontend + backend)

## Yêu cầu
- Node.js >= 22, **pnpm >= 10** (`npm install -g pnpm@latest`)
- PostgreSQL đang chạy local (mặc định `localhost:5432`)

## Cấu trúc chuẩn

Áp dụng **Feature-Sliced Design v2.1** cho frontend (theo `.agents/skills/feature-sliced-design/`)
và cấu trúc module chuẩn NestJS cho backend.

```
EMD/
├── frontend/src/
│   ├── app/              # Composition root: App.tsx, providers/ (BecaProvider), styles/
│   ├── pages/home/       # Layout sau đăng nhập + trang chủ + danh sách việc
│   ├── pages/login/      # Màn hình đăng nhập: ui/LoginPage + model/ + api/login
│   ├── pages/work-detail/  # Chi tiết công việc + checklist/năng lượng/sự cố
│   ├── shared/           # Infrastructure, không business logic
│   │   ├── api/          # apiClient (fetch wrapper)
│   │   ├── auth/         # token + tài khoản đã lưu (localStorage)
│   │   ├── config/       # env (VITE_*)
│   │   ├── theme/        # palette + becaTheme (antd ThemeConfig) + variables.css
│   │   ├── ui/           # UI kit kiểu beca-ui: button, tag, card, input, table
│   │   └── lib/          # utils thuần (format-date...)
│   ├── entities/work/     # Domain model + API + query hooks của công việc
│   ├── features/         # (tạo khi có user action dùng ở 2+ nơi)
│   └── main.tsx          # entry, import App từ @/app
└── backend/src/
    ├── main.ts           # bootstrap: prefix /api, CORS, ValidationPipe, HttpExceptionFilter
    ├── app.module.ts     # root module + JwtAuthGuard toàn cục
    ├── config/           # configuration.ts (typed env via @nestjs/config)
    ├── common/           # crypto/PasswordService, filters/, decorators/ (@Public, @CurrentUser)
    ├── prisma/           # PrismaModule (global) + PrismaService
    └── modules/
        ├── health/       # GET /api/health, /api/health/db (public)
        ├── users/        # CRUD user + DTO + soft delete + khôi phục
        ├── auth/         # POST /auth/login|refresh|logout, GET /auth/me (JWT access+refresh)
        ├── groups/       # CRUD group + gán quyền/user + xoá mềm/khôi phục
        ├── permissions/  # CRUD quyền (vai trò HO/ADMIN/... + quyền theo module)
        ├── module/       # CRUD phân hệ + quyền xem theo user/group
        └── workflow/     # Module Quy trình vận hành (works/category/status/...): phần legacy
```

### Quy tắc FSD (frontend)
- Import 1 chiều: `app → pages → features → entities → shared`. Cấm cross-import cùng layer.
- Mỗi slice export qua `index.ts` (public API), không import sâu vào file nội bộ.
- Pages-first: code ở `pages/` trước, chỉ extract khi tái dùng thật ở 2+ nơi.
- Không tạo `widgets/` mặc định; không gom file kiểu `types.ts`/`utils.ts` (đặt tên theo domain).
- Assets để cạnh code dùng nó (`pages/home/assets/`), dùng chung mới lên `shared/`.

## Chạy

### Frontend
```bash
cd frontend
pnpm install
pnpm dev      # http://localhost:5173
pnpm build
```
Env (`VITE_*`): `VITE_APP_NAME`, `VITE_APP_ENV`, `VITE_API_URL`, `VITE_PORT`.
Dùng: `import { env } from '@/shared/config'` và `import { apiClient } from '@/shared/api'`.

### UI kit (phong cách beca-ui)
- Nền **antd v5** + theme tái hiện `themeConfig` của beca-ui: primary `#2174cd`
  (thang info 8 bậc), success `#3f9b53`, warning `#f5b128`, danger `#f42020`,
  text `#10142f`, bg `#f3f5f9` — xem `src/shared/theme/`.
- `BecaProvider` (`src/app/providers/`): bọc antd ConfigProvider + theme + locale
  `vi | en`, tương đương ConfigProvider của beca-ui.
- Components (`src/shared/ui/`, API giống beca-ui): `Button` (variant
  `primary|dashed|text|link|filled|filledOutlined|outlined`, status
  `success|info|warning|danger`, size `small|medium|large`), `Tag`, `Card`/`BodyCard`,
  `Input` (+ Password/Search/TextArea), `Table`.
- Trang `pages/home` là showcase demo toàn bộ kit: `pnpm dev` để xem.

### Backend
```bash
cd backend
pnpm install                       # tự approve build scripts của prisma (đã lưu sẵn)
cp .env.example .env               # sửa DATABASE_URL
pnpm prisma:migrate --name init    # sinh prisma/migrations + tạo ~24 bảng
pnpm prisma:seed                   # nạp 7 quyền + admin + 8 module (prisma db seed)
pnpm start:dev                     # http://localhost:3000/api
pnpm prisma:studio
```
Env: `PORT`, `API_PREFIX`, `DATABASE_URL`, `DIRECT_URL`, `FRONTEND_URL`,
`JWT_SECRET`, `JWT_EXPIRES_IN` (access, vd `15m`), `JWT_REFRESH_SECRET`,
`JWT_REFRESH_EXPIRES_IN` (vd `7d`), `PASSWORD_PEPPER`, `BCRYPT_ROUNDS`,
`UPLOAD_DIR` (thư mục lưu ảnh, vd `uploads`), `UPLOAD_BASE_PATH` (tiền tố path
lưu trong DB, phải khớp `UPLOAD_DIR`), `UPLOAD_MAX_FILE_SIZE` (vd `10485760`),
`UPLOAD_MAX_FILES` (vd `10`).

### Bảng User (PostgreSQL qua Prisma)
`users`: accountName (unique), email (unique), password (bcrypt+pepper), fullName,
gender, birthday, address, internalPhone, phone, hireDate, userLevel,
avatarPath, signaturePath, **isDeleted** (xoá mềm), **isInvestor**
(false = nhân viên, true = chủ đầu tư — FE chia 2 tab), refreshTokenHash.
- FK droplist: `positions`, `departments` (đơn vị + đồng đơn vị chung 1 bảng),
  `user_statuses` — bảng stub `{id, code, name}`, thêm field sau.
- Quản lý trực tiếp: self-FK `managerId` → users.
- Chọn nhiều: `projects` (M2M). Nhóm: `groups` (M2M 2 chiều).
- API (cần quyền ADMIN): `GET /api/users` (?includeDeleted, **?isInvestor=true|false**
  để lấy riêng từng tab), `POST /api/users`, `PATCH /api/users/:id`,
  `DELETE` (xoá mềm), `POST /api/users/:id/restore`.

### Auth (chuẩn JWT quốc tế)
- `POST /api/auth/login` {account, password} — account nhận cả accountName/email,
  trả `{accessToken (15m), refreshToken (7d), user}`. Sai thì 401 chung chung.
- `POST /api/auth/refresh` — xoay vòng refresh token. `POST /api/auth/logout`,
  `GET /api/auth/me` — cần `Authorization: Bearer <accessToken>`.
  `/me` trả thêm `permissionCodes` (quyền gộp từ group) + `highestRank`.
- Mọi API (trừ `@Public`: login, refresh, health) đều qua `JwtAuthGuard` toàn cục.

### Phân quyền theo group (RBAC)
- Luồng đúng chuẩn bạn mô tả: **tạo account → thêm vào group (`groupIds`) →
  tự có quyền của group**. Guard nạp quyền từ group mỗi request, không cache cứng.
- Thứ bậc (rank, cao hơn = lớn hơn): **ADMIN (100) > CEO (90) > HO (80) >
  PROJECT_MANAGER (70) > TECHNICIAN (60) > SECURITY_GUARD (50) > INVESTOR (10)** —
  định nghĩa 1 nơi duy nhất ở `permissions.constants.ts` (seed + guard dùng chung).
- Gắn `@RequirePermissions('ADMIN', ...)` lên controller/handler để khoá.
  Hiện tại CRUD users/groups/permissions/modules đã khoá ADMIN.
  `req.user` luôn có `{sub, accountName, permissions[], rank}` qua `@CurrentUser()`.
- Chủ đầu tư: account nằm chung bảng users, đánh dấu `isInvestor: true`
  (+ nên cho vào group gắn quyền INVESTOR).

### Group – Permission – Module (phân hệ)
- `groups`: id, uuid (tự sinh), code, name, image, **isDeleted** + M2M 2 chiều
  với users + M2M với `permissions`. API CRUD + `DELETE` (xoá mềm) + restore.
- `permissions`: id, code (unique), name, description, **rank**. Seed sẵn 7 quyền:
  `ADMIN` (100), `CEO` (90), `HO` (80), `PROJECT_MANAGER` (70),
  `TECHNICIAN` (60), `SECURITY_GUARD` (50), `INVESTOR` (10, Chủ đầu tư).
  Gán vào group qua `permissionIds`. API CRUD (`GET /api/permissions`...).
- `modules`: id, uuid (tự sinh), code, image, vnName, engName, isDeleted +
  **quyền xem** = M2M `viewerUsers` (user) + M2M `viewerGroups` (group).
  Seed sẵn 8 module core: Quy trình, Ứng dụng, Báo cáo, Tài sản,
  Quản trị hệ thống, Cấu hình ứng dụng, Chat nội bộ, Portal chủ đầu tư.
  Admin thêm module mới tự do qua `POST /api/modules` (CRUD + restore).

### Module Quy trình (workflow)
- `workflow_categories`: id, uuid, **code** (mã riêng từng loại việc — admin điền
  sau qua API), vnName, engName, image, isDeleted. Seed sẵn 5 loại tab Ứng dụng:
  Checklist, Công việc văn phòng, Kiểm tra năng lượng, Masterplan, Sự cố hư hỏng.
- `workflow_tasks`: title, description, status (TODO/DOING/DONE/CANCELLED),
  priority, dueDate, category (FK), **assigner** (người giao = user đăng nhập,
  tự gắn), **assignee** (người thực hiện). Sửa/xoá: chỉ người giao, người thực
  hiện hoặc ADMIN.
- Tab "Công việc của tôi": `GET /api/workflow/tasks?scope=assigned` (tôi giao) |
  `?scope=executed` (tôi thực hiện) + lọc `categoryId`, `status`.
- Tab Trang chủ: `GET /api/workflow/company-profile` (thông tin công ty +
  giới thiệu app), `PUT` (ADMIN) để sửa — 1 bản ghi duy nhất.
- Categories: `GET /api/workflow/categories` (ai đăng nhập cũng xem, kèm sẵn
  `statuses` — bộ trạng thái riêng của từng loại), thêm/sửa/xoá cần ADMIN
  (xoá/khôi phục cascade mềm cả bộ status).
- **Trạng thái theo loại** (`workflow_statuses`): mỗi loại việc 1 list status
  `{code (unique trong loại), name, color, sortOrder, isDefault, isClosed}`.
  `GET /api/workflow/statuses?categoryId=` (ai đăng nhập cũng xem),
  CRUD + restore cần ADMIN. Không xoá status đang có work dùng; không chuyển
  status sang loại khác khi đã có work dùng. Seed theo từng loại: checklist +
  việc văn phòng (Mới/Đang xử lý/Hoàn thành/Yêu cầu mở lại), năng lượng
  (Mới/Đang xử lý/Hoàn thành), masterplan (Mới/Trình duyệt/Triển khai/Hoàn
  thành/Từ chối/Hủy), sự cố (Mới/Đang xử lý/Đã xử lý/Hoàn thành/Yêu cầu mở
  lại/Từ chối/Từ chối mở lại). `supportsRecurrence=true` cho checklist +
  năng lượng (hiện tab Việc lặp).
- **Công việc lặp mẫu** (checklist + kiểm tra năng lượng): work có
  `isRecurrence=true` chính là MẪU (giữ tiêu đề, nội dung, người thực hiện).
  Thông tin lặp nằm ở bảng riêng `work_recurrence_schedules` (chỉ thời gian:
  `frequency`, `weekdays` T2–CN, `monthDays` 1–31, `quarterlyMode` đầu/cuối quý,
  `yearMonth`+`yearDay`, `startDate`, `endType` NEVER/ON_DATE + `endDate`,
  `isActive`, `nextRunAt`) — 1 mẫu ↔ 1 schedule. Tạo mẫu: `POST /works` với
  `isRecurrence + recurrence: {...}` lồng nhau; PATCH lồng `recurrence` để sửa
  từng phần (tắt cờ mẫu → xoá schedule). Cron mỗi giờ quét mẫu + đọc schedule
  để copy thành work con (`recurrenceId` trỏ về mẫu + `scheduledDate`, unique
  chống sinh đôi, đuổi tối đa 20 kỳ/lần, ON_DATE quá hạn tự tắt).
  `GET /works?isRecurrence=true&categoryId=`;
  `GET /works/:id/recurrence-preview?count=`; `POST /works/:id/generate`
  (người giao mẫu hoặc ADMIN).
- **Bảng `works`**: title, description, categoryId (**lọc theo loại việc**),
  assignerId (**người giao — 1 người duy nhất = user đăng nhập, tự gắn**),
  **handlers** (người thực hiện — nhiều người qua bảng trung gian
  `work_handlers`, FK 2 chiều + index; không lưu chuỗi `id1;id2`),
  followers (người theo dõi, M2M), startDate, endDate, completedAt
  (hoàn thành thực tế), progress 0–100, status, siteId (thuộc site nào),
  location (vị trí), incidentTypeId (phân loại sự cố), priority, isDeleted.
  `GET /api/workflow/works?categoryId=&statusId=&overdue=true&scope=assigned|handled|followed&page=&limit=`
  (`overdue=true`: quá `endDate` mà trạng thái chưa đóng — mỗi loại việc 1 tab
  Trễ hạn ở FE; phân trang 20/trang, max 100 — bắt buộc vì ~1000 việc/ngày).
  Tạo/sửa gửi `handlerIds: number[]` (tối đa 20) + `statusId` (thuộc đúng loại;
  bỏ trống → tự gắn status mặc định của loại; đổi loại mà không gửi statusId mới
  → tự reset về mặc định loại mới).
  Sửa/đổi trạng thái: người giao, người thực hiện hoặc ADMIN. Xoá: chỉ người
  giao hoặc ADMIN (người thực hiện chỉ hoàn thành việc, không xoá việc).
- Droplist `sites` (`/api/workflow/sites`) và `incident_types`
  (`/api/workflow/incident-types`): CRUD + xoá mềm/khôi phục (sửa cần ADMIN).
- **Chi tiết sự cố hư hỏng** (`incident_details`, 1-1 với work):
  `GET/PUT /api/workflow/works/:workId/incident-detail` gồm beforeImages/
  afterImages (mảng path ảnh), phase, rbfRbw, unit, **locationId** (FK cây vị
  trí) + **locationName** (đường dẫn denormalize), **assetId** (FK tài sản) +
  **relatedAsset** (nhãn denormalize), repairType (phân loại sửa chữa), damageType
  (phân loại hư hỏng), cause (nguyên nhân), picUnit (đơn vị phụ trách),
  solution (giải pháp), nextWork (**text thuần**), reopenCount (số lần mở lại),
  notes + isDeleted. Work trả về kèm sẵn `incidentDetail`.
  **Flow sự cố: chọn Dự án (site) → Vị trí sự cố (cây vị trí của site đó) →
  Tài sản/Thiết bị (thuộc vị trí vừa chọn)**. Backend chặn sai quy tắc: vị trí
  phải thuộc đúng site của work, tài sản phải thuộc đúng vị trí.
  3 field **phân loại sửa chữa · phân loại hư hỏng · đơn vị phụ trách (PIC)** lấy
  từ droplist (`repairTypeId` / `damageTypeId` / `picUnitId`); backend tự điền
  nhãn denormalize (`repair_type` / `damage_type` / `pic_unit`) và chặn id
  không tồn tại. Bộ field chi tiết sự cố giống nhau ở màn tạo và màn sửa trực
  tiếp tại trang chi tiết.
- **Module Tài sản** (màn `/assets/*` trong menu Tài sản):
  - **`site_locations`** — cây vị trí theo site (`parentId` tự tham chiếu,
    `siteId` bắt buộc). `GET /api/workflow/site-locations?siteId=` trả **cây**;
    thêm/sửa/xoá mềm (xoá kéo cả cây con), chặn vòng lặp và vị trí cha khác site.
  - **`assets`** — code (unique), name, usageDate (ngày sử dụng), usageStatusId
    (trạng thái dùng), categoryId (danh mục tài sản), locationId (vị trí),
    supplier (nhà cung cấp), origin (xuất xứ), model, quantity + unitId
    (đơn vị tính), warrantyEnd (hạn bảo hành), conditionId (tình trạng),
    remarks, detail (thông tin chi tiết, text tự do), **latitude/longitude
    Decimal(10,7)** (toạ độ đặt tài sản — chọn trên bản đồ Leaflet ở form tài sản).
    `GET /api/workflow/assets?siteId=&locationId=&categoryId=&keyword=` lọc
    theo dự án / vị trí / danh mục / trạng thái / tình trạng / từ khoá.
  - **Tem QR tài sản + sự cố theo tài sản** — QR chứa URL
    `{FE}/assets/:id` (dựng bằng `QRCode` của antd, tải PNG / in tem ngay trên
    modal `AssetQrModal`). Quét tem → trang `AssetDetailPage`: hồ sơ tài sản +
    bản đồ vị trí + bảng sự cố liên quan lấy từ
    `GET /api/workflow/works?assetId=` (index `incident_details_asset_id_idx`).
  - **Droplist dùng chung toàn hệ thống** — 1 service + 1 controller cho 7 bảng
    cùng shape (uuid / code? / name / isDeleted):
    `asset_categories` · `asset_units` · `asset_usage_statuses` ·
    `asset_conditions` (module Tài sản) + `repair_types` · `damage_types` ·
    `pic_units` (module Ứng dụng) →
    `GET/POST/PATCH/DELETE /api/workflow/droplists/:key` với key =
    `category` | `unit` | `usageStatus` | `condition` | `repairType` |
    `damageType` | `picUnit`. `GET /api/workflow/droplists/meta` trả key +
    label + module để client dựng card nhập liệu.
  - Seed dữ liệu mẫu (droplist + cây vị trí + 6 tài sản):
    `node_modules/.bin/tsx prisma/seed-assets.ts`.
- **Masterplan 3 cấp**: `masterplan_systems` (level 1: code/vnName/engName/image,
  gắn workId) → `masterplan_categories` (level 2: systemId) →
  `masterplan_tasks` (level 3: title, pic, frequency, formTemplate,
  classification, **planData** JSON).
  `GET /api/workflow/masterplan-systems/:id` trả **full cây** 3 tầng.
  Xoá/khôi phục cascade cả cây. System/category sửa cần ADMIN, task ai cũng được.
  Shape `planData`: `{ "2026": { "1": { "1": { plan: true, actual: false } } } }`
  (năm → tháng → tuần → kế hoạch/thực tế), type `MasterplanData` trong
  `workflow.constants.ts`.
- **Checklist cây cha-con** (`checklist_items`, gắn `workId`): title (row cha chỉ
  cần mỗi field này), standard (tiêu chuẩn kiểm tra), **valueType**
  (BOOLEAN/TEXT/NUMBER — quyết định kiểu của cột Giá trị), value, **result**
  (`PASS` = Đạt / `FAIL` = Không đạt / null = chưa đánh giá), quantity, attachments
  (mảng path file), photoLat/photoLng/photoTakenAt (vị trí + thời điểm chụp),
  checkpoint, status, notes, sortOrder + `parentId` (null = cha gốc).
  `GET /api/workflow/checklists?workId=` trả **cây lồng nhau** (`children`),
  `GET ?unattached=true` trả **thư viện mẫu** (node `workId` null: node gốc là
  tên danh mục mẫu, cây con là nội dung dùng để nạp).
  POST/PATCH/DELETE (`DELETE` xoá mềm **cả cây con**, restore cũng vậy).
  Row con bắt buộc cùng work với cha, không tự làm cha của mình.
  Nội dung 1 dòng gồm 8 trường: **Tên** · **Tiêu chuẩn kiểm tra** · **Số lượng**
  · **Giá trị** · **Đính kèm** · **Checkpoint** (lat/long thiết bị) ·
  **Trạng thái** (Đạt/Không đạt) · **Ghi chú**; thêm `valueType` quyết định
  kiểu của cột Giá trị (BOOLEAN/TEXT/NUMBER).
  Màn tạo công việc chỉ **nạp từ mẫu** (bảng xem trước, không sửa): mẫu mang
  sẵn Tên + Tiêu chuẩn kiểm tra + Loại giá trị, còn Số lượng, Giá trị, Đính
  kèm, Checkpoint, Trạng thái Đạt-Không đạt và Ghi chú để **rỗng**, nhập lúc
  đi kiểm tra.
  **Quản lý mẫu trên giao diện**: màn `/app/checklist-templates` (module
  Ứng dụng → Mẫu checklist) — 3 cấp: Mẫu → Nhóm công việc → Nội dung con, mỗi
  cấp thêm/sửa/xoá riêng (xoá mẫu/nhóm sẽ xoá luôn cây con vì
  `DELETE /workflow/checklists/:id` cascade). Mẫu chỉ nhập 4 field
  (Tên · Tiêu chuẩn kiểm tra · Loại giá trị · Số lượng).
  Ngoài ra vẫn nạp được từ file: `tsx prisma/import-checklist-template.ts
  [path.json]` (`FORCE=1` để xoá tạo lại mẫu trùng tên); mẫu mẫu nằm ở
  `prisma/templates/checklist-van-sinh.json`.
- **Kiểm tra năng lượng** (đồng hồ → chỉ số khung giờ):
  `energy_checks` chỉ còn làm **container ẩn** 1 check/work (không nhập "đợt
  kiểm tra" nữa), `energy_meters` (meterCode, **location = khách hàng**,
  meterType ĐIỆN/NƯỚC/DẦU DO, attachments, checkpoint, notes),
  `energy_readings` (khung giờ: phase BÌNH THƯỜNG/CAO ĐIỂM/THẤP ĐIỂM, startIndex,
  endIndex, **total tự tính** = cuối − đầu).
  Quy tắc: nước/dầu DO chỉ 1 khung giờ bình thường; điện **1 hoặc 3 khung
  giờ** (bình thường · thấp điểm · cao điểm, thêm/xoá ở màn tạo việc); mỗi
  khung 1 lần/đồng hồ; chỉ số cuối >= đầu.
  Lúc tạo việc **chỉ nhập mã đồng hồ · vị trí · loại**; khung giờ, chỉ số, ảnh
  và ghi chú nhập lúc đi kiểm tra.
  `POST /api/workflow/energy-checks` tạo cả container + đồng hồ + chỉ số trong
  1 call; `POST /api/workflow/energy-meters/:id/readings` thêm khung giờ sau.
- **Ảnh đính kèm** (`checklist_items.attachments`, `energy_meters.attachments`):
  `POST /api/uploads/images` nhận multipart field `files` (nhiều ảnh/lần, tối đa
  10 file × 10MB, **chỉ nhận ảnh** và kiểm tra magic bytes chống file giả đuôi).
  File lưu ở `backend/uploads/YYYY/MM/<uuid>.<ext>` — **ngoài `public`**, tên file
  là uuid nên không trùng và không lộ tên thật lên URL. API trả về
  `{ path, name, mimeType, size, photoLat?, photoLng?, photoTakenAt? }`; client đưa
  `path` vào mảng `attachments` khi tạo dòng. Ba field `photo*` do client (điện
  thoại) gửi kèm, server chỉ echo lại để client điền vào `checklist_items`.
  Đọc ảnh: `GET /api/uploads/file?path=/uploads/YYYY/MM/<uuid>.<ext>` — có
  `JwtAuthGuard` nên phải kèm Bearer token; vì vậy frontend tải ảnh qua blob
  (`shared/lib/image-blob.ts`) chứ không gán thẳng path vào `<img src>`.
- **Mọi bảng đều có `isDeleted`** (kể cả droplist positions/departments/projects/
  user_statuses/permissions/company_profile); query mặc định ẩn bản ghi đã xoá.

### Quy tắc nghiệp vụ công việc đang áp dụng (server kiểm tra)

Toàn bộ rule nằm trong `backend/src/modules/workflow/work-rules.ts` (hàm thuần,
có unit test), service chỉ lo đọc/ghi dữ liệu:

- **Quyền xem**: user chỉ thấy việc liên quan (mình giao / mình thực hiện / mình
  theo dõi). `GET /workflow/works/:id` trả 403 nếu không liên quan và không phải
  ADMIN. Danh sách cũng tự giới hạn theo quan hệ (trừ ADMIN).
- **Quyền sửa/đổi trạng thái**: người giao + người thực hiện + ADMIN. Người theo
  dõi chỉ xem. **Quyền xoá: người giao + ADMIN**.
- **Kiểm tra dữ liệu khi tạo/sửa**: loại việc, dự án (site), phân loại sự cố,
  người thực hiện, người theo dõi phải tồn tại và chưa bị xoá; id trùng được loại;
  `endDate >= startDate` và thời điểm hoàn thành không được trước ngày bắt đầu/kết
  thúc.
- **Đổi trạng thái**:
  - Trạng thái `isClosed` là trạng thái kết thúc → chỉ ADMIN mới mở lại được
    (người thường bị 403).
  - Chuyển sang trạng thái hoàn thành (mã `HOAN_THANH`) → `progress` tự về 100 và
    ghi `completedAt`; tiến độ khác 100 bị từ chối.
  - Chuyển sang trạng thái đóng khác (Từ chối/Hủy) → giữ tiến độ, vẫn ghi
    `completedAt`.
  - Mở lại việc đã kết thúc → xoá `completedAt`.
  - Trạng thái chưa đóng mà để `progress = 100` bị từ chối.
- **Lịch sử**: mỗi lần đổi trạng thái ghi 1 dòng `work_status_histories`
  (kèm `note` = `statusNote`), viết trong **cùng transaction** với cập nhật
  công việc nên không để lại dữ liệu lệch.
- **Xoá mềm / khôi phục**: xoá mẫu lặp sẽ tắt lịch (cron không sinh thêm việc con);
  khôi phục sẽ reset về trạng thái mặc định của loại nếu trạng thái cũ đã bị xoá.
- **Checklist**: không cho đặt một dòng làm cha của chính hậu duệ của nó (chặn
  vòng lặp cây).

Chạy test:
```bash
pnpm test                                     # unit test rule
PORT=3311 node dist/main.js &                 # server thật
E2E_API=http://localhost:3311/api pnpm test:e2e  # E2E khí (tạo/giao/đổi trạng thái/xoá)
```

### Quy trình chạy lần đầu (có DB)
```bash
pnpm prisma:migrate --name init  # sinh ~24 bảng (core + workflow + works/incident/checklist/energy/masterplan + nối)
pnpm prisma:seed             # nạp 7 quyền + group/admin + 8 module core + 5 loại việc (upsert)
pnpm start:dev               # đăng nhập admin / Admin@123 (đổi ngay sau khi vào)
```

### Thêm / bớt field chuẩn (Prisma Migrate)
```bash
# 1. sửa prisma/schema.prisma
pnpm prisma:validate          # check schema hợp lệ
pnpm prisma:migrate --name add_field_x   # thêm -> ADD COLUMN, bớt -> DROP COLUMN
pnpm prisma:generate         # regen client (migrate dev đã tự gen, chạy lại cho chắc)
pnpm prisma:seed             # chỉ khi cần, seed dùng upsert nên chạy lại an toàn
```
> Không tự sync như TypeORM `synchronize:true`. Chỉ sửa schema mà không migrate thì DB giữ nguyên (bỏ field nhưng cột cũ vẫn nằm đó).
> Dev muốn sync nhanh không file migration: `pnpm prisma:push`. Prod: `pnpm prisma:migrate:deploy`.
> Prisma 7 cần driver adapter PostgreSQL (`@prisma/adapter-pg`, đã cài) —
> `PrismaService` tự lấy `DATABASE_URL` từ env, không cần config thêm.

> Ghi chú: đã bỏ file `.npmrc` (`legacy-peer-deps`) của npm — pnpm xử lý peer deps
> tốt nên không cần workaround lỗi `edgesOut` nữa. Approval cho Prisma build scripts
> được lưu trong `pnpm-workspace.yaml` + `packageManager`/`pnpm.onlyBuiltDependencies`
> nên clone mới về chỉ cần `pnpm install`.
