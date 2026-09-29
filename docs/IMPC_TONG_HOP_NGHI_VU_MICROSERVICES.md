# Tổng hợp nghiệp vụ 7 microservice IMPC và định hướng dựng source mới

> Phạm vi: `impc_asset`, `impc_library`, `impc-app`, `impc-asset`, `impc-chat`, `impc-service`, `impc-workflow`.
>
> Mục tiêu tài liệu: tóm tắt nghiệp vụ quan sát được ở hệ thống legacy và đề xuất blueprint modular monolith đơn giản cho MVP, không sao chép toàn bộ độ phình của hệ thống cũ.

---

## 1. Kết luận quan trọng nhất

Hệ thống IMPC hiện tại thực chất là một hệ sinh thái gồm 7 phần chính:

1. **Quản lý tài sản và kho**: tài sản, vật tư, vị trí, dự án, tồn kho, kiểm kê, sửa chữa, bảo hành.
2. **Thư viện tài liệu**: file, thư mục, quyền chia sẻ, phiên bản file, tài liệu công khai.
3. **Workflow/E-Office**: định nghĩa quy trình, biểu mẫu động, gửi và duyệt phiếu.
4. **Quản lý công việc**: dự án, công việc, trạng thái, người xử lý, công việc con, SLA.
5. **Chat nội bộ**: chat cá nhân, chat nhóm, chat gắn với công việc; chat workflow/tài sản là phần mở rộng.
6. **Dịch vụ liên lạc**: notification, email, FCM, realtime, nhận email, 2FA.
7. **Hạ tầng dùng chung**: danh tính, phân quyền, file, tích hợp và báo cáo.

Các phần này không độc lập. Ví dụ:

- Công việc có thể phát sinh workflow phê duyệt.
- Tài sản được thay đổi trạng thái qua workflow.
- Work có thể có chat riêng; chat Workflow/Asset là Target mở rộng, không nằm trong v1.
- Tài liệu được đính kèm vào workflow, công việc, tài sản và chat.
- Mọi thay đổi quan trọng đều có thể gửi notification.
- Người dùng, phòng ban, nhóm và quyền được dùng chung giữa các phân hệ.

Vì vậy, khi dựng source mới, không nên tạo 7 project độc lập ngay từ đầu. Nên dựng **một modular monolith** theo nghiệp vụ, nhưng giữ ranh giới module rõ ràng để sau này có thể tách thành microservices nếu cần.

---

## 2. Cách đọc tài liệu

Tài liệu chia thành ba lớp:

### 2.1. Nghiệp vụ cốt lõi

Source mới tập trung vào workflow, work cơ bản, asset cốt lõi, library file/folder/share/attachment, chat trực tiếp/nhóm/work và notification in-app/email outbox. Danh sách chuẩn duy nhất của phạm vi triển khai nằm ở mục 27; các mục khác trong tài liệu chỉ mô tả nghiệp vụ legacy hoặc target đầy đủ để tra cứu.

### 2.2. Nghiệp vụ mở rộng

Có thể làm sau MVP:

- Công việc lặp.
- Lưu đồ nhiều nhánh.
- SLA nâng cao.
- Stock, inventory và import/export.
- Tính năng tự động hóa nâng cao.
- Nhận email từ IMAP.
- Chữ ký số.
- Dashboard.
- Tích hợp cloud drive.
- Chỉnh sửa Office bằng OnlyOffice.

### 2.3. Phần không nên tái tạo nguyên trạng

- Các API key đơn giản dùng chung cho mọi service.
- Secret nằm trong source hoặc appsettings.
- `EnsureCreated` kèm chạy toàn bộ file SQL mỗi lần khởi động.
- Bảng dynamic tạo theo tên workflow.
- Dữ liệu nghiệp vụ nằm rải rác trong hàng trăm stored procedure.
- Hai bản controller Web/Mobile gần như giống nhau.
- Hai bản implementation phân quyền hoặc trạng thái đã bị phân kỳ.
- Các tính năng UI còn tồn tại nhưng backend đã bị vô hiệu hóa.

### 2.4. Cách phân biệt Legacy và Target

- **Legacy quan sát được** chỉ mô tả hành vi có bằng chứng trong source; không mặc định đồng nhất với source mới.
- **Target** là quyết định thiết kế cho modular monolith. Rule Target không được ghi nhận là rule legacy.
- Tính năng tồn tại trong legacy nhưng không nằm trong v1 được nêu rõ là **không migrate sang v1**.
- Khi legacy có nhiều cách xử lý, Target phải chọn một rule cụ thể; ví dụ Chat không sao chép mặc định soft-delete/recall một giờ nếu rule mới đã chốt khác.

Các dấu hiệu quan sát được chính:

- Workflow legacy có definition/step, form động, task, lịch sử và nhiều cơ chế giao/phê duyệt.
- Work legacy có project, status theo dự án, work cha/con, participant, checklist, lặp và workflow gắn với công việc.
- Asset legacy có master data, vòng đời, stock, inventory, QR, import/export và workflow; hai repository gần như trùng nhau.
- Library legacy có file, folder, permission, version và public access.
- Chat legacy có direct/group/work chat, read state, mute/archive, file/mention và realtime; source có thể soft-delete chat và giới hạn recall message khoảng một giờ.
- Service legacy có notification, email, FCM, realtime, nhận email, 2FA và Smart CA.

Target không mặc định sao chép checklist, stock/inventory/import-export, reaction/forward/pin, FCM hoặc các rule thời gian legacy vào MVP v1; các phần này được đưa sang v2/v3 ở mục 28-29.

---

# PHẦN I — LEGACY QUAN SÁT ĐƯỢC VÀ TARGET ĐẦY ĐỦ THEO MODULE

Trong phần này, các tên và hành vi được ghi rõ là **legacy quan sát được** chỉ dùng để đối chiếu. Các model, invariant và phạm vi ghi là **Target** là thiết kế mới; phần target đầy đủ có thể bao gồm phase sau và không phải danh sách MVP v1.

## 3. `impc-app` — Workflow/E-Office

### 3.1. Mục đích

`impc-app` là phân hệ tạo và vận hành quy trình nghiệp vụ động.

**Legacy quan sát được:** source có definition/step, form động, task/inbox, history và nhiều đường giao/phê duyệt. **Target v1** giữ state machine cơ bản, action matrix, access/seen tối thiểu và bỏ các cơ chế động/resource phức tạp; target đầy đủ ở §3.4 không phải một danh sách MVP thứ hai.

Phân hệ này không chỉ tạo một form duyệt tài liệu thông thường mà còn cho phép:

- Mỗi loại phiếu có một quy trình riêng.
- Các trường nghiệp vụ được cấu hình động.
- Một phiếu đi qua nhiều bước.
- Bước sau có thể giao cho người dùng, nhóm, phòng ban, quản lý hoặc người giao việc.
- Có thể duyệt, trả lại, từ chối, nhớ lại, bổ sung hoặc yêu cầu thay thế.
- Dữ liệu phiếu, lịch sử bước, tài liệu và file được quản lý động; checklist động thuộc v2.

### 3.2. Target v1 của Workflow

#### 3.2.1. Mẫu quy trình

Quản trị viên tạo một mẫu quy trình gồm:

- Mã và tên quy trình.
- Mô tả.
- Các trường dữ liệu cần thu thập.
- Các bước xử lý.
- Người hoặc nhóm phụ trách từng bước.
- Điều kiện chuyển bước.
- Action cho phép tại mỗi bước.
- Tài liệu bắt buộc; checklist động thuộc v2.
- Thời hạn xử lý nếu có.

Mẫu đã phát hành không nên sửa trực tiếp. Khi cần thay đổi phải tạo phiên bản mới, để các phiếu đang chạy tiếp tục dùng đúng phiên bản cũ.

#### 3.2.2. Form động

Target v1 chỉ cần các loại trường phổ biến:

- Một dòng.
- Nhiều dòng.
- Số.
- Tiền tệ.
- Ngày/giờ.
- Lựa chọn một giá trị.
- Có/Không.
- Người dùng.
- Tra cứu từ một danh mục nội bộ.
- File đính kèm.

Không cần tái tạo toàn bộ cơ chế công thức, JavaScript, gọi API tùy ý và bảng dynamic của hệ thống cũ ở phiên bản đầu.

Dữ liệu form nên lưu dưới dạng JSON có cấu trúc, nhưng các trường cốt lõi dùng để tìm kiếm và báo cáo như mã phiếu, trạng thái, người tạo, ngày tạo, người xử lý phải được lưu bằng cột riêng.

#### 3.2.3. Tạo phiếu

Người dùng tạo phiếu:

1. Chọn loại quy trình.
2. Điền dữ liệu.
3. Lưu nháp hoặc gửi ngay.
4. Hệ thống chụp phiên bản quy trình.
5. Hệ thống kiểm tra dữ liệu bắt buộc.
6. Hệ thống tạo bước xử lý đầu tiên.
7. Người được giao nhận task.
8. Các module liên quan nhận event để tạo notification.

#### 3.2.4. Action matrix Target

| Action | Ai được phép | Tác động Target |
|---|---|---|
| Save Draft | Initiator | Cập nhật bản nháp; chỉ Initiator sửa form ở trạng thái Draft hoặc Returned |
| Submit | Initiator | Chuyển Draft/Returned sang bước đầu tiên và tạo task |
| Approve | Active assignee có `UserStatus = Active` | Đóng task hiện tại; chuyển bước hoặc hoàn thành instance |
| Return | Active assignee có `UserStatus = Active` | Đóng task hiện tại, tra quyền sửa form cho Initiator; khi Submit lại thì resume về đúng bước trước |
| Reject | Active assignee có `UserStatus = Active` | Đóng task hiện tại và mọi task đang mở; chuyển instance sang Rejected |
| Recall | Initiator | Đóng task đang mở và chuyển instance về Draft để sửa |
| Cancel | Initiator | Đóng task đang mở và chuyển instance sang Cancelled |

Target không dùng rule legacy để coi mọi actor là người xử lý. Chức năng bổ sung thông tin, thay thế, delegate, bypass và nhiều nhánh song song thuộc phase sau.

#### 3.2.5. Giao task và claim task

Target v1 hỗ trợ:

- Người cụ thể.
- Nhóm.
- Phòng ban.
- Quản lý trực tiếp.
- Người tạo.
- Người được chọn khi gửi phiếu.

Task giao trực tiếp có một active assignee. Task giao cho group/department bắt buộc dùng `ClaimTask` với optimistic concurrency; sau claim, task có đúng một active assignee và những user khác không thể claim lại. Chỉ user active mới được giao hoặc claim.

Mỗi task phải ghi rõ người được giao, người thực hiện, thời điểm nhận, hạn xử lý, kết quả, ý kiến và thời điểm hoàn thành.

#### 3.2.6. Trạng thái workflow

Trạng thái Target v1:

```text
Draft -> InProgress -> Approved
                  -> Returned -> InProgress
                  -> Rejected
Draft/InProgress -> Cancelled
```

Quy tắc:

- Chỉ Initiator được sửa Draft/Returned.
- Chỉ active assignee của task hiện tại được Approve/Return/Reject.
- Return phải ghi bước resume trước khi đóng task và tra quyền sửa cho Initiator.
- Approve bước cuối mới chuyển phiếu sang Approved.
- Reject, Recall hoặc Cancel phải đóng các task còn mở.
- Không được xử lý hai lần cùng một task.
- Mọi action phải ghi lịch sử.

### 3.3. Liên kết với các phân hệ khác

Workflow là lớp nghiệp vụ dùng chung. Ví dụ:

- Tài sản tạo phiếu cấp phát, thu hồi, sửa chữa, bảo hành, thanh lý.
- Công việc có thể tạo phiếu xin phê duyệt thay đổi người xử lý.
- Tài liệu workflow được lưu trong Library.
- Workflow/chat theo context là phần mở rộng; v1 chỉ giữ Work chat, không tạo chat workflow/asset trong danh sách chuẩn.
- Khi có task mới hoặc trạng thái đổi, hệ thống tạo notification.

### 3.4. Phạm vi nghiệp vụ đầy đủ của Workflow (bao gồm phần mở rộng)

Phạm vi Target đầy đủ có:

- Mẫu quy trình và phiên bản.
- Form động cơ bản.
- Tạo/lưu/gửi phiếu.
- Giao task và claim task cho group/department.
- Approve/Return/Reject/Recall/Cancel.
- Inbox task.
- Lịch sử xử lý.
- File đính kèm.
- Quyền xem/chia sẻ/mark-seen tối thiểu.
- Audit security và `WorkflowTransition` cho lịch sử nghiệp vụ.
- Notification qua outbox.

