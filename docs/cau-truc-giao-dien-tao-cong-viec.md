# Đặc tả giao diện Tạo công việc

## 1. Phạm vi

Tài liệu này chỉ mô tả giao diện và hành vi của chức năng **Tạo công việc** hiển thị dưới dạng modal. Các thành phần thuộc màn hình nền phía sau modal như thanh điều hướng, danh sách công việc và bộ lọc không nằm trong phạm vi.

---

## 2. Tổng quan giao diện

Chức năng **Tạo công việc** được hiển thị dưới dạng modal lớn, phủ lên nội dung hiện tại.

### Cấu trúc tổng thể

```text
Modal Tạo công việc
├── Header
│   ├── Tiêu đề: Tạo công việc
│   └── Nút đóng: X
├── Body có thanh cuộn dọc
│   ├── Khối Thông tin chung
│   │   ├── Tiêu đề khối
│   │   └── Form hai cột
│   └── Khối danh sách tiêu chí/đầu việc
│       ├── Nút thêm dòng: +
│       └── Bảng chi tiết
└── Footer cố định
    ├── Nút Đóng
    └── Nút Thêm
```

---

## 3. Modal Tạo công việc

### 3.1. Kích thước và hiển thị

- Modal có chiều rộng lớn, gần chiếm toàn bộ chiều ngang màn hình.
- Modal được căn giữa màn hình.
- Nền phía sau có lớp phủ tối và không thể thao tác khi modal đang mở.
- Modal có nền trắng, bo góc nhẹ và đổ bóng.
- Phần nội dung có thanh cuộn dọc riêng khi chiều cao vượt quá vùng hiển thị.
- Header và footer nên được giữ ổn định để người dùng luôn thấy tiêu đề và các nút thao tác chính.

### 3.2. Header

Header gồm:

- Tiêu đề **Tạo công việc** nằm bên trái.
- Nút biểu tượng **X** nằm bên phải để đóng modal.
- Có đường phân cách nhẹ giữa header và nội dung.

#### Hành vi nút X

- Đóng modal nếu chưa có dữ liệu thay đổi.
- Nếu người dùng đã nhập hoặc chỉnh sửa dữ liệu nhưng chưa lưu, nên hiển thị cảnh báo xác nhận trước khi đóng.

---

## 4. Khối Thông tin chung

Khối đầu tiên có tiêu đề **Thông tin chung** và phần form bên dưới.

### 4.1. Bố cục form

Trên màn hình lớn, form được chia thành hai cột có chiều rộng tương đương.

```text
Cột trái                         Cột phải
────────────────────────────────────────────────────
Dự án *                          Mô tả *
Người xử lý                      Hạn hoàn thành
Ngày khởi tạo                    Vị trí *
```

Trên màn hình nhỏ, các trường nên chuyển thành một cột theo thứ tự:

1. Dự án
2. Mô tả
3. Người xử lý
4. Hạn hoàn thành
5. Ngày khởi tạo
6. Vị trí

### 4.2. Danh sách trường dữ liệu

#### Dự án

- Nhãn: **Dự án \***
- Loại control: ô chọn có chức năng tìm kiếm.
- Có biểu tượng tìm kiếm ở cuối ô.
- Bắt buộc nhập.
- Khi thao tác, mở danh sách dự án để tìm kiếm và lựa chọn.
- Giá trị lưu nên gồm tối thiểu `projectId` và tên dự án hiển thị.

#### Mô tả

- Nhãn: **Mô tả \***
- Loại control trong ảnh: ô nhập văn bản một dòng.
- Bắt buộc nhập.
- Nên giới hạn độ dài phù hợp, ví dụ 255 hoặc 500 ký tự tùy quy định hệ thống.
- Nếu nghiệp vụ cần nội dung dài, có thể đổi thành textarea nhưng phải thống nhất với thiết kế thực tế.

#### Người xử lý

- Nhãn: **Người xử lý**
- Loại control: ô chọn có chức năng tìm kiếm.
- Có biểu tượng tìm kiếm ở cuối ô.
- Không có dấu sao trong ảnh nên được hiểu là không bắt buộc.
- Có thể hỗ trợ chọn một hoặc nhiều người tùy theo nghiệp vụ, nhưng giao diện hiện tại thể hiện giống ô chọn một giá trị.

#### Hạn hoàn thành

- Nhãn: **Hạn hoàn thành**
- Loại control: DatePicker hoặc DateTimePicker.
- Có biểu tượng lịch ở cuối ô.
- Không có dấu sao trong ảnh nên được hiểu là không bắt buộc.
- Nếu có giá trị, hạn hoàn thành không được nhỏ hơn ngày khởi tạo.

#### Ngày khởi tạo

- Nhãn: **Ngày khởi tạo**
- Loại control: DateTimePicker.
- Có biểu tượng lịch ở cuối ô.
- Giá trị mặc định là thời điểm mở giao diện tạo công việc.
- Định dạng đang thể hiện trong ảnh: `DD/MM/YYYY HH:mm`.
- Ví dụ trong ảnh: `23/09/2026 17:49`.
- Không có dấu sao trong ảnh, nhưng nên luôn có giá trị mặc định để phục vụ nghiệp vụ.

