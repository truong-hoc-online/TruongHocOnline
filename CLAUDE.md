# CLAUDE.md — Trường Học Online

**Luôn trả lời bằng tiếng Việt.** Code, tên biến, comment dùng tiếng Anh; chuỗi hiển thị cho người dùng dùng
tiếng Việt. Thụt lề 2 dấu cách.

Game 3D trình duyệt "trường học online", **ưu tiên điện thoại** (PWA cài lên màn hình chính). Cảm hứng từ thể loại
*Niệm Phật Online* / *Nhà Tù Online* (nhân vật chibi, tên trên đầu, chat). **Chỉ lấy phong cách, không sao chép
game nào.** Tách biệt với `E:\KhuVuonTamAn` (nhật ký), `E:\DawnwalkerModding`, `E:\GitHub\nhip-gym` — đừng ghi chéo.

Ý tưởng gốc của người dùng: server = tên trường; học đủ 12 môn THCS thì lên lớp; mô hình 3D; lớp học và thư viện
không được nói chuyện (học sinh cá biệt thì được); tag (học sinh giỏi, cá biệt, lớp trưởng, bị bắt nạt, cô giáo…)
có tính năng và khu vực riêng; một ngày nhiều giai đoạn (chuẩn bị đi học → tại trường → tan trường).

## Bản đồ

```
E:\TruongHocOnline\        git riêng, nhánh main, CHƯA có remote (người dùng tự publish bằng GitHub Desktop)
  index.html               HUD, màn tạo nhân vật, modal, bảng cài (#install), nút 💬 (#btnChat)
  style.css                token màu :root + dark mode; khối `body.touch` = bố cục cảm ứng; bottom sheet cài app
  js\game.js               vòng lặp, input (phím, cần điều khiển, chạm-để-đi, chụm 2 ngón), camera, va chạm +
                           RULES (cửa khoá theo tag/giai đoạn), 4 giai đoạn/ngày, xét tag (evaluateTags), lên lớp
                           (checkPromotion), chat + vùng cấm nói + lọc từ tục, sự kiện bắt nạt, lưu localStorage
                           (key `truong-hoc-online-v1`). ?debug → window.__g (tp, skip, interact, state)
  js\world.js              dựng trường (mét, +z = phía cổng) + nhà ở x=200; trả colliders/zones/hotspots/seats/spots
  js\npc.js                bạn học, cô giáo, sao đỏ, giám thị, cô thư viện, cô tư vấn, mẹ, 2 bạn bắt nạt;
                           đi theo waypoint (ghế → cửa lớp → sân), không pathfinding
  js\chars.js              nhân vật chibi từ khối cơ bản (khăn quàng đỏ bật/tắt)
  js\subjects.js           12 môn, POINTS_TO_PASS=5, ngân hàng câu (đáp án ĐÚNG đặt ĐẦU, xáo khi hiện, `g` = lớp
                           tối thiểu); Toán + Anh sinh tự động theo lớp   ← CẦN giáo viên duyệt
  js\ui.js                 ask()/runQuiz()/chat/toast/nhãn trên đầu/âm thanh WebAudio (unlockAudio cho iOS)
  js\install.js            hướng dẫn "Thêm vào MH chính" (iPhone Safari / iPhone Chrome / Android; nút cài 1 chạm
                           nếu có beforeinstallprompt); tự hiện lần đầu trên điện thoại; đăng ký sw.js
  js\vendor\three.module.min.js   Three.js r160 (MIT, kèm THREE-LICENSE.txt)
  sw.js                    cache offline — TĂNG `VERSION` mỗi lần sửa BẤT KỲ file nào (+ thêm file mới vào FILES).
                           Hiện tại: `tho-v3`
  manifest.webmanifest     display fullscreen, orientation any
  icon.svg, icons\*.png    PNG (192, 512, maskable 512, apple-touch 180) render từ icon.svg bằng Edge headless
  chay.bat                 python http.server cổng 8081 + mở trình duyệt (chỉ để thử trên PC)
  README.md                mô tả lối chơi, tag, cách chơi trên điện thoại, việc trước khi phát hành
```