Không cần trong MVP:

- Raw SQL.
- Dashboard tự xây dựng bằng query.
- Công thức và script tùy ý.
- Tạo bảng dynamic.
- Resource/application framework.
- Trigger tự động phức tạp.
- Mobile-native.

Trước khi publish một `WorkflowVersion`, Target phải validate: `Key` của definition duy nhất, `(WorkflowDefinitionId, Version)` duy nhất, đúng một initial step, mọi step/transition/action được tham chiếu đều tồn tại, action hợp lệ với actor và published version là bất biến.

Target có `WorkflowAccessDefinition` cấp quyền theo definition/instance. `WorkflowInstanceShare` và `WorkflowInstanceSeen` là dữ liệu runtime tối thiểu cho quyền share/seen; không cần resource framework tổng quát trong v1.

---

## 4. `impc-workflow` — Quản lý công việc

> Tên repository có dấu gạch dưới ở code là `IMPC_Work`. Hệ thống này khác `impc-app`: `impc-app` là workflow/E-Office, còn `impc-workflow` là quản lý dự án và công việc vận hành.

### 4.1. Mục đích

**Legacy quan sát được:** Work có project, status theo dự án, work cha/con, participant, SLA, checklist, công việc lặp và workflow. **Target v1** giữ project/work/status/participant/transition/file/history/Work chat; checklist, lặp và SLA nâng cao thuộc v2. Target đầy đủ ở §4.12 không phải danh sách MVP thứ hai.

Phân hệ quản lý:

- Dự án.
- Công việc.
- Công việc cha/con.
- Trạng thái công việc theo dự án.
- Người giao, người xử lý, người theo dõi, người phối hợp.
- Lịch trình và SLA.
- Tài liệu; checklist ở phase mở rộng.
- Công việc lặp.
- Quyền xem theo dự án, vị trí và vai trò.
- Chat gắn với công việc.

### 4.2. Dự án

Dự án là nơi gom nhóm công việc và cấu hình vận hành của công việc.

Thông tin cơ bản:

- Mã và tên dự án.
- Người quản lý.
- Nhóm/phòng ban tham gia.
- Người được xem công việc.
- Có áp dụng SLA hay không.
- Có tự thêm toàn bộ thành viên vào dự án hay không.
- Các trạng thái công việc được phép dùng.
- Cách gán người xử lý mặc định.
- Các cột/form mặc định khi tạo công việc.

### 4.3. Công việc

Mỗi công việc nên có các thông tin cốt lõi:

- Mã và tiêu đề.
- Mô tả và dữ liệu động.
- Dự án thuộc về.
- Công việc cha.
- Trạng thái hiện tại.
- Người tạo.
- Người giao.
- Người xử lý.
- Người theo dõi.
- Người phối hợp.
- Ngày bắt đầu.
- Hạn hoàn thành.
- Tiến độ.
- Trạng thái active/deleted.
- File; checklist động ở v2.
- Lịch sử thay đổi.

### 4.4. Trạng thái công việc

Trạng thái phải được cấu hình theo dự án thay vì hard-code toàn hệ thống.

Một trạng thái có thể cấu hình:

- Tên trạng thái.
- Nhóm trạng thái: mới, đang xử lý, hoàn thành, từ chối.
- Trạng thái đầu.
- Có được dùng cho công việc con hay không.
- Cách xác định người xử lý.
- Có bắt buộc file khi hoàn thành hay không.
- Có yêu cầu hoàn thành công việc con trước hay không.
- Có phải trạng thái cuối hay không.
- SLA của trạng thái.
- Action cho phép.

Nhóm trạng thái tối thiểu:

```text
New
InProgress
Completed
Rejected
Cancelled
```

### 4.5. Gán người xử lý

Target v1 hỗ trợ các quy tắc:

- Người giao.
- Người tạo.
- Người xử lý hiện tại.
- Trưởng phòng.
- Quản lý trực tiếp.
- Người quản lý dự án/vị trí.
- Người giao của công việc cha.
- Người được chọn khi tạo.
- Danh sách được cấu hình.

Khi đổi trạng thái, hệ thống có thể tính lại người xử lý theo trạng thái mới. Mọi rule gán phải loại được user không active; nếu không có ứng viên hợp lệ thì task/transition không được commit.

### 4.6. Công việc cha/con

Công việc cha dùng để gom nhiều công việc nhỏ.

Quy tắc:

- Mỗi công việc có tối đa một công việc cha trực tiếp.
- Không tạo chu trình trong cây công việc.
- Công việc cha có thể chỉ hoàn thành khi tất cả công việc con bắt buộc đã hoàn thành.
- Khi công việc con hoàn thành, hệ thống kiểm tra lại công việc cha.
- Không xóa cha nếu còn công việc con; chỉ soft-delete và xử lý cây con khi được phép.

### 4.7. Đổi trạng thái công việc

Luồng chuẩn:

1. Kiểm tra người dùng có quyền với công việc.
2. Load `WorkItem` và kiểm tra trạng thái đích/người xử lý hợp lệ.
3. Kiểm tra transition, file, `RequiredChild` và các guard.
4. Xác định transition hoặc đổi assignee có cần approval hay không.
5. Nếu cần approval, tạo `WorkOperation` ở trạng thái `PendingApproval` rồi commit; chưa sửa `WorkItem`.
6. `Reject/Cancel`: đóng `WorkOperation`, không apply payload.
7. `Approved`: trong transaction mới, kiểm tra operation còn hợp lệ, optimistic concurrency/version và guard; chỉ khi đó mới apply status/assignee.
8. Nếu không cần approval, apply trực tiếp trong transaction.
9. Ghi `WorkTransition`/`WorkHistory` và tính tiến độ nếu hoàn thành.
10. Gán lại người xử lý active nếu cấu hình yêu cầu.
11. Kiểm tra `RequiredChild`/`AutoCompleteParent` nếu parent cần.
12. Gửi notification và cập nhật cây công việc/thống kê sau khi transaction thành công.

Điều kiện trước khi hoàn thành:

- Nếu yêu cầu file bắt buộc thì phải có file.
- Nếu yêu cầu hoàn thành công việc con thì tất cả công việc con bắt buộc phải hoàn thành.
- Không cho hoàn thành nếu công việc đang bị khóa bởi một yêu cầu thay đổi người xử lý chưa được duyệt, trừ khi chính sách cho phép.

### 4.8. Target v1 — SLA cơ bản

Target v1 chỉ cần:

- Hạn hoàn thành trực tiếp trên công việc.
- Khi đổi trạng thái, có thể tính lại hạn dựa trên SLA của trạng thái.
- Hiển thị cảnh báo sắp đến hạn và quá hạn.

Không cần tái tạo toàn bộ cơ chế ưu tiên đa tầng của hệ thống cũ.

### 4.9. Target v2 — Checklist đầy đủ

Checklist là nghiệp vụ legacy quan sát được nhưng **không nằm trong MVP v1**; v1 chỉ dùng file làm tài liệu đính kèm. Checklist đầy đủ gồm:

- Danh mục checklist.
- Các mục checklist theo cây.
- Kiểu dữ liệu: text, số, có/không, ảnh, file.
- Bắt buộc/không bắt buộc.
- Giá trị kỳ vọng.
- Giá trị thực tế.
- Người thực hiện.
- Thời điểm cập nhật.
- Ghi chú và file.

Ngay cả ở v2, chưa cần chức năng đo điện/nước, bán kính GPS hoặc tự hoàn thành công việc theo checklist.

### 4.10. Target v2 — Công việc lặp

Đưa sau MVP v1:

- Mẫu công việc lặp.
- Tần suất theo ngày/tuần/tháng.
- Tự sinh công việc mới.
- Clone checklist và cấu hình liên quan.
- Nhắc người xử lý.

### 4.11. Phân quyền công việc

Target v1 dùng quyền theo vai trò:

| Vai trò | Xem | Sửa | Đổi trạng thái | Quản trị |
|---|---:|---:|---:|---:|
| Không liên quan | Không | Không | Không | Không |
| Người theo dõi/phối hợp | Có | Không | Không | Không |
| Người xử lý | Có | Có | Có | Không |
| Người giao | Có | Có | Có | Không |
| Quản lý dự án/vị trí | Có | Có | Có | Có |
| Quản trị hệ thống | Theo chính sách | Theo chính sách | Theo chính sách | Có |

Quyền phải được kiểm tra ở server. Không được chỉ ẩn nút trên giao diện.

### 4.12. Phạm vi nghiệp vụ đầy đủ của Work (bao gồm phần mở rộng)

Phạm vi Target đầy đủ có:

- Dự án, participant, status và transition theo dự án.
- Công việc thường và công việc cha/con.
- Gán người xử lý theo rule và chỉ gán user active.
- Đổi trạng thái có guard.
- File trong v1; checklist động ở v2.
- SLA cơ bản và nâng cao ở phase sau.
- Lịch sử thay đổi, inbox và notification.
- Work chat trong v1.
- Công việc lặp ở v2.

Checklist và công việc lặp đã quan sát được ở legacy nhưng không được tính vào v1.

---

## 5. `impc_asset` và `impc-asset` — Quản lý tài sản

Hai repository này có nghiệp vụ gần như trùng nhau: cùng là phân hệ tài sản, cùng dựa trên workflow/dynamic data và cùng phụ thuộc Library/Service API. Khi xây source mới chỉ nên giữ một module Asset.

### 5.1. Mục đích

**Legacy quan sát được:** Asset có master data, vòng đời, workflow, stock, inventory, QR, import/export và dashboard. **Target v1** giữ Asset vật lý, vòng đời cốt lõi, operation/lifecycle/history và attachment; stock/inventory/import-export/QR/dashboard thuộc v2. Target đầy đủ ở §5.13 không phải danh sách MVP thứ hai.

Phân hệ tài sản quản lý:

- Tài sản cố định.
- Vật tư/hàng hóa.
- Danh mục và model.
- Dự án và vị trí.
- Nhà cung cấp.
- Người sử dụng tài sản.
- Vòng đời cấp phát, thu hồi, bàn giao.
- Sửa chữa, bảo hành, bảo trì.
- Hỏng, mất, thanh lý, hủy.
- Tồn kho, nhập kho, xuất kho, chuyển kho.
- Kiểm kê.
- Lịch sử thay đổi.
- File, QR và báo cáo.

### 5.2. Danh mục và model

Cấu trúc tối giản:

```text
Category (danh mục)
  └── Model (mẫu/loại tài sản)
        └── Asset hoặc StockItem
```

Quy tắc:

- Category không xóa nếu còn Model.
- Model không xóa nếu còn Asset hoặc StockItem.
- Model thuộc đúng một Category.
- Mã Category và Model phải duy nhất trong phạm vi cấu hình.
- Model có thể thuộc loại `Asset` hoặc `Supply`.

Không cần tự tạo workflow riêng cho mỗi Category ở MVP. Nếu cần form riêng, dùng bộ trường bổ sung do Category quy định.

### 5.3. Dự án và vị trí

Dự án xác định phạm vi quản lý.

Vị trí là cây phân cấp:

- Mỗi vị trí có parent.
- Mỗi vị trí thuộc dự án.
- Mỗi vị trí có thể được đánh dấu là kho.
- Vị trí có thể có tọa độ.
- Không tạo chu trình trong cây vị trí.
- Không xóa vị trí nếu còn vị trí con, tài sản hoặc tồn kho.

### 5.4. Tài sản

Thông tin cốt lõi:

- Mã tài sản.
- Tên.
- Category.
- Model.
- Dự án.
- Vị trí.
- Người sử dụng.
- Trạng thái.
- Ngày đưa vào sử dụng.
- Ngày ngừng sử dụng.
- Giá trị/tiền tệ nếu cần.
- Tài sản cha.
- File.
- Ghi chú.
- Người tạo, người sửa.

ID tài sản phải là định danh ổn định. Không dùng workflow ID làm ID nghiệp vụ chính như hệ thống cũ. `Asset` là một tài sản vật lý và luôn có `Quantity = 1`; vật tư theo số lượng thuộc `StockItem`/`StockBalance`, không dùng nhiều `Asset` để đại diện cho tồn kho.

### 5.5. Vòng đời tài sản

Trạng thái Target v1:

| Nhóm | Trạng thái |
|---|---|
| Chưa sử dụng | `NotInUse` |
| Đang sử dụng | `InUse` |
| Bảo trì/sửa chữa | `UnderMaintenance`, `UnderRepair` |
| Bảo hành | `UnderWarranty` |
| Hỏng/mất | `Broken`, `Missing` |
| Kết thúc | `Liquidated`, `Destroyed`, `Cancelled` |