#### Vị trí

- Nhãn: **Vị trí \***
- Loại control: ô nhập văn bản một dòng.
- Bắt buộc nhập.
- Có thể mở rộng thành ô chọn vị trí nếu hệ thống đã có danh mục vị trí.

### 4.3. Quy tắc hiển thị lỗi

- Hiển thị thông báo lỗi ngay bên dưới trường tương ứng.
- Trường lỗi nên có viền màu đỏ và trạng thái hỗ trợ công nghệ đọc màn hình.
- Không chỉ dùng màu sắc để thể hiện lỗi, cần có nội dung lỗi cụ thể.
- Khi người dùng nhấn **Thêm**, focus vào trường lỗi đầu tiên.

Ví dụ thông báo:

- `Vui lòng chọn dự án.`
- `Vui lòng nhập mô tả.`
- `Vui lòng nhập vị trí.`
- `Hạn hoàn thành phải lớn hơn hoặc bằng ngày khởi tạo.`

---

## 5. Khối danh sách tiêu chí hoặc đầu việc

Khối thứ hai chứa bảng chi tiết, nạp từ **mẫu checklist** đã nhập sẵn.

### 5.1. Nút chọn mẫu

- Nút biểu tượng **+** nằm ở góc trên bên phải của khối.
- Khi nhấn, mở dialog **Chọn mẫu checklist**: chọn danh mục mẫu, tick các nhóm
  cần dùng rồi bấm **Thêm vào bảng**.
- Nút cần có tooltip hoặc nhãn hỗ trợ như **Chọn mẫu checklist** để tránh phụ
  thuộc hoàn toàn vào biểu tượng.
- Mẫu do người dùng tự nhập trước, nên dialog này chỉ chọn — không sửa, không
  thêm dòng trống, không lưu mẫu mới.

### 5.2. Cấu trúc bảng

Bảng **chỉ xem trước** (không sửa được ở màn tạo việc), gồm 8 cột theo thứ tự:

1. **Tên**
2. **Tiêu chuẩn kiểm tra**
3. **Số lượng**
4. **Giá trị**
5. **Đính kèm**
6. **Checkpoint**
7. **Trạng thái**
8. **Ghi chú**

### 5.3. Ý nghĩa đề xuất cho từng cột

#### Tên

- Tên tiêu chí, hạng mục hoặc đầu việc chi tiết — lấy từ mẫu.
- Dòng nhóm (có nội dung con) merge full hàng, chỉ hiện tiêu đề, nền `#f3f5f9`.

#### Tiêu chuẩn kiểm tra

- Nội dung hoặc tiêu chuẩn dùng để đánh giá đầu việc — lấy từ mẫu.

#### Số lượng

- Số lượng thực hiện, không cho phép số âm. Mặc định **rỗng**, nhập lúc đi kiểm tra.

#### Giá trị

- Giá trị thực tế của tiêu chí. Kiểu dữ liệu do **loại giá trị** của mẫu quyết định:
  **Đúng/Sai** (boolean) · **Chữ** (text) · **Số** (number). Mặc định **rỗng**,
  nhập lúc đi kiểm tra.

#### Đính kèm

- Ảnh/tệp minh hoạ kết quả. Mặc định **rỗng**, nhập lúc đi kiểm tra.

#### Checkpoint

- Vị trí lat/long của thiết bị gửi lên khi chụp ảnh (`photo_lat` , `photo_lng`).
  Mặc định **rỗng**.

#### Trạng thái

- Kết quả đánh giá nội dung con: **Đạt** / **Không đạt**.
  Mặc định **rỗng** (chưa đánh giá) khi khởi tạo công việc.

#### Ghi chú

- Nội dung bổ sung cho đầu việc, mặc định rỗng.

### 5.4. Trạng thái rỗng

Khi chưa chọn mẫu, bảng hiển thị:

- Biểu tượng trạng thái rỗng ở giữa.
- Nội dung **Chưa chọn mẫu — bấm nút + để nạp tiêu chí từ mẫu checklist**.
- Người dùng có thể nhấn nút **+** để mở dialog chọn mẫu.

### 5.5. Thao tác trên dòng

Bảng ở màn tạo việc không có cột thao tác (không sửa/xóa được). Nhập liệu thực
thi (giá trị, trạng thái Đạt/Không đạt, ảnh đính kèm, ghi chú) làm ở màn chi tiết
công việc.

---

## 6. Footer và các nút thao tác

Footer nằm ở đáy modal, căn các nút về bên phải.

### 6.1. Nút Đóng

- Kiểu nút phụ, nền trắng và viền xanh.
- Đóng modal mà không tạo công việc.
- Nếu form đã thay đổi, nên hiển thị xác nhận bỏ dữ liệu.

### 6.2. Nút Thêm