Git: `C:\Users\adminpc01\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`,
`core.autocrlf false`. Mỗi lần chỉnh xong → commit. Người dùng tự push bằng GitHub Desktop.

Máy có: Python 3.14 (`C:\Python314`), Node 24, Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).

## Lối chơi (tóm tắt để nhớ nhanh)

- 4 giai đoạn: **morning** (ở nhà 6:00, đồng hồ chạy ~1 phút/1,1 s, ra cửa sau 6:45 là trễ; tự đuổi đi lúc 7:20)
  → **school** (preBell → 4 tiết × 3 câu, ra chơi 75 s sau tiết 2; vào lớp muộn > 25 s trừ 2; không ngồi sau 60 s =
  trốn tiết −6) → **after** (về nhà ở cổng, hoặc lêu lổng: −2 hạnh kiểm, −1 lượt tối; 13:00 mẹ gọi về)
  → **evening** (4 lượt việc; giặt đồ/soạn cặp quyết định sáng hôm sau; ngủ ở giường).
- Đồ chuẩn bị tối (`state.prepared`) bị dùng hết khi ra khỏi nhà → phải chuẩn bị lại mỗi tối.
- Sao đỏ ở cổng: trễ −5, không đồng phục −5, quên khăn −3, quên sách −2, áo bẩn −1; ngày ngoan +3.
- Tag: `gioi` (≥15 câu, đúng ≥80%, HK ≥80) · `lop-truong` (ngày ≥3, HK ≥85, đúng ≥60%) · `ca-biet` (HK <60 / trễ 3 /
  lêu lổng 4; gỡ khi HK ≥75 và reset bộ đếm) · `bi-bat-nat` (sự kiện ra chơi, từ ngày 2, 35%; gỡ sau 2 lần kể cô Thu) ·
  `co-giao` (chưa lấy được). Lên lớp: đủ 12 môn × 5 điểm và HK ≥50. Lớp 9 xong → tốt nghiệp.

## Kiểm thử

- Fuzz câu hỏi (Node): mọi môn × lớp 6–9 × 2000 lần → đủ 4 đáp án khác nhau, có đáp án đúng. Cần `package.json`
  `{"type":"module"}` tạm thời để import `js/subjects.js` (xoá sau khi chạy).
- `node --check`: copy file sang đuôi `.mjs` rồi check.
- E2E: Edge headless `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` + CDP qua `WebSocket` của
  Node, mở `http://localhost:8081/?debug`, đi hết 1 ngày → ngày 2, kiểm vùng cấm nói, cửa khoá, không lỗi console.
  Ba cỡ: 1280×720, 390×844, và **giả lập iPhone** (`Emulation.setTouchEmulationEnabled` + UA Safari iOS) để kiểm
  bảng cài, `body.touch`, chạm-để-đi (`Input.dispatchTouchEvent`), service worker. Script ở scratchpad phiên trước
  (`e2e.mjs <outDir> [w] [h] [iphone]`) — viết lại nếu mất.
  Lưu ý: gọi `void __g.interact()` (không await, nếu không sẽ treo chờ modal). Nhớ tắt python server sau khi test.

## Trạng thái

**Cập nhật 2026-11-02**