Không cho sửa trực tiếp trạng thái nếu trạng thái phải thay đổi qua workflow.

### 5.6. Các thao tác vòng đời tài sản

Mỗi thao tác tạo một yêu cầu/workflow. Chỉ khi workflow được duyệt mới thay đổi tài sản.

| Thao tác | Điều kiện | Tác động khi duyệt |
|---|---|---|
| Allocate | Tài sản chưa cấp phát hoặc đã thu hồi | Chuyển sang đang sử dụng, gán người dùng |
| Revoke | Đang sử dụng; phải có `LocationId` đích hoặc policy cho phép giữ vị trí hiện tại | Bỏ người dùng, đặt vị trí đích/giữ vị trí theo policy, chuyển chưa sử dụng |
| Transfer | Đang sử dụng | Đổi người dùng |
| ChangeLocation | Chỉ dành cho Asset | Đổi vị trí của một tài sản vật lý |
| BrokenReport | Tài sản đang sử dụng | Chuyển sang hỏng |
| Repair | Hỏng hoặc đang sử dụng | Chuyển sang đang sửa chữa, tạo hồ sơ sửa chữa |
| Maintenance | Chưa hỏng | Chuyển sang bảo trì, tạo hồ sơ bảo trì |
| Warranty | Đủ điều kiện bảo hành | Chuyển sang bảo hành, tạo hồ sơ bảo hành |
| Liquidation | Không còn sử dụng được | Chuyển sang thanh lý |
| MissingReport | Không xác định được vị trí | Chuyển sang mất |
| DestroyRequest | Có quyết định hủy | Chuyển sang hủy |

`ChangeLocation` không xử lý vật tư. Chuyển kho dùng `StockOperation` và cập nhật `StockBalance`; `StartRepair/StartMaintenance/StartWarranty` chỉ mở hồ sơ, còn `CompleteRepair/CompleteMaintenance/CompleteWarranty` đóng hồ sơ và trả Asset về trạng thái nghiệp vụ phù hợp. Rule bảo hành phải được cấu hình theo chính sách đã duyệt, không để trạng thái placeholder.

### 5.7. Nguyên tắc quan trọng

- Tài sản không có hai workflow chuyển trạng thái đang chờ duyệt cùng lúc cho cùng một thao tác loại trừ được cho phép.
- Không có hai request cùng thay đổi tài sản thành công.
- Phải kiểm tra trạng thái hiện tại tại thời điểm duyệt, không chỉ lúc tạo yêu cầu.
- Reject/Cancel phải bỏ yêu cầu đang chờ.
- Thay đổi trạng thái, người dùng hoặc vị trí ghi `AssetHistory`; truy cập/thay đổi quyền và hành động nhạy cảm ghi `AuditLog`, không bắt buộc sao chép toàn bộ dữ liệu history vào audit.
- Mọi thao tác phải là idempotent hoặc có idempotency key để tránh duyệt hai lần.

### 5.8. Target v2 — Vật tư và tồn kho

Stock/inventory là nghiệp vụ legacy quan sát được nhưng **không thuộc MVP v1**. Target dùng bốn khái niệm rõ ràng:

- `StockItem`: loại vật tư có thể tồn kho, không phải Asset vật lý.
- `StockBalance`: số lượng của một `StockItem` tại một vị trí kho.
- `StockOperation`: yêu cầu nhập, xuất, chuyển hoặc điều chỉnh.
- `StockMovement`: dòng bất biến ghi nhận/xuất/chuyển/điều chỉnh sau khi operation được duyệt.

Luồng chuẩn:

```text
Nhập kho: cộng StockBalance, ghi StockMovement In
Xuất kho: kiểm tra đủ tồn, trừ StockBalance, ghi StockMovement Out
Chuyển kho: trừ kho nguồn, cộng kho đích, ghi hai StockMovement
```

Một lần chuyển kho tạo `TransferOut` và `TransferIn` cùng `TransferGroupId`; hai dòng phải cùng operation, cùng số lượng và commit theo một transaction. Quy tắc:

- Số lượng phải lớn hơn 0.
- Không cho phép tồn âm.
- Không xóa balance có tồn dương.
- Tồn phải được kiểm tra lại trong transaction.
- Mọi biến động tồn phải truy ngược được về operation, workflow và người thực hiện.

### 5.9. Target v2 — Kiểm kê

Kiểm kê không thuộc MVP v1. Target gồm:

- Tạo phiếu kiểm kê theo vị trí/kho.
- Ghi `SnapshotAt` lúc chụp tồn.
- Chụp `ExpectedQuantity` theo balance tại `SnapshotAt`.
- Nhập `ActualQuantity` và lưu chênh lệch.
- Cho phép hoàn thành phiếu kiểm kê.
- Nếu có chênh lệch, tạo stock adjustment request qua workflow thay vì sửa tồn trực tiếp.

Không lưu dữ liệu kiểm kê chỉ bằng file JSON local.

### 5.10. Target — Lịch sử và hồ sơ vòng đời tài sản

Phân biệt rõ:

- `AssetHistory` là business history của tài sản: field trước/sau, lý do, actor và thời gian; phục vụ tra cứu vòng đời.
- `AuditLog` là audit/security: truy cập, thay đổi quyền, thao tác nhạy cảm, kết quả security và metadata điều tra. Không sao chép bắt buộc toàn bộ `AssetHistory` vào audit.

`AssetLifecycleCase` là hồ sơ nghiệp vụ cho Repair/Maintenance/Warranty, gồm AssetId, loại hồ sơ, trạng thái, ngày bắt đầu/kết thúc, người phụ trách, nội dung, kết quả, chi phí nếu có, file và workflow liên quan. `Start*` mở hồ sơ và đổi trạng thái; `Complete*` đóng hồ sơ, ghi kết quả và trả Asset về trạng thái phù hợp theo transition rule.

### 5.11. Target v2 — QR và public access

QR/public access là phần legacy mở rộng, không nằm trong danh sách MVP v1. Target v2 có thể gồm:

- QR nội bộ dẫn tới chi tiết tài sản, yêu cầu đăng nhập.
- Có thể tạo public QR/link có thời hạn nếu nghiệp vụ bắt buộc.

Không dùng mã hóa yếu hoặc key cố định. Public link phải có:

- Token ngẫu nhiên khó đoán.
- Thời hạn hết hạn.
- Quyền tắt.
- Audit số lần truy cập nếu cần.

### 5.12. Target v2 — Import/export

Import/export là nghiệp vụ legacy nhưng không thuộc MVP v1. Target v2 hỗ trợ:

- Import Category, Model, Location, Vendor.
- Import tài sản theo template chuẩn.
- Export danh sách tài sản theo bộ lọc.
- Mỗi lần import lưu kết quả và các dòng lỗi.

Không chạy ngầu SQL khi startup.

### 5.13. Phạm vi nghiệp vụ đầy đủ của Asset (bao gồm phần mở rộng)

Phạm vi Target đầy đủ có:

- Category, Model, Project, Location, Vendor.
- Asset vật lý CRUD, hierarchy, người sử dụng và trạng thái.
- Workflow cho thao tác vòng đời cốt lõi.
- `AssetOperation`, `AssetLifecycleCase`, `AssetHistory` và attachment.
- Ở v2: `StockOperation`, StockItem, StockBalance, StockMovement và inventory có snapshot.
- Ở v2: import/export, QR nội bộ, public access và dashboard.
- Các phần địa lý/báo cáo nâng cao ở phase sau.

Phạm vi này là mô tả target đầy đủ, không phải một danh sách MVP thứ hai. Stock/inventory/import-export/dashboard tồn tại trong legacy nhưng được loại khỏi v1.

---

## 6. `impc_library` — Thư viện tài liệu

### 6.1. Mục đích

**Legacy quan sát được:** Library có file, folder, permission, version và public access. **Target v1** giữ file/folder/share/attachment và Storage Adapter; version/tag/recent/starred/public link thuộc v2 hoặc phase sau. Target đầy đủ ở §6.9 không phải danh sách MVP thứ hai.

Thư viện là kho tài liệu dùng chung cho:

- Người dùng.
- Phòng ban.
- Nhóm.
- Dự án.
- Workflow.
- Công việc.
- Tài sản.
- Chat.

### 6.2. File và thư mục

Target v1 chỉ cần:

- Thư mục dạng cây.
- File thuộc thư mục hoặc thuộc một nguồn nghiệp vụ.
- Tên, đuôi, kích thước, MIME, checksum.
- Người tạo.
- Ngày tạo/cập nhật.
- Soft delete.
- Khôi phục từ thùng rác.

Không cần mô phỏng trường hợp file vật lý upload thành công nhưng metadata DB thất bại. Luồng mới nên:

1. Kiểm tra file.
2. Ghi vào storage tạm.
3. Tạo metadata và trạng thái file.
4. Dọn file orphan bằng job nếu bước metadata thất bại.

### 6.3. Quyền chia sẻ

Đối tượng được chia sẻ:

- User.
- Group.
- Department.

Quyền:

- View.
- Edit.

Quy tắc:

- Chủ sở hữu luôn có quyền quản trị resource của mình.
- Quyền thư mục được kế thừa xuống thư mục con và file.
- Quyền trực tiếp trên file được ưu tiên hơn quyền kế thừa nếu muốn ghi đè.
- Không chia sẻ cho chính chủ sở hữu.
- Mọi lần tải/xem file đều phải kiểm tra quyền tại thời điểm truy cập.

Target v1 không cần biểu diễn deny phức tạp. Có thể dùng:

```text
Permission = Subject + Resource + Access + Allow
```

và một bảng override riêng nếu cần.

### 6.4. Target v2 — Phiên bản file

Phiên bản file là nghiệp vụ legacy quan sát được nhưng không bắt buộc trong MVP v1. Target v2 có:

- Upload phiên bản mới cho file hiện tại.
- Danh sách phiên bản.
- Tải phiên bản cũ.
- Khôi phục phiên bản cũ bằng cách tạo hoặc chọn làm bản hiện hành.
- Không ghi đè vật lý bản cũ.

Quy tắc:

- Extension của phiên bản mới phải hợp lệ.
- Không cho sửa metadata của phiên bản đã hoàn thành.
- Mỗi phiên bản có checksum và người tạo.

### 6.5. Gắn file với nghiệp vụ khác

Một file có thể thuộc nhiều ngữ cảnh:

- Folder thư viện.
- Workflow instance.
- Công việc.
- Tài sản.
- Message chat.
- Checklist.
- Hồ sơ sửa chữa/bảo hành.

Nên tách khái niệm:

- `File`: file vật lý và metadata.
- `Attachment`: liên kết file với một ngữ cảnh nghiệp vụ.

Khi xóa attachment, không nhất thiết xóa file gốc nếu file còn được tham chiếu ở nơi khác.

### 6.6. Target v2 — Tìm kiếm và cá nhân hóa

Target v1 chỉ tìm metadata cơ bản. Cá nhân hóa sau ghi nhận ở legacy nhưng đưa sang v2:

- Tìm theo tên file/thư mục.
- Lọc theo người sở hữu, người được chia sẻ, loại file.
- Recent files.
- Starred files.
- Tag cơ bản.

Không cần:

- Vector search.
- OCR.
- Search nội dung Office.
- Full-text phức tạp.
- Mô phỏng nhiều chế độ trash khác nhau.

### 6.7. Public link

Đưa vào v2 nếu thực sự cần. Nếu có:

- File/folder phải được bật public rõ ràng.
- Token ngẫu nhiên.
- Có thể thu hồi.
- Có thạch hạn.
- Không mặc định tìm kiếm công khai toàn hệ thống.
- Không dùng key ngắn dễ đoán.

### 6.8. Chỉnh sửa Office và cloud drive

Không đưa vào MVP:

- OnlyOffice.
- Google Drive.
- OneDrive.
- Dropbox.

Có thể thêm sau thông qua adapter storage, không làm thay đổi model file/folder cốt lõi.

### 6.9. Phạm vi nghiệp vụ đầy đủ của Library (bao gồm phần mở rộng)

Phạm vi Target đầy đủ có:

- Folder tree, upload/download/view/move, soft-delete/restore.
- Share user/group/department và kế thừa quyền.
- Attachment cho các module khác.
- Search metadata và storage adapter local/S3-compatible.
- Ở v2: file version, restore version, public link, tag, starred và recent.
- Ở phase sau: cloud drive/OnlyOffice.

