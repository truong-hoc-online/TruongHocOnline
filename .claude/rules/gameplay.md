# Lối chơi (tóm tắt để nhớ nhanh)

## Nhịp giờ thật

- Từ 2026-11-03 (save v2). 1 "ngày" = 1 lần ở nhà + 1 phiên trường **6 giờ thật**:
  **home** (không giới hạn giờ; đồng hồ hiện 6:xx) → ra cửa: `sessionEnd = now + 6h` → **school** (preBell 30 s →
  6 tiết × 3 câu, ra chơi 75 s sau tiết 2 và 4; vào lớp muộn > 25 s trừ 2 + `lateCount`; không ngồi sau 60 s = trốn
  tiết −6; xong 6 tiết → `sub = 'free'` tới hết 6 giờ) → hết 6 giờ: **after** (cổng → về nhà; lêu lổng −2/lần, 2 lần
  hoặc quá 3 phút thật thì mẹ gọi về) → `finishSession()` (tổng kết, ngày +1) → home.
- Tiết học chạy theo thời gian chơi (`now`), không theo giờ thật → thoát game không bị tính trốn tiết. Vào lại giữa
  buổi → về preBell của tiết kế (`today.done`). Đóng game quá 6 giờ → lúc mở lại tự tổng kết và về nhà.

## Đồng phục và giặt đồ

- `state.uniform = { clean, dirty, washing, until }` (số bộ, save v3). Mặc lấy 1 bộ khỏi đống sạch (hoặc dơ); hết
  buổi bộ đang mặc → dirty; giặt = mọi bộ dơ → washing 15 phút thật (chạy cả khi tắt game) → clean. Mua "đồng phục dự
  phòng" = thêm bộ sạch.
- Đồ dơ chỉ bị trừ 3 khi sao đỏ (50% lúc qua cổng) hoặc sao đỏ/giám thị lại gần (40%/lần gặp) bắt được, tối đa
  1 lần/buổi. Cổng: không đồng phục −5, quên khăn −3, quên sách −2; buổi ngoan +3.

## Lớp và lên lớp

- `state.section` 1–4 = A1–A4 (`CLASS_GROUPS`): A1 Toán·KHTN·Tin (xanh dương), A2 Văn·Sử Địa·GDCD (đỏ đô),
  A3 Anh·Công nghệ·Trải nghiệm (xanh lá), A4 Thể chất·Nghệ thuật·Địa phương (cam).
- Xong 3 môn của lớp → về nhà chuyển lớp kế; mẹ đổi **mọi** bộ (cả bộ mua thêm) sang màu mới, sạch
  (`newClassUniforms`). Xong A4 + HK ≥50 → lên khối. Lớp 9 xong → tốt nghiệp.

## Coco 🥥

- `state.coco` (save v3; tiền "k" cũ chuyển 1:1): +1/câu đúng, +5 xong môn, +5 buổi ngoan, tối đa 40/ngày.
- Tiêu: ăn sáng ở bàn ăn (cơm trắng miễn phí; hủ tiếu 15, cơm sườn 20…), căng tin, 🛒 cửa hàng ở bàn học (đồng phục
  dự phòng 60, phụ kiện 25–40, đồ chơi 10–25). Bị bắt nạt "đưa tiền" = mất ≤10 coco. **Chưa bán bằng tiền thật.**

## Chọc bạn

- Bỏ tối đa 2 loại đồ chơi vào cặp ở nhà (`today.packed`). Lúc preBell/ra chơi/tự do/tan trường, ngoài vùng yên lặng,
  đứng ≤1,8 m cạnh bạn cùng trường (không phải thầy cô/nhân viên/2 bạn lớp 9) → nút "🔫 Xịt nước …".
- Thầy cô/sao đỏ trong 9 m → xác suất `catch` của món: tịch thu + HK −3. Chọc cùng một bạn lần 2 → bạn mách cô,
  HK −2, nhắc "chọc mãi một người là bắt nạt". `prankCount` ≥6 → `ca-biet`.

## Góp ý 📮

Nút trên HUD + hộp thư cạnh cổng trường.

## Tag

`gioi` (≥15 câu, đúng ≥80%, HK ≥80) · `lop-truong` (ngày ≥3, HK ≥85, đúng ≥60%) · `ca-biet` (HK <60 / vào lớp muộn 3
/ lêu lổng 4 / chọc bạn 6; gỡ khi HK ≥75 và reset bộ đếm) · `bi-bat-nat` (sự kiện ra chơi, từ ngày 2, 35%; gỡ sau
2 lần kể cô Thu) · `co-giao` (chưa lấy được).