| Phần | Trạng thái |
|---|---|
| MVP một người chơi + NPC: 4 giai đoạn, 12 môn, lớp 6→9, 5 tag + phòng riêng, cấm nói chuyện, bắt nạt (hướng hỗ trợ), lưu tiến độ | ✅ commit `dc056c6`. E2E 1280×720 và 390×844: hết 1 ngày → ngày 2, không lỗi console |
| PWA (manifest, icon, SW offline) + bảng hướng dẫn cài iPhone/Android + bố cục cảm ứng (cần điều khiển, chạm-để-đi, chụm zoom, nút chat, giảm đồ hoạ) | ✅ commit `092da41`. E2E giả lập iPhone: bảng cài tự hiện, chạm-để-đi chạy, SW cache `tho-v3`, không lỗi |
| Người dùng tự chơi thử (`chay.bat`) | ⚠️ Chưa báo kết quả |
| Đưa lên GitHub Pages (HTTPS) | ⏳ Đã hướng dẫn, người dùng chưa làm |
| Chạy trên điện thoại thật (iPhone Safari, Android Chrome), cài lên MH chính, thử offline | ❌ Chưa — cần HTTPS trước |
| Giáo viên duyệt câu hỏi `js/subjects.js` | ❌ Chưa |
| Nội dung "Giáo dục địa phương" theo tỉnh | ❌ Đang là văn hoá chung — cần hỏi người dùng tỉnh nào |
| Cân bằng độ khó / tốc độ đồng hồ | ❓ Chưa có phản hồi người chơi thật (sáng ở nhà khá gấp: ~30 s đi lại nếu làm đủ việc) |
| Multiplayer thật (server = tên trường, WebSocket, chat thật) | ❌ Để sau (người dùng chọn NPC trước) |
| Vai cô giáo chơi được, Phòng giáo viên có tính năng | ❌ Chờ multiplayer |

### Việc tiếp theo (theo thứ tự)

1. **[Người dùng]** Chơi thử bằng `chay.bat` (PC) và báo chỗ muốn chỉnh (tốc độ đồng hồ, độ khó, khu vực/tag mới).
2. **[Người dùng]** GitHub Desktop: Add local repository `E:\TruongHocOnline` → Publish (bỏ tick private) →
   github.com Settings → Pages → Deploy from branch `main` / root → `https://<user>.github.io/TruongHocOnline/`.
3. **[Người dùng]** Mở link trên iPhone (Safari) + Android (Chrome): cài theo bảng hướng dẫn, chơi từ biểu tượng,
   thử tắt mạng. Báo lại: giật/lag? nóng máy? nút có vướng tay? chữ có nhỏ? notch/tai thỏ có che HUD?
4. Sửa theo phản hồi điện thoại thật (nhớ tăng `VERSION` trong `sw.js` mỗi lần sửa, commit).
5. Hỏi người dùng tỉnh để thay câu hỏi "Giáo dục địa phương"; tìm giáo viên duyệt câu hỏi.
6. Tính năng có thể làm tiếp (người dùng chọn): thêm câu hỏi mỗi môn; tầng 2 / dãy lớp khác; sự kiện (chào cờ thứ
   Hai, kiểm tra 15 phút, thi học kỳ); trang phục/vật phẩm mua bằng tiền; âm thanh nền; nhiều trường (server) có
   bảng xếp hạng.
7. Xa hơn — multiplayer: server Node WebSocket (mỗi trường một phòng), tài khoản, **lọc chat + nút báo cáo +
   chặn**, chính sách cho người dùng dưới 16 tuổi, chỗ host (có thể tốn phí). Khi đó mới mở vai cô giáo.

### Quyết định quan trọng và lý do

