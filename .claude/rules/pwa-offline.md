---
paths:
  - "sw.js"
  - "manifest.webmanifest"
  - "index.html"
  - "_headers"
  - "js/install.js"
  - "icon.svg"
  - "icons/**"
---

# PWA, offline và cài lên màn hình chính

- **`sw.js`: TĂNG `VERSION` mỗi lần sửa BẤT KỲ file nào** của game, và **thêm mọi file mới vào `FILES`**. Nếu không,
  app đã cài trên điện thoại cứ chạy bản cũ trong cache (cache-first). Hiện tại: `tho-v5`.
- Pack mod mới: thêm vào `mods/index.json` **và** `FILES` trong `sw.js`, rồi tăng `VERSION`.
- `_headers` (Cloudflare Pages / Netlify; GitHub Pages bỏ qua): `sw.js` và `mods/*` là `no-cache`; nosniff,
  Referrer-Policy, Permissions-Policy, X-Frame-Options. Chưa có CSP.
- `manifest.webmanifest`: `display: fullscreen`, `orientation: any`, `start_url`/`scope` = `./` (đường dẫn tương đối
  để chạy dưới thư mục con `/TruongHocOnline/`). Giữ mọi đường dẫn tương đối.
- Cài app cần **HTTPS** (GitHub Pages / Cloudflare Pages); `chay.bat` chỉ để thử trên PC.
- **iPhone:** app đã cài **không dùng chung localStorage** với Safari → bảng cài hiện ngay lần đầu, trước khi tạo
  nhân vật, kèm cảnh báo "cài trước rồi mới chơi".
- **Android/Chrome:** `beforeinstallprompt.prompt()` **chỉ được gọi trong thao tác chạm** của người dùng. Lần tự hiện
  (setTimeout) luôn mở bảng hướng dẫn; nút "📲 Cài ngay" bên trong mới gọi `prompt()` (lỗi đã sửa 2026-11-03).
- Icon PNG (192, 512, maskable 512, apple-touch 180) render từ `icon.svg` bằng Edge headless.
- Trên cảm ứng: pixelRatio ≤ 1.5, shadow map 1024; camera lùi xa khi màn dọc; input font ≥16px (iOS không zoom).
