---
paths:
  - "js/**/*.js"
  - "sw.js"
  - "index.html"
  - "style.css"
  - "mods/**/*.json"
  - "tests/**"
---

# Kiểm thử

Sau khi sửa code: `node --check` → **`tests\run-all.ps1`** (fuzz + unit + E2E 3 cỡ, tự bật/tắt server) → xem ảnh chụp
điện thoại trong `tests\out\390x844\` và `tests\out\iphone\` → commit. Cách chạy: `tests/README.md`.

Bộ test nằm trong repo ở **`tests/`** (từ segment S0, 2026-11-03), không còn ở scratchpad. Không thêm package.json ở
gốc repo; `tests/package.json` chỉ có `{"type":"module"}`. Không dùng thư viện npm (Node 24 có sẵn `WebSocket`, `fetch`).

- **`tests/fuzz-questions.mjs [N]`:** mọi môn × lớp 6–9 × 2000 lần → đủ 4 đáp án khác nhau, có đáp án đúng; 12 môn
  chia đủ vào CLASS_GROUPS.
- **`node --check`:** copy file sang đuôi `.mjs` rồi check.
- **`tests/unit.mjs [repo]`:** validatePack với base.json + pack "phá" (HTML, giá âm, trường lạ, trùng id, kind/fx lạ,
  không phải object), loadCatalog (fetch giả), ví coco (giới hạn ngày, thiếu tiền, số âm, mua, sổ cái ≤100). 38 kiểm
  tra. Đổi mod/ví → sửa test ở đây.
- **`tests/e2e.mjs <outDir> [w] [h] [iphone]`:** Edge headless `--headless=new --use-angle=swiftshader
  --enable-unsafe-swiftshader` + CDP qua `WebSocket` của Node, hồ sơ Edge mới trong thư mục tạm, mở
  `http://localhost:8081/?debug`. Ba cỡ: 1280×720, 390×844, **giả lập iPhone** (touch + UA Safari iOS). 69 kiểm tra:
  mod → cửa hàng → đeo mũ → ăn hủ tiếu bằng coco → mang đồ chơi → 6 tiết (+ chọc bạn ở sân, lần 2 bị mách, không chọc
  được trong lớp, bị sao đỏ tịch thu) → tự do → hộp thư góp ý (hàng chờ có câu hỏi + vị trí) → đồ dơ bị bắt (1 lần) →
  cấm nói + lọc từ tục → `endSession()` → tổng kết → 6A1→6A2 → giặt / bộ dự phòng / `finishWash()` → xong A4 lên 7A1
  → đóng game quá 6 giờ → vào lại giữa buổi → migrate save v1→v3 → SW có mods → không lỗi console. Thêm tính năng →
  thêm bước vào đây.
- Mẹo E2E (đã áp dụng trong `e2e.mjs`, helper `window.__t`):
  - Gọi `void __g.interact()` (không await, nếu không sẽ treo chờ modal).
  - `drain()` bấm nút ĐẦU TIÊN của modal — đừng dùng để đóng tủ đồ (sẽ mặc đồ); bấm 'Thôi'.
  - Muốn cài save giả rồi reload thì chặn `Storage.prototype.setItem` trước (game tự lưu khi trang bị ẩn → ghi đè).
  - Chờ reload 3 s đôi khi thiếu (flaky) — chạy lại trước khi kết luận là lỗi game.
  - Phần ngẫu nhiên (bị bắt khi chọc bạn, sao đỏ bắt đồ dơ) được cố định: tạm thay `Math.random`, dời giám thị ra xa
    → số kiểm tra không đổi giữa các lần chạy.
  - Trình duyệt headless không có font emoji (🥥 hiện ô xám) — không phải lỗi.
- **Chạy E2E riêng thì nhớ tắt python server sau khi test** (`run-all.ps1` tự tắt).