| Quyết định | Lý do |
|---|---|
| Dự án ở thư mục + git riêng `E:\TruongHocOnline` | Người dùng chọn; tách khỏi Khu Vườn Tâm An dù được yêu cầu từ workspace đó |
| NPC trước, multiplayer sau | Người dùng chọn; nhanh, không tốn server, chưa cần kiểm duyệt chat cho trẻ em |
| Câu hỏi trắc nghiệm thật, lớp 6–9 (THCS, GDPT 2018) | Người dùng chọn; khớp đúng danh sách 12 môn người dùng đưa |
| Toán + Anh sinh câu hỏi tự động; môn khác dùng ngân hàng soạn sẵn, đáp án đúng đặt đầu | Sinh tự động không bao giờ sai đáp án và không lặp; đặt đúng-đầu giảm lỗi soạn; fuzz test bắt đáp án trùng |
| Một ngày 4 giai đoạn (thêm "Buổi tối ở nhà") | Người dùng nói "4 giai đoạn" nhưng liệt kê 3; buổi tối là nơi "học bài, nghỉ ngơi, chuẩn bị quần áo" và nối sang sáng hôm sau |
| Tag "bị bắt nạt" = quyền được **bảo vệ** (Báo cô, giám thị đi theo, cô tư vấn, số 111), không biến bắt nạt thành trò chơi; Phòng tư vấn mở cho **mọi** người | Người chơi có thể là trẻ em; không khoá việc tìm giúp đỡ sau một tag |
| Cá biệt "dám" nói trong lớp/thư viện nhưng có thể bị nhắc; gỡ được khi hạnh kiểm ≥75 | Đúng ý người dùng (unlock cho cá biệt) mà vẫn có đường quay lại |
| Không đếm chuỗi ngày; hạnh kiểm hồi +3 mỗi ngày ngoan | Tránh để một lỗi nhỏ thành vòng luẩn quẩn khó thoát |
| Ảnh "Nhà Tù Online" chỉ tham khảo phong cách; tự dựng toàn bộ hình, tên NPC, bố cục | Không sao chép game có sẵn |
| Three.js r160 để sẵn trong repo, không CDN, không build | Chạy offline (PWA), dễ host tĩnh |
| **Ưu tiên điện thoại**: PWA + bố cục `body.touch` (cần điều khiển trái, nút phải, chạm-để-đi, chụm zoom) | Người dùng: "chủ yếu trên mobile" |
| Bảng cài hiện **ngay lần đầu**, trước khi tạo nhân vật, kèm cảnh báo | iPhone: app đã cài không dùng chung localStorage với Safari → chơi trước rồi cài là mất tiến độ |
| Trên cảm ứng: pixelRatio ≤ 1.5, shadow map 1024; camera lùi xa khi màn dọc | Điện thoại rẻ chạy mượt, đỡ nóng; màn dọc nhìn ngang hẹp |
| `display: fullscreen`, `orientation: any` | Game cần toàn màn hình; chơi được cả dọc lẫn ngang |
| Host GitHub Pages (repo public được) | Miễn phí, có HTTPS (bắt buộc cho SW + cài app); repo chỉ có mã nguồn, không có dữ liệu người chơi |
| Tiến độ lưu localStorage (không mã hoá) | Dữ liệu game, không nhạy cảm; chưa có server |

## Nhật ký phiên

Mới nhất ở trên.

- **2026-11-02 · máy bàn** (phiên mở từ workspace `E:\KhuVuonTamAn`) — Người dùng muốn "trường học online" dựa trên
  đi chùa online, kèm ảnh *Nhà Tù Online* làm mẫu phong cách. Hỏi 4 điểm → chọn: thư mục riêng, NPC trước, trắc
  nghiệm thật, lớp 6–9. Làm MVP (Three.js r160 vendor; trường 3D, nhà riêng, ~35 NPC, 4 giai đoạn, 12 môn, 5 tag,
  bắt nạt hướng hỗ trợ), fuzz câu hỏi (sửa lỗi đáp án trùng ở phân số/luỹ thừa), E2E Edge headless, commit
  `dc056c6`. Người dùng gửi ảnh bảng "Cài trên iPhone" + "chủ yếu trên mobile" → làm PWA (manifest, icon PNG, SW
  offline), bảng cài iPhone/Android, bố cục cảm ứng, chạm-để-đi, chụm zoom, giảm đồ hoạ; E2E giả lập iPhone; commit
  `092da41`. Còn treo: người dùng chơi thử, publish GitHub Pages, thử điện thoại thật, duyệt câu hỏi, chọn tỉnh.