File version, tag/starred/recent tồn tại hoặc xuất hiện trong legacy nhưng không thuộc danh sách v1. Phần này không phải một danh sách MVP thứ hai.

---

## 7. `impc-chat` — Chat nội bộ

### 7.1. Mục đích

Chat phục vụ giao tiếp nội bộ và trao đổi trực tiếp theo ngữ cảnh:

- Chat cá nhân.
- Chat nhóm.
- Chat gắn với công việc.
- Chat gắn với workflow/tài sản ở phần mở rộng.

**Legacy quan sát được:** Chat có các khái niệm direct/group/work chat, read/mute/archive theo user, file/mention và realtime. Source có thể soft-delete chat cho một user và cho phép recall message trong khoảng một giờ; đây là hành vi legacy, không mặc định trở thành rule Target.

**Target đã chọn:** v1 có direct/group/work chat; soft-delete/leave là personal membership state, không xóa conversation của mọi user. Sender được soft-delete/recall message bất kỳ lúc nào server còn lưu message, nội dung được ẩn và thay bằng tombstone; Target không dùng giới hạn một giờ của legacy. Nếu chính sách pháp lý yêu cầu giới hạn khác, phải cấu hình như một policy Target riêng trước khi triển khai.

### 7.2. Conversation

Target v1 gồm hai loại:

1. `Direct`: một người với một người.
2. `Group`: nhiều người; Target v1 chỉ gắn với Work context, còn Workflow/Asset context thuộc Target v2.

Quy tắc Target:

- Chuẩn hóa cặp direct theo `MinUserId/MaxUserId`; unique pair key để mỗi cặp có đúng một direct conversation.
- Group phải có tên; người tạo là Owner; không tạo conversation không có thành viên.
- Duplicate member trong cùng conversation bị từ chối.
- Mỗi Work context có đúng một work conversation; ContextType/ContextId là unique khi context là Work.
- Mỗi user chỉ có một active membership cho một conversation; leave/soft-delete chỉ là personal state.
- Không soft-delete/xóa chat của tất cả mọi người từ một thao tác cá nhân.

### 7.3. Thành viên và vai trò

Target v1 dùng ba vai trò:

- Owner.
- Admin.
- Member.

Quy tắc:

- Group phải có ít nhất một Owner.
- Không xóa Owner nếu chưa chuyển quyền.
- Owner/Admin được thêm/xóa thành viên.
- Chỉ thành viên mới xem và gửi tin nhắn.
- Có thể tắt quyền gửi cho Member nếu nhóm chỉ dùng để thông báo.

### 7.4. Message

Target v1 hỗ trợ:

- Text/rich text đơn giản.
- Reply.
- File/image.
- Mention user.
- Sửa và soft-delete/recall message.
- System message khi thành viên hoặc thuộc tính chat thay đổi.

Link là Target v2, không nằm trong danh sách chat v1.

Quy tắc Target:

- Chỉ sender sửa hoặc soft-delete/recall message của mình; nội dung sau khi xóa được thay bằng tombstone.
- Target không áp dụng giới hạn recall 15 phút hay một giờ của các phiên bản legacy; thời hạn chỉ được thêm bằng policy đã duyệt.
- Mention tạo notification/outbox.
- Nội dung message phải được kiểm tra kích thước và loại nội dung.

Forward, reaction và pin message tồn tại ở một số hành vi legacy nhưng được loại khỏi v1 và đưa sang v2. Pin ở Target v2 là thuộc tính conversation, không phải thuộc tính cá nhân read state.

### 7.5. Trạng thái cá nhân theo chat

Target v1 đặt state cá nhân trong `MessageReadState`:

- Last read message.
- Muted đến thời điểm nào.
- Archived/soft-deleted khỏi danh sách cá nhân hay chưa.
- Nickname riêng nếu cần.

`ConversationState.IsPinned` là trạng thái chung của conversation; không đặt `IsPinned` trong `MessageReadState`. Target v1 không cần cursor xóa lịch sử phức tạp; soft-delete theo message hoặc `hiddenBeforeMessageId` chỉ thêm sau khi chính sách và nhu cầu được chốt.

### 7.6. File trong chat

Luồng Target v1 không để file message dang dở:

1. Chat yêu cầu Library tạo upload intent ở trạng thái `Pending` và trả `AttachmentId` cùng storage key tạm.
2. Client upload qua Storage Adapter.
3. Library xác nhận checksum, chuyển upload intent sang `Ready`.
4. Chat tạo `Message` type `File` và gắn `AttachmentId` trong cùng transaction.
5. Realtime chỉ phát sau khi message/attachment đã commit.
6. Nếu upload hết hạn hoặc client hủy, cleanup xóa storage object và đánh dấu intent `Aborted/Expired`.

Chat tạo Attachment qua API/application service của Library, không gọi service lưu trữ trực tiếp để ghi bản ghi Chat; Chat nhận attachment đã hoàn tất từ Library. Client tải file qua API có quyền hoặc signed URL ngắn hạn. Ảnh thumbnail thuộc phase sau.

### 7.7. Chat gắn với công việc

Khi một công việc cần trao đổi:

- Hệ thống tạo đúng một group conversation cho Work context; tạo lại phải dùng conversation hiện có.
- Người tạo, người giao, người xử lý, người theo dõi và người phối hợp là thành viên.
- Khi danh sách người tham gia công việc thay đổi, chat đồng bộ thành viên.
- Chat không tự ý thêm người chỉ vì họ có quyền xem dự án.
- Khi công việc bị xóa/hủy, chat chuyển sang archived.

### 7.8. Realtime

Target v1 dùng WebSocket/SignalR cho:

- Message mới.
- Message được sửa/xóa.
- Typing.
- Read cursor.
- Thành viên mới/removed.
- Attachment mới.
- Unread count.

Reaction/pin conversation là event mở rộng của v2.

Realtime chỉ là kênh thông báo. Nguồn dữ liệu chính vẫn là database; client không tin hoàn toàn vào payload realtime để hiển thị dữ liệu quan trọng.

### 7.9. Phạm vi nghiệp vụ đầy đủ của Chat (bao gồm phần mở rộng)

Phạm vi Target đầy đủ có:

- Direct/group conversation, membership và vai trò.
- Message, reply, file attachment, mention, read/unread, mute/archive.
- Work chat và realtime.
- Ở v2: forward, reaction, pin conversation và message search.
- Ở phase sau: template message, nhiều loại nickname, mobile relay riêng và chat context mở rộng.

Legacy có soft-delete/recall và một số tính năng mở rộng; Target v1 không đồng nhất chúng với phạm vi chuẩn. Phần này là target đầy đủ, không phải danh sách MVP thứ hai.

---

## 8. `impc-service` — Notification, email và dịch vụ liên lạc

### 8.1. Mục đích

**Legacy quan sát được:** Service có notification, email, FCM, realtime, nhận email, 2FA và Smart CA. **Target v1** chỉ giữ in-app notification, email outbox, preference/retry/dedupe; FCM và các kênh chuyên biệt thuộc v2/v3. Target đầy đủ ở §8.9 không phải danh sách MVP thứ hai.

`impc-service` là lớp giao tiếp phía sau. Nó không sở hữu nghiệp vụ workflow/chat/tài sản; nó nhận yêu cầu gửi và phân phối thông báo.

### 8.2. Notification nội bộ

Target v1:

- Tạo notification theo người nhận.
- Lưu nội dung, module, type, URL, detail ID.
- Đánh dấu chưa đọc/đã đọc.
- Đếm unread.
- Gửi realtime cho user đang online.
- Gửi email nếu user bật và loại notification yêu cầu.

Các module tạo notification qua **domain event/outbox**, không gọi service bên ngoài trong transaction.

Ví dụ:

- Workflow có task mới.
- Workflow chuyển trạng thái.
- Công việc được giao/chuyển trạng thái.
- Công việc sắp đến hạn/quá hạn.
- Tài sản có yêu cầu mới hoặc yêu cầu được duyệt.
- Có mention trong chat.
- Có tin nhắn mới trong chat.

### 8.3. Target v2 — FCM/push

FCM là nghiệp vụ legacy nhưng **không thuộc MVP v1**. Khi triển khai ở v2, `PushDelivery` là adapter và Firebase token không nằm trong domain nghiệp vụ chính:

```text
DeviceToken
- UserId
- Token
- Platform
- LastSeenAt
- IsActive
```

Luồng:

1. Module tạo notification.
2. Notification service kiểm tra user bật nhận notification không.
3. Lưu notification.
4. Đưa delivery vào outbox.
5. Worker gửi FCM nếu có token.
6. Xóa token không còn hợp lệ.

Không gọi FCM trực tiếp trong transaction workflow.

### 8.4. Target v1 — Email outbound

Target v1 có:

- Nhận yêu cầu gửi email.
- Kiểm tra người nhận còn hoạt động và bật email.
- Lưu outbox email.
- Worker gửi qua SMTP.
- Ghi lịch sử gửi/thất bại.
- Retry có backoff.
- Không gửi lặp lại cùng idempotency key.

Không cần đầy đủ calendar ICS nếu chưa có nghiệp vụ lịch. Đưa calendar email sang phase sau.

### 8.5. Incoming email/IMAP

Đưa sang phase sau. Nếu làm thì flow chuẩn:

1. Đọc cấu hình mailbox.
2. Đọc email mới theo watermark.
3. Tạo message/workflow/email record.
4. Upload attachment vào Library.
5. Lưu liên kết `InReplyTo`.
6. Cập nhật watermark chỉ sau khi xử lý thành công.
7. Retry an toàn, không tạo trùng.

### 8.6. 2FA

Không đưa vào MVP nếu SSO hiện tại chưa yêu cầu 2FA. Nếu cần:

- TOTP là lựa chọn đơn giản và an toàn hơn mã gửi qua cùng kênh push.
- Secret phải được mã hóa khi lưu.
- Code phải chống brute-force và có thời hạn ngắn.
- Không log mã hoặc secret.

Không sao chép cơ chế trả code qua API/cache như hệ thống cũ.

### 8.7. Smart CA

Không đưa vào MVP. Đây là adapter độc lập, chỉ làm sau khi có nhu cầu ký PDF thật và đã chốt nhà cung cấp CA.

### 8.8. Presence

Target v1 có thể suy ra online/offline từ realtime connection. Không cần lưu connection history chi tiết trong mọi module.

### 8.9. Phạm vi nghiệp vụ đầy đủ của Service (bao gồm phần mở rộng)

Phạm vi Target đầy đủ có:

- In-app notification, read/unread và realtime.
- `UserPreference` do Identity sở hữu cho locale/giao diện.
- `NotificationPreference` do Notification sở hữu theo loại/channel.
- `OutboxMessage`, email outbox, retry/idempotency và delivery audit.
- Ở v2: FCM/push adapter và preference chi tiết.
- Ở phase sau: IMAP ingestion, calendar email, legacy Electrolytic token, VNPT Smart CA và FCM như lớp xác thực thứ hai.

Không trộn `UserPreference` với `NotificationPreference`. Phần này là target đầy đủ, không phải danh sách MVP thứ hai.

---

# PHẦN II — MÔ HÌNH SOURCE MỚI ĐỀ XUẤT

## 9. Kiến trúc tổng thể

Nên xây dựng **modular monolith** với các module sau:

```text
Platform
├── Identity & Organization
├── Notification & Delivery
├── Storage Adapter
└── Audit

Business Modules
├── Workflow
├── Work
├── Asset
├── Library
└── Chat
```

Không tạo HTTP call nội bộ giữa các module trong cùng monolith. Các module gọi nhau qua application service/domain event. Nếu sau nàu tách service, mới biến các interface thành HTTP/message adapter.

### 9.1. Nguyên tắc sở hữu dữ liệu

| Module | Sở hữu dữ liệu chính |
|---|---|
| Identity | User, Department, Group, Role, Permission, UserPreference |
| Workflow | WorkflowDefinition, WorkflowVersion, WorkflowInstance, WorkflowTask, WorkflowTransition, WorkflowAccessDefinition, WorkflowInstanceShare, WorkflowInstanceSeen |
| Work | Project, ProjectParticipant, WorkStatus, WorkTransition, WorkItem, WorkParticipant, WorkAssignmentRule, RequiredChild, WorkOperation, WorkHistory |
| Asset | Category, Model, Location, Vendor, Asset, AssetOperation, AssetLifecycleCase, AssetHistory, StockItem, StockBalance, StockOperation, StockOperationLine, StockMovement, InventorySession |
| Library | Folder, File, FileVersion, FilePermission, Attachment và upload state |
| Chat | Conversation, ConversationMember, ConversationState, Message, MessageReadState; v2 có MessageReaction |
| Notification | Notification, NotificationPreference, OutboxMessage, EmailOutbox, EventInbox, DeliveryAttempt |
| Audit | AuditLog |

