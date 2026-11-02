# 🧩 Làm mod cho Trường Học Online

Mod là một **file JSON chỉ chứa dữ liệu**: tên món, giá, màu, hiệu ứng… Mod **không chạy code**. Game kiểm
từng trường: sai kiểu thì bỏ món đó, số vượt giới hạn thì bị kẹp lại, trường lạ thì bị xoá. Vì vậy một mod lỗi
không làm hỏng game.

Hiện làm được 4 loại đồ: **đồ ăn**, **đồng phục dự phòng**, **phụ kiện**, **đồ chơi**.

## Bắt đầu nhanh

1. Mở [`mods/base.json`](mods/base.json) (đồ gốc của game) để xem mẫu.
2. Tạo file mới, ví dụ `mods/an-vat-mien-tay.json`:

```json
{
  "id": "an-vat-mien-tay",
  "name": "Ăn vặt miền Tây",
  "author": "Tên bạn",
  "version": 1,
  "items": [
    { "id": "banh-khot", "type": "food", "where": "home", "name": "Bánh khọt", "icon": "🥞", "price": 14, "energy": 26, "mood": 6 },
    { "id": "kem-dua", "type": "food", "where": "canteen", "name": "Kem dừa", "icon": "🍨", "price": 8, "energy": 6, "mood": 8 }
  ]
}
```

3. Thử trên máy: thêm tên file vào [`mods/index.json`](mods/index.json), chạy `chay.bat`, rồi mở game với `?debug`.
   Mở Console (F12) và gõ `__g.catalog.errors` để xem lỗi, nếu có.
4. Gửi mod: tạo Pull Request trên GitHub, chỉ thêm file JSON của bạn. Người quản lý game **duyệt nội dung** rồi mới
   thêm tên file vào `mods/index.json`.

## Quy định chung

| Trường | Bắt buộc | Quy tắc |
|---|---|---|
| `id` (pack) | ✅ | chữ thường không dấu, số, gạch ngang; 2–32 ký tự. Phải khác mọi pack khác |
| `name`, `author` | | tối đa 40 ký tự |
| `items[].id` | ✅ | như `id` pack, không trùng trong cùng pack. Trong game sẽ thành `<pack>:<id>` |
| `items[].type` | ✅ | `food` · `uniform` · `accessory` · `toy` |
| `items[].name` | ✅ | tối đa 30 ký tự |
| `icon` | | 1–2 emoji |
| `desc` | | tối đa 160 ký tự |
| `price` | | số nguyên 0–500 coco 🥥 |

Tối đa 200 món mỗi pack. Chữ luôn được hiển thị như chữ thường; viết thẻ HTML vào cũng không có tác dụng.

## Từng loại đồ

**`food` (đồ ăn)**: `where`: `home` (ăn sáng ở bàn ăn, mỗi ngày 1 lần) hoặc `canteen` (căng tin ở trường, mua lúc
ra chơi). `energy` từ −20 đến 60, `mood` từ −20 đến 30.

**`uniform` (đồng phục dự phòng)**: `count` 1–3, là số bộ sạch được thêm. Màu áo do lớp quyết định (A1 xanh dương,
A2 đỏ đô, A3 xanh lá, A4 cam), mod không đổi được.

**`accessory` (phụ kiện, chỉ để đẹp)**: `kind`: `cap` (mũ lưỡi trai) · `bow` (nơ) · `glasses` (kính) · `headband`
(băng đô). `color`: mã màu dạng `#rrggbb`. Hình dạng do game vẽ sẵn, mod chỉ chọn loại và màu.

**`toy` (đồ chơi chọc bạn)**:

| Trường | Quy tắc |
|---|---|
| `uses` | 1–10 lần dùng mỗi lần mua |
| `fun` | 0–20: tâm trạng người chơi tăng mỗi lần dùng |
| `catch` | 0.1–1: xác suất bị thầy cô / sao đỏ ở gần bắt gặp (bị tịch thu + trừ hạnh kiểm) |
| `verb` | tối đa 20 ký tự, hiện trên nút. Ví dụ "Xịt nước" |
| `fx` | `{ "kind": "spray" \| "blob" \| "confetti", "color": "#rrggbb" }` |
| `lines` | tối đa 5 câu (mỗi câu ≤ 60 ký tự) bạn bị chọc sẽ nói |

## Nội dung được duyệt

Game có học sinh nhỏ tuổi chơi. Mod **sẽ bị từ chối** nếu có:

- từ tục, xúc phạm, phân biệt vùng miền / giới tính / ngoại hình;
- đồ chơi gây đau hoặc nguy hiểm thật (dao, lửa, pháo nổ, thuốc…), hoặc chọc bạn kiểu làm nhục;
- rượu bia, thuốc lá, cờ bạc, nội dung người lớn;
- quảng cáo, đường link, thông tin cá nhân;
- giá hoặc chỉ số cố ý phá cân bằng (ví dụ đồ ăn 0 coco mà +60 năng lượng).

Đồ chơi phải là **trò nghịch vui, nhẹ nhàng**. Game có sẵn luật: chọc một bạn nhiều lần sẽ bị coi là bắt nạt.

## Ghi chú kỹ thuật

- Game chỉ đọc các pack có tên trong `mods/index.json` (tên file chỉ gồm chữ thường, số, gạch ngang, đuôi `.json`).
- App cài trên điện thoại chạy offline nhờ service worker. Khi thêm pack mới, người quản lý phải thêm file vào
  `FILES` trong `sw.js` và tăng `VERSION`.
- Bộ kiểm tra nằm ở [`js/items.js`](js/items.js) (`validatePack`).
