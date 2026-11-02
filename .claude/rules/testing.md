---
paths:
  - "js/**/*.js"
  - "sw.js"
  - "index.html"
  - "style.css"
  - "mods/**/*.json"
---

# Kiểm thử

Sau khi sửa code: `node --check` → unit (nếu đụng mod/ví) → E2E 3 cỡ → xem ảnh chụp điện thoại → tắt server → commit.

- **Fuzz câu hỏi (Node):** mọi môn × lớp 6–9 × 2000 lần → đủ 4 đáp án khác nhau, có đáp án đúng. Cần `package.json`
  `{"type":"module"}` tạm thời để import `js/subjects.js` (xoá sau khi chạy).
- **`node --check`:** copy file sang đuôi `.mjs` rồi check.
- **Unit (Node) `unit.mjs <repo>`:** validatePack với base.json + pack "phá" (HTML, giá âm, trường lạ, trùng id, kind/fx
  lạ, không phải object) + ví coco (giới hạn ngày, thiếu tiền, số âm, mua, sổ cái). 24 kiểm tra. Ở scratchpad phiên —
  viết lại nếu mất (dùng `fileURLToPath`, vì đường dẫn scratchpad có `~` bị mã hoá thành `%7E`).
- **E2E:** Edge headless `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` + CDP qua `WebSocket` của
  Node, mở `http://localhost:8081/?debug` (python http.server). Ba cỡ: 1280×720, 390×844, và **giả lập iPhone**
  (`Emulation.setTouchEmulationEnabled` + UA Safari iOS). Script `e2e.mjs <outDir> [w] [h] [iphone]` (54 kiểm tra):
  mod tải đủ → cửa hàng (súng nước, mũ, đồng phục dự phòng) → đeo mũ → ăn hủ tiếu bằng coco → mang đồ chơi → 6 tiết
  (+ chọc bạn ở sân, chọc lần 2 bị mách, không chọc được trong lớp) → tự do → hộp thư góp ý (hàng chờ có câu hỏi + vị
  trí) → giám thị bắt đồ dơ (1 lần) → cấm nói → `endSession()` → tổng kết → mặc bộ dự phòng / giặt / `finishWash()` →
  chuyển 6A1→6A2 → xong A4 lên 7A1 → đóng game quá 6 giờ → vào lại giữa buổi → migrate save v1→v3 → SW có mods → không
  lỗi console. Ở scratchpad phiên — viết lại nếu mất.
- Mẹo E2E:
  - Gọi `void __g.interact()` (không await, nếu không sẽ treo chờ modal).
  - `drain()` bấm nút ĐẦU TIÊN của modal — đừng dùng để đóng tủ đồ (sẽ mặc đồ); bấm 'Thôi'.
  - Muốn cài save giả rồi reload thì chặn `Storage.prototype.setItem` trước (game tự lưu khi trang bị ẩn → ghi đè).
  - Chờ reload 3 s đôi khi thiếu (flaky) — chạy lại trước khi kết luận là lỗi game.
  - Số kiểm tra mỗi lần có thể lệch 1–2 vì chọc bạn có yếu tố ngẫu nhiên (bị bắt thì bỏ qua bước "chọc lần 2").
  - Trình duyệt headless không có font emoji (🥥 hiện ô xám) — không phải lỗi.
- **Nhớ tắt python server sau khi test.**