Một module không được sửa trực tiếp bảng của module khác. `Storage Adapter` chỉ lưu bytes và không sở hữu metadata nghiệp vụ. Library sở hữu toàn bộ vòng đổi file/attachment; Chat tạo attachment bằng API của Library và chỉ giữ `AttachmentId` trong message, không gọi/chỉnh sửa bảng của module khác.

---

## 10. Danh tính và tổ chức

### 10.1. Thực thể cơ bản và tổ chức

```text
Department
- Id
- ParentDepartmentId
- ManagerId
- Name
- IsActive
```

```text
User
- Id
- DepartmentId
- ManagerId
- UserStatus: Active | Inactive | Locked
- DisplayName/Email
- IsDeleted
```

Ngoài ra có Group, GroupMember, Role, Permission, UserRole và `UserPreference`. `ManagerId` là user trực tiếp; tổ chức cây phòng ban là `Department.ParentDepartmentId`. Mọi task/WorkItem chỉ gán user có `UserStatus = Active`; Department/Manager phải resolve được một ứng viên active trước khi commit.

### 10.2. Quyền

Target v1 dùng permission theo module:

```text
workflow.read
workflow.configure
workflow.instance.create
workflow.instance.view
workflow.task.act
work.project.manage
work.item.read
work.item.create
work.item.edit
work.item.change_status
asset.catalog.manage
asset.item.read
asset.item.create
asset.item.edit
asset.item.delete
asset.operation.request
asset.operation.approve
library.file.read
library.file.edit
library.share.manage
chat.conversation.create
chat.message.send
chat.member.manage
admin.full
```

Target v2 bổ sung permission `asset.stock.manage` và `asset.inventory.manage`; không đưa hai permission này vào Target v1.

Quyền object-level được tính thêm theo:

- Project của Work/Asset.
- Location.
- Người tạo/giao/xử lý.
- Thành viên group/department.
- Chủ sở hữu và ACL của Library.
- Thành viên của Chat.

Quy tắc mặc định phải là **deny**, không phải allow. Permission chưa cấu hình thì không tự động cho phép.

### 10.3. User preference

`UserPreference` do Identity sở hữu và chỉ chứa lựa chọn chung:

- Locale.
- Dark mode.

Bật/tắt email, notification và push theo type/channel thuộc `NotificationPreference` do Notification sở hữu; Identity không sửa trực tiếp bảng này.

---

## 11. Workflow module

### 11.1. Definition và version

```text
WorkflowDefinition
- Id
- Key
- Code
- Name
- Description
- Status: Draft | Published | Archived
- CurrentPublishedVersionId
- CreatedBy
- CreatedAt
```

```text
WorkflowVersion
- Id
- WorkflowDefinitionId
- Version
- FormJson
- StepsJson hoặc các bảng step
- Status
- PublishedAt
- PublishedBy
```

Target v1 có thể lưu form/step dưới JSON để giảm số bảng, nhưng runtime transition và task phải có bảng riêng để xử lý an toàn.

Invariant publish:

- `WorkflowDefinition.Key` và `Code` duy nhất toàn hệ thống; Target hiện single-tenant. Nếu chuyển multi-tenant, phải thêm `TenantId` và chuyển thành unique theo tenant.
- Unique `(WorkflowDefinitionId, Version)` cho version.
- Mỗi version có đúng một initial step.
- Mọi initial/next step, action và transition được tham chiếu phải tồn tại trong cùng version.
- Action/actor phải hợp lệ với ma trận 3.2.4.
- Published version bất biến; sửa cần tạo version mới.

### 11.2. Runtime

```text
WorkflowInstance
- Id
- WorkflowDefinitionId
- WorkflowVersionId
- BusinessType
- BusinessId
- InitiatorId
- Status
- CurrentStepKey
- DataJson
- SubmittedAt
- CompletedAt
- Version/Badge
```

```text
WorkflowTask
- Id
- WorkflowInstanceId
- StepKey
- AssignmentType: User | Group | Department | Manager | Initiator | SelectedUser
- CandidateGroupId/DepartmentId
- AssigneeId
- Status: Pending | Claimed | Completed | Cancelled
- DueAt
- ClaimedAt
- CompletedAt
- CompletedBy
- Comment
- Version
```

```text
WorkflowTransition
- Id
- WorkflowInstanceId
- TaskId
- ActorId
- FromStatus
- ToStatus
- Action
- ResumeStepKey
- Comment
- CreatedAt
```

```text
WorkflowAccessDefinition
- Id
- WorkflowDefinitionId
- SubjectType
- SubjectId
- Access: View | Share | Act | Admin
- IsActive
```

```text
WorkflowInstanceShare
- WorkflowInstanceId
- SubjectType
- SubjectId
- Access: View | Act
- GrantedBy
- GrantedAt
```

```text
WorkflowInstanceSeen
- WorkflowInstanceId
- UserId
- LastSeenAt
```

`WorkflowAccessDefinition` cấp policy mặc định; `WorkflowInstanceShare` override tối thiểu; `WorkflowInstanceSeen` theo dõi đã xem. Không cần resource framework tổng quát trong v1.

### 11.3. Cấu hình step

Mỗi step cần:

- Key và tên.
- Thứ tự.
- Người nhận hoặc rule giao task.
- Action cho phép.
- Action nào chuyển bước tiếp.
- Action nào kết thúc.
- Có cho phép sửa form không.
- Thời hạn nếu có.

### 11.4. Giao task và action

Task giao cho user có một active assignee. Task giao group/department phải dùng `ClaimTask(taskId, actorId, expectedVersion)` với optimistic concurrency; transaction kiểm tra task còn `Pending`, actor là ứng viên active, rồi đặt `AssigneeId`, `ClaimedAt`, status `Claimed` và tăng version. Sau commit, task có đúng một active assignee.

Mỗi command action dùng ma trận 3.2.4. Initiator sửa Draft/Returned, Submit/Recall/Cancel; active assignee Approve/Return/Reject. `Return` đóng task, lưu `ResumeStepKey`, tra quyền edit cho Initiator; khi Initiator Submit lại phải tạo task tại bước trước. `Reject`, `Recall` và `Cancel` đóng task đang mở.

Mỗi transaction:

- Khóa/đọc instance và task với version.
- Kiểm tra actor/action/guard.
- Ghi transition.
- Cập nhật task/instance.
- Ghi history nghiệp vụ; audit security ghi riêng.
- Ghi notification outbox.
- Commit.

### 11.5. Kết nối với Work/Asset

Workflow không cần biết chi tiết bảng Work/Asset. Nó nhận:

```text
BusinessType = Work | Asset | Library | Generic
BusinessId = Id nghiệp vụ
```

Khi workflow hoàn thành, module tương ứng nhận event:

```text
WorkflowApproved
- WorkflowInstanceId
- BusinessType
- BusinessId
- InitiatorId
```

Module nghiệp vụ tự áp dụng thay đổi trong transaction của mình.

---

## 12. Work module

### 12.1. Project và participant

```text
Project
- Id
- Code
- Name
- Description
- ManagerId
- DepartmentId
- DefaultAssigneeRuleId
- ApplySla
- Status
- CreatedBy
- CreatedAt
```

```text
ProjectParticipant
- Id
- ProjectId
- UserId
- Role: Manager | Member | Viewer
- JoinedAt
- LeftAt
- IsActive
```

### 12.2. Work status, transition và assignment rule

```text
WorkStatus
- Id
- ProjectId
- Code
- Name
- Group: New | InProgress | Completed | Rejected | Cancelled
- IsInitial
- IsTerminal
- SlaHours
- RequiredAttachment
```

```text
WorkTransition
- Id
- ProjectId
- FromStatusId
- ToStatusId
- Action
- RequiredGuard
- IsActive
```

`RequiredGuard` là machine-readable rule tối thiểu, ví dụ attachment-required, required-children-completed hoặc no-pending-approval. Một Project phải có đúng một WorkStatus `IsInitial`; terminal status không có outgoing WorkTransition.

```text
WorkAssignmentRule
- Id
- ProjectId
- FromStatusId
- ToStatusId nullable
- RuleType: Assigner | Creator | CurrentAssignee | DepartmentManager | Manager | ParentAssigner | SelectedUser | UserList
- SourceId
- RequiredRole
- Priority
- IsActive
```

Rule resolve được một user `Active`; task/WorkOperation không được commit nếu không có assignee hợp lệ.

### 12.3. Work item, parent/child và operation

```text
WorkItem
- Id
- Code
- ProjectId
- ParentId
- Title
- DescriptionJson
- StatusId
- CreatorId
- AssigneeId
- AssignerId
- StartAt
- DueAt
- CompletedAt
- Progress
- IsActive
- IsDeleted
- Version
```

```text
WorkParticipant
- Id
- WorkItemId
- UserId
- Role: Assigner | Assignee | Watcher | Collaborator
- IsActive
```

```text
RequiredChild
- ParentWorkItemId
- ChildWorkItemId
- IsRequired
```

```text
AutoCompleteParent
- ParentWorkItemId
- ChildWorkItemId
- OnChildTerminalStatusId
- TargetStatusId
```

```text
WorkOperation
- Id
- WorkItemId
- OperationType: ChangeAssignee | ChangeStatus | ChangeParticipant
- Status: PendingApproval | Approved | Rejected | Cancelled
- WorkflowInstanceId
- RequestedBy
- PayloadJson
- CreatedAt
- CompletedAt
- Version
```

Thay đổi người xử lý hoặc những transition được policy yêu cầu tạo `WorkOperation` pending approval. Chỉ khi operation Approved mới áp dụng payload; Reject/Cancel đóng operation.

### 12.4. Work history

```text
WorkHistory
- Id
- WorkItemId
- WorkTransitionId nullable
- FieldName
- OldValue
- NewValue
- ChangedBy
- Reason
- CreatedAt
```

`WorkTransition` ghi action, from/to, guard kết quả, actor và thời gian; `WorkHistory` là business history. `AuditLog` chỉ ghi security/audit event, không bắt buộc trùng toàn bộ WorkHistory.

### 12.5. Invariant

- Project/status không xóa nếu còn WorkItem.
- Mỗi Project có đúng một initial status và không thể publish/activate khi vượt số này.
- Terminal status không có outgoing transition.
- `FromStatusId`, `ToStatusId` và WorkTransition phải cùng Project.
- Mỗi WorkItem có tối đa một parent; parent/child cùng Project và không được tạo cycle cha con.
- `RequiredChild` phải tham chiếu parent và child tồn tại, đang active, cùng Project, không tự tham chiếu; unique theo cặp parent/child.
- Parent chỉ hoàn thành khi mọi RequiredChild có `WorkStatus.IsTerminal = true` và `WorkStatus.Group = Completed`; trạng thái Rejected/Cancelled không được coi là terminal thành công.
- `AutoCompleteParent` phải cùng Project, không tự tham chiếu, unique theo cặp parent/child, và mọi status tham chiếu phải cùng Project.
- `AutoCompleteParent` chỉ chạy trong cùng transaction khi guard thỏa; phải kiểm tra optimistic concurrency/version của WorkItem để tránh race, rồi mới apply transition và history.
- Chỉ user active được làm assignee/participant có nghĩa vụ xử lý.
- Chỉ actor có quyền mới đổi status qua WorkTransition hợp lệ.
- Hoàn thành phải qua validation; khi hoàn thành `Progress = 100` và `CompletedAt` được set.
- Mọi thay đổi assignee/status đều tạo history và notification.

---

## 13. Asset module

### 13.1. Master data

```text
Category
Model
Location
Vendor
Policy
```

`Policy` là cấu hình thao tác nghiệp vụ đã duyệt:

```text
AssetPolicy
- Code
- Name
- WorkflowDefinitionId
- AllowedFromStatusesJson
- RequiredFieldsJson
- EffectiveFrom
- EffectiveTo
- Status: Draft | Approved | Expired
```

```text
WarrantyPolicy
- AssetPolicyId
- CoverageStartAt
- CoverageEndAt
- CoveredStatusesJson
- RequiredDocumentsJson
- ReturnStatusOnComplete
- ApprovalRequired
```

`StartWarranty/CompleteWarranty` không được chạy nếu không có `WarrantyPolicy` Approved còn hiệu lực; không dùng trạng thái placeholder để thay cho chính sách.

### 13.2. Asset

