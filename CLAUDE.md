# CLAUDE.md — Trường Học Online

**Luôn trả lời bằng tiếng Việt.** Code, tên biến, comment dùng tiếng Anh; chuỗi hiển thị cho người dùng dùng
tiếng Việt. Thụt lề 2 dấu cách.

Game 3D trình duyệt "trường học online" (cảm hứng từ thể loại *Niệm Phật Online* / *Nhà Tù Online*: nhân vật chibi,
tên trên đầu, chat). **Chỉ lấy phong cách, không sao chép game nào.** Tách biệt với `E:\KhuVuonTamAn`
(nhật ký), `E:\DawnwalkerModding`, `E:\GitHub\nhip-gym`.

## Bản đồ

```
E:\TruongHocOnline\        git riêng, nhánh main, chưa có remote
  index.html, style.css    HUD, màn tạo nhân vật, modal
  js\game.js               vòng lặp, input, camera, va chạm + RULES (cửa khoá theo tag), 4 giai đoạn/ngày,
                           xét tag (evaluateTags), lên lớp (checkPromotion), chat + vùng cấm nói, sự kiện bắt nạt.
                           ?debug → window.__g (tp, skip, interact, state) để kiểm thử tự động
  js\world.js              dựng trường (toạ độ mét, +z = phía cổng) + nhà ở x=200; trả colliders/zones/hotspots/seats
  js\npc.js                bạn học, cô giáo, sao đỏ, giám thị, mẹ; đi theo waypoint (ghế → cửa lớp → sân)
  js\chars.js              nhân vật chibi từ khối cơ bản
  js\subjects.js           12 môn, POINTS_TO_PASS=5, ngân hàng câu (đáp án ĐÚNG đặt ĐẦU, xáo khi hiện);
                           Toán + Anh sinh tự động theo lớp  ← CẦN giáo viên duyệt
  js\ui.js                 ask()/runQuiz()/chat/toast/nhãn/âm thanh WebAudio
  js\vendor\three.module.min.js   Three.js r160 (MIT)
  chay.bat                 python http.server cổng 8081
```

Git: `C:\Users\adminpc01\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`. Mỗi lần chỉnh
xong → commit. Người dùng tự push bằng GitHub Desktop.

## Kiểm thử

- Fuzz câu hỏi (Node): mọi môn × lớp 6–9 × 2000 lần → 4 đáp án khác nhau, có đáp án đúng.
- E2E: Edge headless `--use-angle=swiftshader` + CDP, `?debug`, đi hết 1 ngày → sang ngày 2, kiểm vùng cấm nói,
  cửa khoá, không lỗi console; chụp 1280×720 và 390×844. Script ở scratchpad phiên trước (viết lại nếu mất).
  Lưu ý: gọi `void __g.interact()` (không await, nếu không sẽ treo chờ modal).

## Trạng thái — 2026-11-02

| Phần | Trạng thái |
|---|---|
| MVP một người chơi + NPC: 4 giai đoạn, 12 môn, lớp 6→9, tag + phòng riêng, cấm nói chuyện, bắt nạt (hướng hỗ trợ) | ✅ E2E qua |
| Người dùng chơi thử | ⚠️ Chưa |
| Giáo viên duyệt câu hỏi; nội dung địa phương theo tỉnh | ❌ |
| Điện thoại thật | ❌ |
| Multiplayer thật (server = tên trường, WebSocket, lọc chat, báo cáo) | ❌ Để sau (người dùng chọn NPC trước) |
| Vai cô giáo chơi được | ❌ Chờ multiplayer |

## Quyết định

| Quyết định | Lý do |
|---|---|
| NPC trước, multiplayer sau | Người dùng chọn; nhanh, không tốn server, chưa cần lọc chat/kiểm duyệt trẻ em |
| Câu hỏi trắc nghiệm thật, lớp 6–9 | Người dùng chọn; khớp danh sách 12 môn THCS |
| Tag "bị bắt nạt" = quyền được **bảo vệ** (Báo cô, giám thị, tư vấn, số 111), không phải bắt nạt làm trò chơi | Người chơi có thể là trẻ em; Phòng tư vấn mở cho mọi người |
| Không đếm chuỗi ngày; hạnh kiểm hồi +3 mỗi ngày ngoan | Tránh để một lỗi nhỏ thành vòng luẩn quẩn khó thoát |
| Three.js để sẵn trong repo, không CDN, không build | Chạy offline, dễ host tĩnh |
