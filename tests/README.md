# Bộ kiểm thử

Không cần cài gì thêm ngoài những thứ đã có trên máy: **Node 24**, **Python 3** (để chạy web server tĩnh) và
**Microsoft Edge** (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`). Không có thư viện npm.
`tests/package.json` chỉ để Node coi các file trong thư mục này là ES module.

## Chạy tất cả

```powershell
powershell -ExecutionPolicy Bypass -File tests\run-all.ps1
```

Script sẽ: chạy fuzz câu hỏi → unit → bật `python -m http.server 8081` ở gốc repo → chạy E2E ở 3 cỡ
(1280×720, 390×844, giả lập iPhone) → **luôn tắt server** khi xong (kể cả khi lỗi). Mã thoát 0 = tất cả đạt.

- Ảnh chụp màn hình + `results.json` của từng cỡ: `tests\out\<cỡ>\` (đã cho vào `.gitignore`).
- Chỉ chạy fuzz + unit: `tests\run-all.ps1 -SkipE2E`.
- Python ở chỗ khác: `tests\run-all.ps1 -Python "đường\dẫn\python.exe"`.
- Cổng 8081 đang bận (ví dụ `chay.bat` đang mở) thì script dừng và báo — tắt server kia trước.

## Chạy từng phần

```powershell
node tests\fuzz-questions.mjs [số lần, mặc định 2000]
node tests\unit.mjs
# E2E cần server đang chạy ở cổng 8081 (python -m http.server 8081 ở gốc repo):
node tests\e2e.mjs tests\out\thu 1280 720
node tests\e2e.mjs tests\out\thu 390 844
node tests\e2e.mjs tests\out\thu 390 844 iphone
```

| Script | Kiểm tra gì |
|---|---|
| `fuzz-questions.mjs` | Mọi môn × lớp 6–9 × 2000 lần `makeQuestion()`: đúng 4 đáp án khác nhau, có đáp án đúng; 12 môn chia đủ vào 4 lớp A1–A4 |
| `unit.mjs` | `validatePack` với `mods/base.json` + pack "phá" (HTML, giá âm, trường lạ, trùng id, kind/fx lạ, không phải object); `loadCatalog`; ví coco (giới hạn 40/ngày, thiếu tiền, số âm, mua, sổ cái ≤100 dòng) |
| `e2e.mjs` | Chơi thật trong Edge headless qua CDP (`?debug` → `window.__g`): mod → cửa hàng → đeo mũ → ăn sáng bằng coco → mang đồ chơi → 6 tiết + chọc bạn (lần 2 bị mách, trong lớp không chọc được, bị sao đỏ tịch thu) → tự do → hộp thư góp ý → đồ dơ bị bắt 1 lần → vùng cấm nói + lọc từ tục → hết 6 giờ → tổng kết → 6A1→6A2 → giặt đồ / bộ dự phòng → xong A4 lên 7A1 → đóng game quá 6 giờ → vào lại giữa buổi → migrate save v1→v3 → service worker có mods → không lỗi console |

## Trên GitHub (CI)

`.github/workflows/test.yml` chạy mỗi push / Pull Request trên ubuntu-latest: fuzz (500 lần), unit, công cụ câu hỏi,
kiểm mod, test RLS Supabase, và E2E 3 cỡ bằng **Chrome** của runner:

```
EDGE_PATH=/usr/bin/google-chrome E2E_URL=http://localhost:8081/?debug node tests/e2e.mjs tests/out/390x844 390 844
```

`e2e.mjs` nhận mọi trình duyệt Chromium qua `EDGE_PATH` (Edge, Chrome). Trên Linux tự thêm `--no-sandbox
--disable-dev-shm-usage` và tắt trình duyệt bằng `kill` thay `taskkill`. Ảnh chụp của CI nằm ở mục Artifacts
(`e2e-screenshots`). Chi tiết các bước: `tools/README.md`, mục "CI trên GitHub".

## Lưu ý

- E2E dùng một hồ sơ Edge mới trong thư mục tạm mỗi lần chạy, nên localStorage luôn trống lúc bắt đầu.
- Phần ngẫu nhiên (bị bắt khi chọc bạn, sao đỏ bắt đồ dơ) được cố định bằng cách tạm thay `Math.random` và dời giám
  thị ra xa, nên số kiểm tra không đổi giữa các lần chạy.
- Trình duyệt headless không có font emoji (🥥 hiện ô vuông trong ảnh chụp) — không phải lỗi.
- Đổi lối chơi (giá đồ, số tiết, giới hạn coco…) thì sửa test tương ứng trong cùng commit.