```text
Asset
- Id
- Code
- Name
- CategoryId
- ModelId
- ProjectId
- LocationId
- AssigneeId
- Status
- ParentId
- AcquiredAt
- ActivatedAt
- RetiredAt
- Currency
- PurchaseValue
- IsActive
- IsDeleted
- Version
```

Mỗi row `Asset` đại diện cho đúng một tài sản vật lý; không có trường quantity/unit. Nếu muốn hỗ trợ thuộc tính riêng theo Category, dùng `AssetAttributeValue` hoặc JSON có kiểm soát. Không tạo bảng cho từng Category trong MVP.

### 13.3. Asset lifecycle case và history

```text
AssetLifecycleCase
- Id
- AssetId
- CaseType: Repair | Maintenance | Warranty
- Status: Pending | Approved | InProgress | Completed | Rejected | Cancelled
- PolicyId
- WorkflowInstanceId
- ResponsibleUserId
- StartedAt
- CompletedAt
- ResultJson
- Cost
```

```text
AssetHistory
- Id
- AssetId
- AssetOperationId nullable
- AssetLifecycleCaseId nullable
- FieldName
- OldValue
- NewValue
- ChangedBy
- Reason
- CreatedAt
```

`Start*` mở case và đổi Asset status; `Complete*` đóng case, ghi kết quả và áp dụng `ReturnStatusOnComplete`/transition rule. `AssetHistory` là business history; `AuditLog` là audit/security và không bắt buộc sao chép dữ liệu case.

### 13.4. Asset operation

```text
AssetOperation
- Id
- AssetId
- OperationType
- Status: Pending | Approved | Rejected | Cancelled
- WorkflowInstanceId
- RequestedBy
- FromStatus
- ToStatus
- PayloadJson
- CreatedAt
- CompletedAt
- Version
```

Khi workflow approve, Asset service:

1. Load Asset với optimistic concurrency.
2. Kiểm tra operation vẫn pending.
3. Kiểm tra trạng thái hiện tại vẫn hợp lệ.
4. Áp dụng thay đổi.
5. Ghi history.
6. Đánh dấu operation approved.
7. Ghi outbox notification.
8. Commit.

### 13.5. State transition

Không cho code service tự đổi status tùy ý. Dùng một transition rule duy nhất:

```text
OperationType + CurrentStatus -> NewStatus + RequiredSideEffects
```

Ví dụ:

```text
Allocate + NotInUse -> InUse + AssigneeRequired
Allocate + InUse -> Invalid
Revoke + InUse -> NotInUse + ClearAssignee + DestinationLocationOrKeepPolicy
Transfer + InUse -> InUse + ChangeAssignee
ChangeLocation + PhysicalAsset -> InUse/NotInUse + ChangeLocation
StartRepair + InUse/Broken -> UnderRepair + CreateLifecycleCase
CompleteRepair -> InUse/Broken + CloseLifecycleCase
StartMaintenance -> UnderMaintenance + CreateLifecycleCase
CompleteMaintenance -> InUse + CloseLifecycleCase
StartWarranty + ApprovedPolicy -> UnderWarranty + CreateLifecycleCase
CompleteWarranty -> PolicyReturnStatus + CloseLifecycleCase
```

`ChangeLocation` chỉ áp dụng cho Asset. Vật tư dùng `StockOperation`; không chuyển kho bằng Asset transition.

### 13.6. Stock — Target v2

```text
StockItem
- Id
- Code
- Name
- CategoryId/ModelId
- Unit
- IsActive
```

```text
StockBalance
- StockItemId
- LocationId
- Quantity
- Version
```

```text
StockOperation
- Id
- Code
- OperationType: In | Out | Transfer | Adjustment
- Status: PendingApproval | Approved | Rejected | Cancelled
- WorkflowInstanceId
- RequestedBy
- Reason nullable except Adjustment
- Note nullable except Adjustment
- CreatedAt
- CompletedAt
- Version
```

```text
StockOperationLine
- Id
- StockOperationId
- StockItemId
- FromLocationId
- ToLocationId
- Quantity
```

MVP dùng `StockOperationLine` cho mọi operation; operation một item có đúng một line, operation nhiều item có nhiều line. Không dùng trường item/location/quantity trực tiếp trên `StockOperation` để tránh hai nguồn dữ liệu.

```text
StockMovement
- Id
- StockOperationId
- TransferGroupId nullable
- StockItemId
- MovementType: In | Out | TransferIn | TransferOut | Adjustment
- FromLocationId
- ToLocationId
- Quantity
- WorkflowInstanceId
- CreatedBy
- CreatedAt
```

Invariant apply `StockOperation`:

- Operation phải có ít nhất một `StockOperationLine`; mỗi line phải có `StockItem` active, location hợp lệ và `Quantity > 0`.
- `In` yêu cầu `ToLocationId`, không yêu cầu `FromLocationId`; `Out` yêu cầu `FromLocationId`, không yêu cầu `ToLocationId`; `Transfer` yêu cầu hai location khác nhau; `Adjustment` phải có line, `Reason` và `Note` không rỗng trên `StockOperation`.
- Trước khi apply phải kiểm tra tồn bằng optimistic concurrency, trong cùng transaction; không apply một phần nếu một line không hợp lệ.
- Mỗi transfer line tạo đúng hai movement `TransferOut`/`TransferIn` cùng `TransferGroupId`, cùng StockOperation, StockItem và Quantity.
- Sau khi apply, tổng quantity được tính từ các `StockBalance`, không lưu/cập nhật một tổng riêng.

Unique constraint tối thiểu:

```text
(StockItemId, LocationId)
```

### 13.7. Inventory — Target v2

```text
InventorySession
- Id
- Code
- LocationId
- Status
- SnapshotAt
- ExpectedSnapshotVersion nullable
- StartedBy
- StartedAt
- CompletedAt
```

```text
InventoryLine
- InventorySessionId
- StockItemId/AssetId
- SnapshotAt
- ExpectedQuantity
- ActualQuantity
- Difference
- Note
```

Khi hoàn thành inventory có chênh lệch, tạo stock adjustment request qua workflow thay vì update thẳng.

---

## 14. Library module

### 14.1. Folder/File

```text
Folder
- Id
- ProjectId nullable
- ParentId nullable
- IsProjectRoot
- OwnerId
- Name
- Color
- IsDeleted
- CreatedAt
```

Folder root semantics: `IsProjectRoot = true` chỉ dùng cho folder gốc của Project; mỗi Project có tối đa một root và root không có parent. Folder cá nhân có `ProjectId = null`, `IsProjectRoot = false`.

```text
File
- Id
- FolderId nullable
- OwnerId
- Name
- StorageKey
- MimeType
- Extension
- Size
- Checksum
- CurrentVersionId nullable
- IsDeleted
- CreatedAt
- UpdatedAt
```

`FolderId = null` chỉ hợp lệ khi File thuộc attachment context của module khác; file đứng độc lập trong thư viện phải có Folder.

### 14.2. Permission

```text
FilePermission
- Id
- ResourceType: Folder | File
- ResourceId
- SubjectType: User | Group | Department
- SubjectId
- CanRead
- CanEdit
- IsInherited
- IsOverride
```

Nếu dùng kế thừa cây, có thể tính quyền khi query hoặc materialize vào cache; Target v1 không cần hệ thống ACL phức tạp hơn.

### 14.3. Version

```text
FileVersion
- Id
- FileId
- VersionNumber
- StorageKey
- Checksum
- Size
- CreatedBy
- CreatedAt
```

### 14.4. Attachment

```text
Attachment
- Id
- FileId nullable until upload completes
- TemporaryStorageKey nullable
- UploadState: Pending | Ready | Aborted | Expired
- ModuleType
- ModuleId nullable until attached
- FieldType
- FieldId nullable
- CreatedBy
- CreatedAt
- ExpiresAt nullable
```

Unique tối thiểu theo:

```text
FileId + ModuleType + ModuleId + FieldType + FieldId
```

Unique chỉ áp dụng khi `UploadState = Ready`. Cleanup chuyển `Pending` hết hạn sang `Expired` và xóa vật lý storage object; Chat chỉ được commit File message khi tham chiếu attachment `Ready`.

Library sở hữu `File`, `FileVersion`, `FilePermission`, `Attachment` và upload state. Storage Adapter chỉ nhận byte/storage key; Chat không sở hữu hoặc sửa các bảng này.

### 14.5. Public link

Nếu triển khai:

```text
PublicLink
- Id
- ResourceType: Folder | File
- ResourceId
- TokenHash
- ExpiresAt
- IsRevoked
- CreatedBy
- CreatedAt
```

Không lưu raw token nếu không cần hiển thị lại token.

---

## 15. Chat module

### 15.1. Conversation

```text
Conversation
- Id
- Type: Direct | Group
- DirectKey nullable: canonical min/max user IDs
- Name
- ContextType: None | Work; Workflow/Asset Target v2
- ContextId nullable
- CreatedBy
- IsArchived
- CreatedAt
```

```text
ConversationMember
- Id
- ConversationId
- UserId
- Role: Owner | Admin | Member
- CanSend
- IsActive
- JoinedAt
- LeftAt
```

### 15.2. Message

```text
Message
- Id
- ConversationId
- SenderId
- Type: Text | System | File; Link Target v2
- Content
- AttachmentId nullable
- ReplyToMessageId nullable
- ForwardedFromMessageId nullable, Target v2
- IsDeleted
- CreatedAt
- EditedAt
- Version
```

```text
MessageReaction — Target v2
- MessageId
- UserId
- Reaction
```

```text
MessageReadState
- ConversationId
- UserId
- LastReadMessageId
- MutedUntil
- IsArchived
```

```text
ConversationState — Target v2 cho pin
- ConversationId
- IsPinned
- PinnedBy
- PinnedAt
```

### 15.3. Invariant

- Chỉ active member được đọc/gửi.
- Direct conversation có đúng hai user và `DirectKey` canonical duy nhất.
- Mỗi Work context có đúng một conversation; context key duy nhất.
- Không có duplicate active membership cho cùng `ConversationId + UserId`.
- Group có ít nhất một active Owner.
- Khi thêm/remove user, tạo system message và cập nhật realtime; leave chỉ soft-delete membership.
- Không cho xóa Owner nếu chưa chuyển Owner.
- Chỉ sender được sửa hoặc soft-delete/recall message của mình; Target dùng tombstone và không áp dụng giới hạn một giờ legacy.
- File message chỉ được commit khi Attachment thuộc Library có `UploadState = Ready`; pending/expired upload phải cleanup và không tạo message.
- Pinned là state của conversation, không phải message và không nằm trong MessageReadState.
- Search chỉ trả kết quả trong conversation user được phép xem.

---

## 16. Notification module

### 16.1. Notification

```text
Notification
- Id
- EventId
- RecipientUserId
- Type
- ModuleType
- ModuleId
- ContentKey
- TemplateVersion
- Locale
- TemplateDataJson
- RenderedContent
- Url
- IsRead
- CreatedAt
```

### 16.2. Outbox

```text
OutboxMessage
- Id
- Type
- PayloadJson
- IdempotencyKey
- Status
- RetryCount
- NextAttemptAt
- CreatedAt
- ProcessedAt
```

`IdempotencyKey` có unique constraint. Notification dùng `ContentKey + TemplateVersion + Locale + TemplateDataJson` để render nhất quán, không chỉ lưu title/content đã ghép sẵn.

Các module tạo `OutboxMessage` trong cùng transaction. Worker xử lý sau commit; mỗi consumer có `EventInbox`/dedupe key để không tạo notification lặp khi event retry.

### 16.3. Delivery preference

`UserPreference` do Identity sở hữu; Notification sở hữu `NotificationPreference` theo User, NotificationType và Channel:

```text
NotificationPreference
- UserId
- NotificationType
- Channel: InApp | Email | Push
- IsEnabled
- MutedUntil nullable
```

- Web realtime: bật/tắt.
- Email: bật/tắt.
- Push: bật/tắt.
- Người nhận có bị mute trong chat không.

Notification không đọc/ghi trực tiếp bảng `UserPreference`; nó đọc preference channel của chính mình qua contract/application service.

```text
EventInbox
- ConsumerName
- EventId
- ProcessedAt
```

Unique `(ConsumerName, EventId)` để consumer dedupe event retry.

### 16.4. Retry

- Retry tối đa theo chính sách.
- Exponential backoff.
- Dead-letter khi hết số lần.
- Không gửi lại notification đã thành công.
- Không để lỗi notification làm rollback nghiệp vụ chính.

---

# PHẦN III — CÁC LUỒNG NGHIỆP VỤ END-TO-END

## 17. Luồng tạo và duyệt workflow

