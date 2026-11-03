---
paths:
  - "mods/**"
  - "js/items.js"
  - "js/economy.js"
  - "js/feedback.js"
  - "js/config.js"
  - "js/game.js"
  - "js/save.js"
  - "js/shop.js"
  - "js/prank.js"
  - "MODDING.md"
---

# Mod, đồ dùng, ví coco và góp ý

## Mod (dữ liệu, không code)

- Pack trong `mods/` chỉ là JSON; game chỉ đọc file có tên trong `mods/index.json` (tên `[a-z0-9-]+.json`).
- `validatePack()` (`js/items.js`) kiểm kiểu, kẹp số, bỏ trường lạ, bỏ món lỗi (không làm hỏng cả pack); id trong game
  = `<pack>:<id>`. Loại: `food` (where home|canteen), `uniform` (count), `accessory` (kind cap|bow|glasses|headband,
  color), `toy` (uses, fun, catch, verb, fx spray|blob|confetti, lines).
- Thêm trường/loại mới: sửa cả `validatePack`, `MODDING.md` và unit test.
- **Mọi chữ từ mod chèn vào HTML phải qua `esc()`** (cả `icon`). Nhãn nút `ask()`, toast, `say()` dùng textContent nên
  an toàn.
- Pack mới cần thêm vào `FILES` của `sw.js` + tăng `VERSION`.

## Ví coco (`js/economy.js`)

- **Mọi thay đổi coco đi qua `eco.earn / spend / lose / buy`**, không sửa `state.coco` trực tiếp (trừ debug). Mỗi lần
  đổi ghi một dòng vào `state.ledger` (giữ ≤100). Mua thất bại không ghi.
- `earn` giới hạn `EARN_CAP_PER_DAY` = 40 qua `today.earned`. Mức: `EARN.correct` 1, `subjectDone` 5, `cleanDay` 5.
- Giữ nguyên chữ ký các hàm. `eco.setSink(cloud.queueCoco)`: mỗi thay đổi thành một op (earn/spend/lose, `spend`
  có tham số thứ 4 `itemId` để server kiểm giá) trong hàng chờ `tho-coco-ops`; `cloud.syncCoco` gửi `coco_apply`
  (lúc vào game, mỗi 60 s, khi ẩn trang) rồi lấy số dư server + op chưa gửi. Thêm đồ vào mods/ → chạy
  `node supabase/gen-seed.mjs` và chạy seed trên project (món không có trong `shop_items` bị server từ chối).

## Góp ý (`js/feedback.js`)

- Báo cáo = { kind, text, version, created_at, school, grade, section, phase, zone, x, z, question? } → hàng chờ
  `tho-feedback-outbox` (≤50) → nếu `BACKEND` có URL + key thì POST `/rest/v1/feedback` (bảng insert-only qua RLS).
- `js/config.js` chỉ chứa URL + **anon key**; không bao giờ để `service_role`.

## Save

- Key `truong-hoc-online-v1`, định dạng `state.v = 3`. Đổi cấu trúc save → tăng `v` + thêm bước trong `migrate()` +
  E2E kiểm migrate từ save cũ.
