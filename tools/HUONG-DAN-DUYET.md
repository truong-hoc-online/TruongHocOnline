# Hướng dẫn duyệt câu hỏi — Trường Học Online

Cảm ơn thầy cô đã giúp duyệt câu hỏi. Game dành cho học sinh THCS (lớp 6–9); mỗi câu là trắc nghiệm 4 lựa chọn.

## Mở file

- **Excel:** mở thẳng `questions-review.csv`. Nếu mọi chữ dồn vào một cột: *Data → From Text/CSV*, chọn
  *UTF-8* và dấu phẩy. Khi lưu, chọn **"CSV UTF-8 (Comma delimited)"** (không chọn "CSV" thường — sẽ mất dấu tiếng Việt).
- **Google Sheets:** *Tệp → Nhập → Tải lên*; xong thì *Tệp → Tải xuống → CSV*.
- **Không** xoá, đổi tên hay đổi thứ tự dòng tiêu đề; **không** sửa cột **ID** và **Nguồn**.

## Mỗi dòng một câu

| Cột | Ý nghĩa |
|---|---|
| Môn, Lớp tối thiểu | Câu hiện từ lớp này trở lên (6–9). Có thể sửa thẳng số lớp. |
| Câu hỏi, Đáp án đúng, Sai 1–3 | Nội dung hiện tại. Đáp án đúng luôn ở cột riêng; trong game 4 đáp án được xáo trộn. |
| Nguồn | `ngân hàng` = câu soạn sẵn · `tự sinh — mẫu` = câu máy tự sinh (Toán, Tiếng Anh) · `Mới` = dòng trống để thêm câu |
| **Duyệt** | Thầy cô ghi một trong các dấu dưới đây |
| Sửa câu hỏi, Sửa đáp án đúng, Sửa sai 1–3 | Chỉ ghi ô cần sửa; ô để trống = giữ nguyên |
| Ghi chú | Lý do, nguồn sách, góp ý khác |

## Cột "Duyệt"

- **Đ** — câu đúng, giữ nguyên.
- **Sửa** — ghi nội dung mới vào các cột "Sửa …".
- **Xoá** — bỏ câu này (sai kiến thức, không hợp lứa tuổi, trùng câu khác…).
- **S** — câu có vấn đề nhưng thầy cô chưa biết sửa thế nào; ghi lý do ở Ghi chú.
- Để trống = chưa duyệt.

Câu **tự sinh — mẫu** không sửa được trong file (máy sinh theo công thức); nếu thấy sai, ghi **S** và mô tả ở Ghi chú.

## Thêm câu mới

Dùng các dòng **Mới** ở cuối mỗi môn: ghi Lớp tối thiểu, Câu hỏi, Đáp án đúng, Sai 1–3. Cần thêm dòng thì chép một
dòng Mới, đổi đuôi ID (ví dụ `van-moi-04`). Môn Tiếng Anh/Toán: câu mới sẽ được chuyển cho người lập trình.

## Tiêu chí một câu tốt

1. Đúng chương trình **GDPT 2018** và đúng sách giáo khoa hiện hành của lớp ghi ở "Lớp tối thiểu".
2. Có **đúng một** đáp án đúng, không gây tranh cãi.
3. **3 đáp án sai hợp lý** (cùng loại, dễ nhầm), không đùa cợt, không lộ đáp án.
4. 4 đáp án **khác nhau**, không trùng câu hỏi khác.
5. Câu ngắn, rõ, hợp lứa tuổi; không bạo lực, không thông tin cá nhân, không quảng cáo.
6. Thông tin có thể đổi theo thời gian (tên tỉnh sau sáp nhập 2025, số liệu…) cần kiểm tra lại.
7. **Giáo dục địa phương:** nội dung phụ thuộc **tỉnh** (mỗi tỉnh một bộ sách). Hiện đang là văn hoá chung của cả
   nước — khi đã chọn tỉnh, xin thay bằng câu theo sách của tỉnh đó.

Duyệt xong, gửi lại file CSV cho người phụ trách dự án.