```text
User chọn loại phiếu
  -> nhập form
  -> lưu Draft
  -> submit
  -> kiểm tra dữ liệu
  -> tạo WorkflowInstance
  -> tạo task đầu tiên
  -> ghi audit
  -> ghi notification outbox
  -> commit
  -> worker gửi notification
  -> assignee mở Inbox
  -> approve/return/reject
  -> transaction tạo transition và task tiếp theo
  -> nếu là Work: Work áp dụng thay đổi
  -> nếu là Asset: Asset áp dụng state transition
  -> nếu hoàn thành: gửi notification cho initiator
```

## 18. Luồng tạo công việc

```text
User tạo WorkItem
  -> chọn Project
  -> nhập title/form
  -> hệ thống sinh code
  -> tạo status New
  -> gán người giao/người xử lý
  -> tạo chat nếu cần
  -> ghi audit
  -> commit
  -> gửi notification
```

## 19. Luồng đổi trạng thái công việc

```text
User mở công việc
  -> server kiểm tra quyền
  -> lấy trạng thái được phép
  -> chọn trạng thái/người xử lý mới
  -> kiểm tra file/child nếu hoàn thành
  -> xác định transition/đổi assignee có cần approval không
  -> nếu cần approval:
       tạo WorkOperation PendingApproval
       commit WorkOperation, chưa sửa WorkItem
       Reject/Cancel: đóng WorkOperation, không apply
       Approved: transaction mới kiểm tra version/guard rồi apply
  -> nếu không cần approval: apply trực tiếp trong transaction
  -> ghi WorkTransition/WorkHistory
  -> gán lại assignee active nếu cần
  -> kiểm tra RequiredChild/AutoCompleteParent nếu parent cần
  -> gửi notification
```

## 20. Luồng thao tác tài sản

```text
User chọn Allocate/Repair/Transfer...
  -> hệ thống kiểm tra action khả dụng theo status
  -> tạo AssetOperation
  -> tạo WorkflowInstance
  -> gửi duyệt
  -> duyệt việc
  -> kiểm tra trạng thái tài sản hiện tại
  -> áp dụng thay đổi Asset
  -> tạo/cập nhật AssetLifecycleCase nếu có Start/Complete
  -> ghi AssetHistory
  -> đánh dấu AssetOperation Approved
  -> gửi notification
  -> commit

StockOperation là flow Target v2 riêng; AssetOperation không tự sinh StockOperation.
```

## 21. Luồng nhập/xuất/chuyển kho

```text
Tạo StockOperation (Target v2)
  -> kiểm tra quyền
  -> tạo ít nhất một StockOperationLine
  -> validate từng line: StockItem active, location hợp lệ, quantity > 0
  -> kiểm tra tồn nguồn bằng optimistic concurrency nếu xuất/chuyển
  -> tạo Workflow nếu cần phê duyệt
  -> khi operation Approved, mở transaction apply:
       In: cộng balance nơi nhận, ghi movement In
       Out: trừ balance nơi gửi, ghi movement Out
       Transfer: trừ nguồn, cộng đích, ghi TransferOut/TransferIn cùng TransferGroupId
  -> nếu một line fail thì rollback toàn bộ operation, không apply một phần
  -> đánh dấu StockOperation Approved
  -> gửi notification
```

## 22. Luồng upload file

```text
Client yêu cầu upload
  -> xác thực user
  -> kiểm tra module/folder và quyền edit
  -> kiểm tra extension/MIME/kích thước
  -> Library tạo Attachment/File upload intent ở trạng thái Pending
  -> client upload qua Storage Adapter
  -> Library xác nhận checksum và đổi upload state Ready
  -> tạo/gắn File/Attachment metadata; tạo FileVersion nếu đang ở v2
  -> commit metadata
  -> cleanup Pending/Expired object orphan
```

Nếu bước metadata hoặc xác nhận thất bại, client có thể gọi cancel; cleanup job xóa object tạm và chuyển state sang Aborted/Expired.

Nếu tạo file Office trong MVP, có thể chỉ cho phép upload file có sẵn thay vì tạo tài liệu trống rồi chỉnh sửa bằng OnlyOffice.

## 23. Luồng chia sẻ file

```text
Owner chọn file/folder
  -> chọn user/group/department
  -> chọn View hoặc Edit
  -> tạo FilePermission
  -> người nhận thấy trong Shared with me
  -> khi mở file, server kiểm tra quyền
  -> tải qua signed URL hoặc API download
```

## 24. Luồng gửi chat

```text
User gửi message
  -> kiểm tra member + CanSend
  -> nếu File: kiểm tra Attachment Ready
  -> lưu message
  -> parse mention
  -> tạo notification cho mention
  -> ghi realtime outbox
  -> commit
  -> client nhận event và fetch message
```

## 25. Luồng công việc gắn chat

```text
Tạo WorkItem
  -> tạo Work conversation nếu được bật
  -> đồng bộ thành viên từ WorkParticipant
  -> các bên nhận notification
  -> khi WorkParticipant thay đổi, tạo system message
  -> khi WorkItem archive, conversation archive
```

## 26. Luồng nhận email thành công việc/workflow

Đưa vào phase sau:

```text
Email mới
  -> parse header/body/attachment
  -> khử trùng lặp theo Message-ID/watermark
  -> tạo EmailMessage
  -> tạo Work/Workflow tương ứng
  -> upload attachment
  -> ghi liên kết reply
  -> gửi notification
  -> commit watermark
```

---

# PHẦN IV — MVP ĐỀ XUẤT

## 27. MVP v1 — nền tảng dùng được

Mục tiêu của MVP là cho phép nghiệp vụ chạy end-to-end, không phải sao chép toàn bộ UI cũ.

### 27.1. Foundation

- SSO/OIDC, User, Department, Group, Role, Permission.
- Department parent/manager; User DepartmentId, ManagerId, UserStatus.
- Audit log.
- Outbox.
- Storage Adapter.
- Notification abstraction.

### 27.2. Workflow MVP

- Definition/version có Code và validate trước publish.
- Form cơ bản, step/transition/action và access/seen tối thiểu.
- Draft/submit/approve/return/reject/recall/cancel.
- Giao task, group task ClaimTask, task inbox.
- File attachment, audit, notification qua outbox.

### 27.3. Work MVP

- Project, ProjectParticipant, WorkStatus và WorkTransition.
- WorkItem, WorkParticipant, parent/child cơ bản.
- Gán active user theo WorkAssignmentRule.
- File, WorkOperation pending approval, history, SLA cơ bản và notification.
- Work chat cơ bản.

### 27.4. Asset MVP

- Category/Model, Project/Location/Vendor.
- Asset CRUD vật lý `Quantity = 1`.
- AssetOperation, AssetLifecycleCase, AssetHistory.
- Allocate/revoke/transfer/change location và các Start/Complete vòng đời cốt lõi.
- Attachment.

### 27.5. Library MVP

- Folder/file.
- Upload/download/move.
- Share user/group/department và inherited permission.
- Attachment và search metadata.
- Soft delete/restore.

Không đưa FileVersion vào v1; đưa FileVersion sang v2.

### 27.6. Chat MVP

- Direct/group/work conversation.
- Member/role.
- Text/reply/file/mention.
- Read/unread, mute/archive.
- Realtime cơ bản.

Không đưa reaction, forward hoặc pin vào v1; đưa các tính năng này sang v2.

### 27.7. Service MVP

- In-app notification.
- Email outbox.
- NotificationPreference do Notification sở hữu.
- EventInbox/dedupe, retry/idempotency.
- OutboxMessage.

Không đưa FCM vào v1; đưa FCM/push sang v2.

## 28. MVP v2 — nghiệp vụ vận hành mở rộng

- Stock in/out/transfer, StockOperation và TransferIn/TransferOut.
- Inventory snapshot, line và adjustment workflow.
- Asset import/export.
- Asset public QR/link có hạn.
- Checklist động.
- Công việc lặp.
- SLA nâng cao.
- FileVersion, restore version, tag, starred, recent.
- Chat reaction, forward, pin conversation và message search.
- FCM/push adapter.
- Notification preferences chi tiết.
- Dashboard tổng hợp.
- Email outbound template.

Đây là phần mở rộng sau v1; các tính năng này không được mặc định đưa trở lại vào danh sách chuẩn v1.

## 29. MVP v3 — nghiệp vụ chuyên biệt

- Flowchart nhiều nhánh.
- Parallel/join work process.
- Incoming email/IMAP.
- Calendar email.
- OnlyOffice.
- Cloud drive.
- Smart CA/PDF signing.
- Investor dashboard.
- Energy/incident/checklist nghiệp vụ ngành chuyên biệt.

---

# PHẦN V — QUY TẮC KỸ THUẬT NGHIỆP VỤ CẦN GIỮ

## 30. Transaction và idempotency

Một command nghiệp vụ phải là một transaction:

```text
1. Kiểm tra input
2. Kiểm tra quyền
3. Load aggregate
4. Kiểm tra version/trạng thái hiện tại
5. Validate transition
6. Ghi thay đổi aggregate
7. Ghi history/audit
8. Ghi outbox notification
9. Commit
```

Không gọi service ngoài trong transaction. FCM, SMTP, external HTTP phải chạy qua outbox/worker.

Các command nên có:

- `IdempotencyKey`.
- `ExpectedVersion`.
- `CorrelationId`.
- `ActorId`.
- `CreatedAt`.

## 31. Audit log và business history

`AuditLog` là nhật ký audit/security, ghi những event cần điều tra hoặc chứng minh: đăng nhập, truy cập, thay đổi quyền, actor, thời điểm, module, entity type/id, action, kết quả, IP/actor context và correlation ID.

`AssetHistory`, `WorkHistory`, `WorkflowTransition`, `AssetLifecycleCase` và các history module là business history, mô tả vòng đời nghiệp vụ, from/to, field, kết quả xử lý và file/hồ sơ liên quan.

Một command có thể ghi cả hai loại theo nhu cầu, nhưng không bắt buộc trùng toàn bộ dữ liệu. Không ghi password, access token, API key, FCM token hoặc nội dung secret vào audit.

## 32. Soft delete

MVP dùng soft delete cho:

- Asset.
- WorkItem.
- File.
- Folder.
- WorkflowDefinition.
- Project nếu còn quan hệ nghiệp vụ.

Không xóa cứng record có quan hệ lịch sử. Xóa file vật lý chỉ sau khi file không còn version/attachment nào tham chiếu.

## 33. Search

MVP search bằng database:

- Asset: code/name/status/location/category.
- Work: code/title/status/assignee.
- File: name/extension/owner.
- Chat: message content/chat name — Target v2, chỉ sau khi có nhu cầu.

Không cần Elasticsearch ở giai đoạn đầu.

## 34. Caching

Không cache dữ liệu nghiệp vụ quá lâu. Cache tối thiểu:

- Permission.
- Profile.
- Workflow published definition.
- Folder tree.
- Thống kê dashboard ngắn hạn — Target v2.

Nếu chạy nhiều instance, dùng distributed cache thay vì memory cache.

## 35. Realtime

Realtime phải là best-effort:

- Có thể mất event khi mất mạng.
- Client phải fetch lại dữ liệu.
- DB là nguồn chính.
- Không dùng SignalR để thực hiện quyền.
- Phải có reconnect/fetch lại unread và message.

## 36. Security bắt buộc

- Không lưu secret trong source.
- Không dùng API key đơn giản làm authorization cho toàn hệ thống.
- Tách service identity khỏi user identity khi gọi nội bộ.
- Kiểm tra object-level authorization.
- Kiểm tra MIME thực, không chỉ extension.
- Chống path traversal.
- Dùng checksum và storage key không dựa vào tên file người dùng.
- Không disable TLS validation.
- Public token phải ngẫu nhiên, hạn và thu hồi được.
- Rate limit login, upload, search, public link và notification.
- Không trả stack trace cho client.

---

# PHẦN VI — LỘ TRÌNH XÂY DỰNG

## 37. Thứ tự xây dựng đề xuất

### Giai đoạn 1 — Foundation

1. Chốt tên module và ranh giới ownership.
2. Chốt identity/permission.
3. Tạo audit/outbox.
4. Tạo Storage Adapter abstraction.
5. Tạo notification abstraction.
6. Tạo workflow definition/version/state machine.
7. Viết unit test cho state machine trước controller.

### Giai đoạn 2 — Workflow runtime

1. Tạo phiếu.
2. Submit.
3. Giao task.
4. Approve/return/reject.
5. Inbox.
6. Audit.
7. Notification.
8. File attachment.