- Kiểu nút chính, nền xanh.
- Thực hiện kiểm tra dữ liệu và gửi yêu cầu tạo công việc.
- Khi đang gửi dữ liệu:
  - Hiển thị trạng thái loading.
  - Vô hiệu hóa nút để tránh gửi nhiều lần.
  - Không cho phép đóng modal nếu việc đóng có thể làm gián đoạn request.
- Khi thành công:
  - Hiển thị thông báo tạo công việc thành công.
  - Đóng modal.
  - Làm mới danh sách công việc ở màn hình phía sau.
- Khi thất bại:
  - Giữ nguyên dữ liệu đã nhập.
  - Hiển thị thông báo lỗi phù hợp.
  - Cho phép người dùng thử lại.

---

## 7. Validation đề xuất

### 7.1. Trường bắt buộc theo giao diện

- Dự án.
- Mô tả.
- Vị trí.

### 7.2. Validation liên trường

- Hạn hoàn thành phải lớn hơn hoặc bằng ngày khởi tạo.
- Nếu có dòng chi tiết, mỗi dòng phải đáp ứng các trường bắt buộc của dòng.
- Không gửi các dòng đang nhập dở hoặc không hợp lệ.

### 7.3. Validation dữ liệu bảng

- Tên đầu việc không được để trống.
- Trạng thái phải là `PASS`, `FAIL` hoặc rỗng (chưa đánh giá).

---

## 8. Trạng thái giao diện cần hỗ trợ

Modal nên có các trạng thái sau:

1. **Khởi tạo**: form trống, ngày khởi tạo có giá trị mặc định.
2. **Đang nhập**: người dùng đang cập nhật form.
3. **Đang tải danh mục**: tải dự án, người xử lý hoặc trạng thái.
4. **Không có dữ liệu danh mục**: không tìm thấy dự án hoặc người xử lý.
5. **Có lỗi validation**: hiển thị lỗi tại từng trường.
6. **Đang gửi**: khóa thao tác gửi lặp và hiển thị loading.
7. **Gửi thành công**: thông báo thành công và đóng modal.
8. **Gửi thất bại**: thông báo lỗi, giữ nguyên dữ liệu.

---

## 9. Khả năng đáp ứng giao diện

### Màn hình desktop

- Modal có chiều rộng lớn.
- Form hiển thị hai cột.
- Bảng có thể hiển thị đầy đủ hoặc cuộn ngang nếu không đủ không gian.

### Màn hình tablet và mobile

- Modal chuyển sang gần toàn màn hình hoặc toàn màn hình.
- Form chuyển thành một cột.
- Header và footer nên sticky.
- Bảng cần cuộn ngang trong phạm vi khối bảng, không làm tràn toàn bộ trang.
- Kích thước vùng chạm của nút X, nút + và các nút thao tác nên tối thiểu khoảng 44 x 44 px.

---

## 10. Khả năng truy cập

- Modal cần có `role="dialog"` và `aria-modal="true"`.
- Tiêu đề **Tạo công việc** cần được liên kết với modal bằng `aria-labelledby`.
- Khi mở modal, focus chuyển vào control đầu tiên có thể thao tác.
- Focus phải được giữ bên trong modal khi nhấn Tab.
- Nhấn Escape có thể đóng modal, nhưng phải áp dụng cảnh báo nếu có dữ liệu chưa lưu.
- Khi đóng modal, focus quay lại nút đã mở modal.
- Tất cả input phải có label liên kết rõ ràng.
- Biểu tượng X, tìm kiếm, lịch và dấu + phải có tên truy cập phù hợp.

---

## 11. Cấu trúc dữ liệu tham khảo

```json
{
  "projectId": "string",
  "description": "string",
  "assigneeId": "string | null",
  "startAt": "ISO-8601 datetime",
  "dueAt": "ISO-8601 datetime | null",
  "location": "string",
  "items": [
    {
      "name": "string",
      "inspectionStandard": "string | null",
      "valueType": "BOOLEAN | TEXT | NUMBER | null",
      "quantity": 0,
      "value": "string | number | boolean | null",
      "attachments": [],
      "checkpoint": "string | boolean | null",
      "result": "PASS | FAIL | null",
      "note": "string | null"
    }
  ]
}
```

---

## 12. Tiêu chí hoàn thành giao diện

- Modal mở và đóng đúng hành vi.
- Nội dung modal có thể cuộn độc lập.
- Các trường hiển thị đúng theo bố cục hai cột trên desktop.
- Các trường bắt buộc được đánh dấu và validation chính xác.
- Trường dự án và người xử lý hỗ trợ tìm kiếm.
- Trường ngày giờ có bộ chọn lịch phù hợp.
- Nút + mở được dialog chọn mẫu và nạp được dòng chi tiết.
- Bảng hiển thị đúng 8 cột và có trạng thái rỗng.
- Nút Đóng xử lý trường hợp có dữ liệu chưa lưu.
- Nút Thêm có loading, chống gửi lặp và xử lý đầy đủ thành công hoặc thất bại.
- Giao diện hoạt động tốt trên desktop, tablet và mobile.
- Hỗ trợ điều hướng bàn phím và công nghệ đọc màn hình.