### Giai đoạn 3 — Work

1. Project/status.
2. Tạo WorkItem.
3. Phân quyền.
4. Đổi status.
5. Parent/child.
6. File/history.
7. Work chat.

### Giai đoạn 4 — Library

1. Folder/file.
2. Storage.
3. Permission.
4. Version (v2).
5. Attachment.
6. Search.
7. Share.

### Giai đoạn 5 — Asset

1. Master data.
2. Asset CRUD.
3. Asset operation.
4. State transition.
5. History.
6. Stock (v2).
7. Inventory (v2).

### Giai đoạn 6 — Chat

1. Conversation/member.
2. Message.
3. Read state.
4. File/mention.
5. Realtime.
6. Work chat.

### Giai đoạn 7 — Hardening

1. Concurrency test.
2. Authorization test.
3. File security test.
4. Notification retry test.
5. Backup/restore.
6. Data migration rehearsal.
7. Observability.
8. Performance test.

---

## 38. Definition of Done cho từng use case

Một use case chỉ được coi là hoàn thành khi:

- Có business rule rõ ràng.
- Có API/use case application.
- Có kiểm tra quyền ở server.
- Có validation.
- Có audit.
- Có notification nếu nghiệp vụ yêu cầu.
- Có test thành công.
- Có test từ chối.
- Có test idempotency/concurrency nếu cập nhật trạng thái.
- Không để lại dữ liệu hoặc file orphan.
- Có migration/rollback nếu thay đổi schema.

---

# PHẦN VII — NHỮNG PHẦN CẦN LOẠI BỎ HOẶC GIAI LẠI

## 39. Cần loại bỏ khỏi bản mới

- Secrets và connection string nhạy cảm trong source.
- `EnsureCreated` chạy SQL không version.
- SQL dynamic `Data_<WorkflowCode>`.
- Dữ liệu nghiệp vụ nằm trong tên bảng sinh động.
- `NOLOCK` cho dữ liệu cần nhất quán.
- API key tĩnh dùng chung.
- Public token DES cố định.
- Hai controller Web/Mobile giống nhau.
- Logic phân quyền duplicate.
- Logic trạng thái duplicate.
- Kiểm tra `permission = true`.
- `AcceptAnyServerCertificateValidator`.
- Bảng/file local tạm không có cleanup và transaction.
- Gọi HTTP bên ngoài trong transaction.
- Thông báo gửi trực tiếp không có outbox.

## 40. Cần giữ lại nhưng đơn giản hóa

| Legacy | Bản mới |
|---|---|
| Workflow dynamic table | Definition/version + JSON/typed fields |
| Master-detail động | Work participants/checklist bảng riêng |
| Policy dynamic | AssetPolicy cấu hình theo operation |
| History động | AssetHistory/WorkHistory/WorkflowTransition riêng |
| Workflow service gọi qua HTTP | Application service nội bộ |
| API key controller mirror | Một application service, nhiều auth scheme nếu cần |
| Stock gắn với dynamic asset | StockItem + StockBalance + StockMovement |
| Inventory JSON local | InventorySession + InventoryLine |
| Permission string `P:;G:` | SubjectType/SubjectId chuẩn |
| `LastMessageIdDeleted` | `HiddenBeforeMessageId` hoặc soft-delete rõ ràng |
| Notification gọi trực tiếp | Outbox + delivery worker |
| FCM token gắn email | DeviceToken theo User/Platform |

---

# PHẦN VIII — NHỮNG ĐIỂM CẦN XÁC NHẬN TRƯỚC KHI CODE

## 41. Các câu hỏi nghiệp vụ cần chốt

1. Một workflow có cần chạy song song nhiều bước trong MVP không?
2. Có cần giữ lưu đồ công việc nhiều nhánh ngay từ đầu không?
3. Target đã tách Asset vật lý và StockItem; có chính sách nào yêu cầu ngoại lệ ngoài mô hình này không?
4. Inventory có bắt buộc qua workflow không?
5. StockOut có cần tạo tài sản vật lý ở nơi nhận không?
6. Tài sản có cần tồn tại ở nhiều vị trí cùng lúc không?
7. Thay đổi người xử lý công việc có bắt buộc workflow duyệt không?
8. Có cần phân biệt “người xem”, “người theo dõi”, “người phối hợp” trong UI MVP không?
9. Có cần public QR/link tài sản ngay từ đầu không?
10. File version có đủ rõ để đưa vào v2, hay có yêu cầu bắt buộc trong v1 không?
11. Có cần chat gắn với tài sản không hay chỉ Work trong v1?
12. Notification có bắt buộc gửi email trong v1 không?
13. Có cần 2FA/SSO mở rộng ngay từ đầu không?
14. Có cần dữ liệu legacy chạy song song trong lúc migrate không?
15. Có cần giữ tương thích API cũ cho mobile không?
16. Chính sách bảo hành được xác định theo tài sản, model, hợp đồng, ngày mua hay nhà cung cấp; thời hạn và giới hạn trách nhiệm là gì?
17. Hồ sơ bảo hành cần giấy tờ, phê duyệt, chi phí và trạng thái khi hoàn tất/không được bảo hành như thế nào?
18. Recall/soft-delete message có cần giới hạn theo chính sách pháp lý khác ngoài Target đã chọn không?

Nếu chưa có câu trả lời, giữ Target v1 đã chốt ở mục 27 và ghi rõ mọi ngoại lệ vào tài liệu trước khi triển khai; không tự ý đưa tính năng v2 vào v1.

---

# PHẦN IX — NGUỒN THAM KHẢO TRONG CÁC REPOSITORY

Phần này chỉ để tra cứu khi cần kiểm tra lại nghiệp vụ; tài liệu chính vẫn là phần tổng hợp ở trên.

## 42. `impc-app`

- Workflow definition: `impc-app/WorkFlow.Services.Model/WorkflowDBSets/Workflow.cs`
- Workflow step: `impc-app/WorkFlow.Services.Model/WorkflowDBSets/WorkflowStep.cs`
- Workflow instance: `impc-app/WorkFlow.Services.Model/WorkflowSets/UserWorkflow.cs`
- User workflow step: `impc-app/WorkFlow.Services.Model/WorkflowSets/UserWorkflowStep.cs`
- Send workflow: `impc-app/WorkFlow.Services/SendWorkflowService.cs`
- Workflow API dynamic user workflow: `impc-app/WorkFlow.API/wwwroot/sqlFiles/135.WorkflowDynamicUserInsert.sql`
- Runtime permission path: `impc-app/WorkFlow.API/wwwroot/sqlFiles/71.CheckUserHAvingPermissionOnUserWorkflow.sql`

## 43. `impc-asset`

- Asset aggregate: `impc-asset/Asset/Models/Asset/Info.cs`
- Asset status: `impc-asset/Asset/Models/Asset/AssetStatus.cs`
- Asset service: `impc-asset/Asset/Common/Services/AssetService.cs`
- Policy service: `impc-asset/Asset/Common/Services/PolicyService.cs`
- Stock service: `impc-asset/Asset/Common/Services/StockService.cs`
- Inventory service: `impc-asset/Asset/Common/Services/InventoryService.cs`
- Location service: `impc-asset/Asset/Common/Services/LocationService.cs`
- Asset context: `impc-asset/Asset/DataContexts/WorkflowContext.cs`
- Frontend routes: `impc-asset/Asset/ClientApp/src/routes/authourized-routes.tsx`

## 44. `impc_asset`

Nguồn nghiệp vụ gần như trùng với `impc-asset`; các file đáng xem:

- `impc_asset/Asset/Common/Services/AssetService.cs`
- `impc_asset/Asset/Common/Services/PolicyService.cs`
- `impc_asset/Asset/Common/Services/StockService.cs`
- `impc_asset/Asset/Common/Services/InventoryService.cs`
- `impc_asset/Asset/Common/Services/WorkflowService.cs`
- `impc_asset/Asset/Models/Asset/Info.cs`
- `impc_asset/Asset/Models/Asset/AssetStatus.cs`

## 45. `impc_library`

- File: `impc_library/CO3.Library/Models/Library/File.cs`
- Folder: `impc_library/CO3.Library/Models/Library/Folder.cs`
- File version: `impc_library/CO3.Library/Models/Library/FileVersion.cs`
- Shared file: `impc_library/CO3.Library/Models/Library/SharedFile.cs`
- Shared folder: `impc_library/CO3.Library/Models/Library/SharedFolder.cs`
- Library service: `impc_library/CO3.Library/Common/Services/LibraryService.cs`
- Library context: `impc_library/CO3.Library/DataContexts/LibraryContext.cs`
- Work API: `impc_library/CO3.Library/Controllers/WorkController.cs`
- Workflow API: `impc_library/CO3.Library/Controllers/WorkflowController.cs`
- Public API: `impc_library/CO3.Library/Controllers/PublicLibraryController.cs`
- Permission SQL: `impc_library/CO3.Library/wwwroot/SQLFiles/dbo.GetFilePermission.UserDefinedFunction.sql`

## 46. `impc-chat`

- Chat aggregate: `impc-chat/Models/Chat/Info.cs`
- Message: `impc-chat/Models/Chat/Message.cs`
- Member: `impc-chat/Models/Chat/Member.cs`
- Per-user parameter: `impc-chat/Models/Chat/Parameter.cs`
- Chat service: `impc-chat/Common/Services/ChatService.cs`
- Message service: `impc-chat/Common/Services/MessageService.cs`
- Work service: `impc-chat/Common/Services/WorkService.cs`
- File service: `impc-chat/Common/Services/MessageFileService.cs`
- Hub: `impc-chat/Hubs/IChatHub.cs`
- Chat API: `impc-chat/Controllers/ChatController.cs`

## 47. `impc-service`

- Service context: `impc-service/CO3.Services.Model/DBContext/ServiceContext.cs`
- Notification entity: `impc-service/CO3.Services.Model/Entities/Notification.cs`
- FCM service: `impc-service/CO3.Services.Application/Services/FcmTokenService.cs`
- Notification service: `impc-service/CO3.Services.Application/Services/NotificationService.cs`
- Outbound mail: `impc-service/CO3.Services/ServiceBack/BackService.cs`
- Incoming email: `impc-service/CO3.Services.Application/Services/MessageService.cs`
- SignalR hub: `impc-service/CO3.Services.Application/SignalRHubs/WorkflowHub.cs`
- Chat event bridge: `impc-service/CO3.Services/Controllers/ChatController.cs`
- 2FA service: `impc-service/CO3.Services.Application/Services/TwoFactorService.cs`
- Smart CA service: `impc-service/CO3.Services.Application/Services/VnptSmartCaService.cs`

## 48. `impc-workflow`

- Work model: `impc-workflow/IMPC_Work/Models/Data_WORK.cs`
- Project: `impc-workflow/IMPC_Work/Models/Data_RESOURCEDA.cs`
- Work status: `impc-workflow/IMPC_Work/Models/Data_RESOURCETTFC.cs`
- Main service: `impc-workflow/IMPC_Work/Services/DefaultService.cs`
- Work permission: `impc-workflow/IMPC_Work/Services/GeneralFuntionService.cs`
- Recurring work: `impc-workflow/IMPC_Work/Services/WorkRepeatService.cs`
- Workflow definition: `impc-workflow/IMPC_Work/Models/WFModels/Workflow.cs`
- Workflow property: `impc-workflow/IMPC_Work/Models/WFModels/PropertyModel.cs`
- Work context: `impc-workflow/IMPC_Work/Models/WorkFlowContext.cs`
- Notification integration: `impc-workflow/IMPC_Work/Services/NotificationService.cs`
- E-Office adapter: `impc-workflow/IMPC_Work/IServices/ApiEofficeService.cs`

---

## 49. Tóm tắt cho người bắt đầu code

Nếu bắt đầu từ hôm nay, hãy xây dựng theo thứ tự sau:

1. Identity + permission + audit + outbox.
2. Workflow definition/version + state machine.
3. Workflow instance/task + notification.
4. Project + WorkItem + status transition.
5. Library folder/file + attachment + permission.
6. Asset master data + Asset + AssetOperation.
7. Stock + Inventory cơ bản (v2, sau khi MVP v1 end-to-end).
8. Chat + Work chat.
9. FCM/push (v2) và email delivery.
10. Hardening, migration và performance.

Không cần bắt đầu bằng UI, cũng không cần tái tạo toàn bộ controller cũ. Hãy bắt đầu bằng domain model, transition rule, transaction boundary, authorization và audit. Khi các phần này đúng, phần UI/API có thể thay đổi linh hoạt mà không phá nghiệp vụ.
