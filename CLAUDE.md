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
E:\TruongHocOnline\        git riêng, nhánh main, remote origin = github.com/truong-hoc-online/TruongHocOnline
                           (public; GitHub Pages bật 2026-11-03: https://truong-hoc-online.github.io/TruongHocOnline/
                           — mỗi lần push, Pages build lại mất ~1–2 phút)
  index.html               HUD, màn tạo nhân vật, modal, bảng cài (#install), nút 💬 (#btnChat)
  style.css                token màu :root + dark mode; khối `body.touch` = bố cục cảm ứng; bottom sheet cài app
  js\game.js               vòng lặp, input (phím, cần điều khiển, chạm-để-đi, chụm 2 ngón), camera, va chạm +
                           RULES (cửa khoá theo tag/giai đoạn), phiên 6 giờ thật (home → school → after), giặt đồ
                           15 phút thật, sao đỏ/giám thị bắt đồ dơ (patrolTick), chuyển lớp A1→A4 + lên lớp
                           (finishSession, checkPromotion), xét tag, chat + vùng cấm nói + lọc từ tục, bắt nạt,
                           lưu localStorage (key `truong-hoc-online-v1`, định dạng `state.v = 2`, migrate() từ v1).
                           ?debug → window.__g (tp, skip, interact, state, today, endSession, finishWash)
  js\world.js              dựng trường (mét, +z = phía cổng) + nhà ở x=200; 4 phòng học = lớp A1–A4 của khối
                           đang học (W.seats/classDoors/teacher theo số lớp 1–4, W.setGrade đổi biển + tên zone)
  js\npc.js                bạn học (mặc áo màu lớp; n.grade = số phòng 1–4), cô giáo, sao đỏ, giám thị, cô thư
                           viện, cô tư vấn, mẹ, 2 bạn lớp 9 bắt nạt (không có ghế, chỉ hiện ở sân);
                           đi theo waypoint (ghế → cửa lớp → sân), không pathfinding
  js\chars.js              nhân vật chibi từ khối cơ bản (khăn quàng đỏ bật/tắt, màu áo `shirt`)
  js\subjects.js           12 môn, POINTS_TO_PASS=5, CLASS_GROUPS (4 lớp × 3 môn + màu áo), ngân hàng câu (đáp án
                           ĐÚNG đặt ĐẦU, xáo khi hiện, `g` = lớp tối thiểu); Toán + Anh sinh tự động   ← CẦN giáo viên duyệt
  js\ui.js                 ask()/runQuiz()/chat/toast/nhãn trên đầu/âm thanh WebAudio (unlockAudio cho iOS)
  js\install.js            hướng dẫn "Thêm vào MH chính" (iPhone Safari / iPhone Chrome / Android; nút cài 1 chạm
                           nếu có beforeinstallprompt); tự hiện lần đầu trên điện thoại; đăng ký sw.js
  js\vendor\three.module.min.js   Three.js r160 (MIT, kèm THREE-LICENSE.txt)
  sw.js                    cache offline — TĂNG `VERSION` mỗi lần sửa BẤT KỲ file nào (+ thêm file mới vào FILES).
                           Hiện tại: `tho-v4`
  manifest.webmanifest     display fullscreen, orientation any
  icon.svg, icons\*.png    PNG (192, 512, maskable 512, apple-touch 180) render từ icon.svg bằng Edge headless
  chay.bat                 python http.server cổng 8081 + mở trình duyệt (chỉ để thử trên PC)
  README.md                mô tả lối chơi, tag, cách chơi trên điện thoại, việc trước khi phát hành
```

Git: `C:\Users\adminpc01\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`,
`core.autocrlf false`. Mỗi lần chỉnh xong → commit. Người dùng tự push bằng GitHub Desktop.

Máy có: Python 3.14 (`C:\Python314`), Node 24, Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).

## Lối chơi (tóm tắt để nhớ nhanh)

- **Giờ thật** (từ 2026-11-03, save v2). 1 "ngày" = 1 lần ở nhà + 1 phiên trường 6 giờ thật:
  **home** (không giới hạn giờ; đồng hồ hiện 6:xx) → ra cửa: `sessionEnd = now + 6h` → **school** (preBell 30 s →
  6 tiết × 3 câu, ra chơi 75 s sau tiết 2 và 4; vào lớp muộn > 25 s trừ 2 + `lateCount`; không ngồi sau 60 s = trốn
  tiết −6; xong 6 tiết → `sub = 'free'` tới hết 6 giờ) → hết 6 giờ: **after** (cổng → về nhà; lêu lổng −2/lần, 2 lần
  hoặc quá 3 phút thật thì mẹ gọi về) → `finishSession()` (tổng kết, ngày +1) → home.
- Tiết học chạy theo thời gian chơi (`now`), không theo giờ thật → thoát game không bị tính trốn tiết. Vào lại giữa
  buổi → về preBell của tiết kế (`today.done`). Đóng game quá 6 giờ → lúc mở lại tự tổng kết và về nhà.
- Đồng phục `state.uniform`: clean → mặc cả buổi thành dirty → giặt (`washing`, `until` = +15 phút thật, chạy cả khi
  tắt game) → clean. Đồ dơ chỉ bị trừ 3 khi sao đỏ (50% lúc qua cổng) hoặc sao đỏ/giám thị lại gần (40%/lần gặp)
  bắt được, tối đa 1 lần/buổi. Cổng: không đồng phục −5, quên khăn −3, quên sách −2; buổi ngoan +3.
- Lớp: `state.section` 1–4 = A1–A4 (`CLASS_GROUPS`). Xong 3 môn của lớp → về nhà chuyển lớp kế, mẹ mua đồng phục màu
  mới (sạch). Xong A4 + HK ≥50 → lên khối, section = 1. Lớp 9 xong → tốt nghiệp.
- Tag: `gioi` (≥15 câu, đúng ≥80%, HK ≥80) · `lop-truong` (ngày ≥3, HK ≥85, đúng ≥60%) · `ca-biet` (HK <60 / vào lớp
  muộn 3 / lêu lổng 4; gỡ khi HK ≥75 và reset bộ đếm) · `bi-bat-nat` (sự kiện ra chơi, từ ngày 2, 35%; gỡ sau 2 lần
  kể cô Thu) · `co-giao` (chưa lấy được).
- Tiền vẫn là "k" (`stats.money`); Giai đoạn 2 đổi sang coco 🥥.

## Kiểm thử

- Fuzz câu hỏi (Node): mọi môn × lớp 6–9 × 2000 lần → đủ 4 đáp án khác nhau, có đáp án đúng. Cần `package.json`
  `{"type":"module"}` tạm thời để import `js/subjects.js` (xoá sau khi chạy).
- `node --check`: copy file sang đuôi `.mjs` rồi check.
- E2E: Edge headless `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` + CDP qua `WebSocket` của
  Node, mở `http://localhost:8081/?debug`. Ba cỡ: 1280×720, 390×844, và **giả lập iPhone**
  (`Emulation.setTouchEmulationEnabled` + UA Safari iOS). Script `e2e.mjs <outDir> [w] [h] [iphone]` (viết lại
  2026-11-03, ~40 kiểm tra): chuẩn bị ở nhà → 6 tiết → tự do → giám thị bắt đồ dơ (1 lần) → cấm nói → `endSession()`
  → tan trường → tổng kết → giặt đồ / `finishWash()` → chuyển 6A1→6A2 → xong A4 lên 7A1 → đóng game quá 6 giờ →
  vào lại giữa buổi → migrate save v1 → SW `tho-v4` → không lỗi console. Nằm ở scratchpad phiên — viết lại nếu mất.
  Lưu ý: gọi `void __g.interact()` (không await, nếu không sẽ treo chờ modal). Muốn cài save giả rồi reload thì chặn
  `Storage.prototype.setItem` trước (game tự lưu khi trang bị ẩn → ghi đè). Chờ reload 3 s đôi khi thiếu (flaky).
  Nhớ tắt python server sau khi test.

## Trạng thái

**Cập nhật 2026-11-03**

| Phần | Trạng thái |
|---|---|
| MVP một người chơi + NPC: 12 môn, lớp 6→9, 5 tag + phòng riêng, cấm nói chuyện, bắt nạt (hướng hỗ trợ), lưu tiến độ | ✅ commit `dc056c6` |
| PWA (manifest, icon, SW offline) + bảng hướng dẫn cài iPhone/Android + bố cục cảm ứng | ✅ commit `092da41` |
| Đưa lên GitHub Pages (HTTPS) — https://truong-hoc-online.github.io/TruongHocOnline/ | ✅ 2026-11-03, repo public |
| Chạy trên điện thoại thật | ✅ Người dùng báo "đã chơi được trên điện thoại" (2026-11-03); chưa có chi tiết giật/lag, cài MH chính, offline |
| **Lối chơi mới — Giai đoạn 1**: phiên 6 giờ thật, bỏ buổi tối, 6 tiết/buổi + tự do; lớp A1–A4 × 3 môn, màu đồng phục theo lớp, chuyển lớp → lên khối; giặt đồ 15 phút thật; đồ dơ chỉ trừ khi sao đỏ/giám thị bắt; migrate save v1 → v2 | ✅ 2026-11-03, SW `tho-v4`. E2E 3 cỡ (1280×720, 390×844, giả lập iPhone): ~40 kiểm tra đạt, không lỗi console |
| Sửa lỗi bảng cài Android: tự hiện gọi `prompt()` không có thao tác chạm → bị chặn, bảng không hiện | ✅ 2026-11-03: tự hiện luôn mở bảng; nút "📲 Cài ngay" bên trong gọi prompt khi chạm |
| Giai đoạn 2: hệ thống đồ theo dữ liệu (`mods/*.json`) — đồ ăn sáng (hủ tiếu, cơm sườn…), đồng phục, đồ chơi; tiền **coco 🥥** thay "k"; cửa hàng | ❌ Chưa làm |
| Giai đoạn 3: đồ chơi chọc phá (súng nước, bã kẹo cao su, ly trà sữa phun trân châu) | ❌ Chưa làm — cần Giai đoạn 2 |
| Giai đoạn 4: hộp thư góp ý 📮 → Google Form điền sẵn | ❌ Chờ người dùng gửi link "điền sẵn" của Google Form (5 ô a–e) |
| Giai đoạn 5: `MODDING.md` + E2E + README/CLAUDE.md | ❌ Chưa làm |
| Giáo viên duyệt câu hỏi `js/subjects.js` | ❌ Chưa |
| Nội dung "Giáo dục địa phương" theo tỉnh | ❌ Đang là văn hoá chung — cần hỏi người dùng tỉnh nào |
| Cân bằng nhịp chơi mới (6 tiết/buổi, tối đa 1 khối / ~4 buổi = ~24 giờ thật nếu đúng hết) | ❓ Chưa có phản hồi người chơi |
| Multiplayer thật (server = tên trường, WebSocket, chat thật) | ❌ Để sau (người dùng chọn NPC trước) |
| Vai cô giáo chơi được, Phòng giáo viên có tính năng | ❌ Chờ multiplayer |

### Việc tiếp theo (theo thứ tự)

1. **[Người dùng]** Push bằng GitHub Desktop → đợi Pages build 1–2 phút → chơi thử lối chơi mới trên điện thoại. Báo:
   nhịp 6 giờ / giặt 15 phút có ổn không, 6 tiết/buổi nhiều hay ít, màu áo các lớp có dễ phân biệt không.
2. **Giai đoạn 2 — đồ dùng theo dữ liệu + coco.** Thiết kế đã thống nhất: thư mục `mods/` chứa file JSON khai báo
   **quần áo, đồ ăn, đồ chơi** (tên, giá coco, màu, hiệu ứng) — chỉ dữ liệu, không chạy code. Đồ gốc của game cũng
   viết theo dạng này làm mẫu. Người mod gửi qua GitHub (PR), người dùng duyệt mới vào game. Coco kiếm từ trả lời
   đúng + buổi ngoan; tiêu cho đồ ăn sáng (mặc định cơm trắng miễn phí), đồng phục mới, đồ chơi. Nhớ migrate
   `stats.money` → coco. Hiện chuyển lớp thì "mẹ mua đồng phục mới" miễn phí — có thể đổi thành phải mua.
3. **Giai đoạn 3 — đồ chơi chọc phá:** mang từ nhà (chọn ở nhà), chỉ dùng với **bạn học NPC**, chỉ giờ ra chơi/tự do;
   không trong lớp, thư viện, hay với thầy cô. Bị giám thị/sao đỏ thấy thì trừ hạnh kiểm; chọc nhiều → `ca-biet`.
   Giữ tinh thần chống bắt nạt: trò nghịch nhẹ, có hậu quả, không thành công cụ bắt nạt (và không nhắm vào bạn
   đang có tag `bi-bat-nat` nếu sau này có người chơi thật).
4. **Giai đoạn 4 — hộp thư góp ý:** đặt ở trường + nút trong menu; chọn loại (câu hỏi sai / bị kẹt / lỗi khác), game
   tự điền môn, lớp, nội dung câu vừa gặp, toạ độ, phiên bản → mở Google Form điền sẵn. Cần ghi lại câu hỏi vừa
   hiện (Toán/Anh sinh tự động không có id → gửi nguyên văn câu). Cần link từ người dùng.
5. **Giai đoạn 5:** `MODDING.md`, E2E 3 cỡ, tăng `sw.js` VERSION (+ thêm file mới vào FILES), README, CLAUDE.md, commit.
6. Hỏi tỉnh cho "Giáo dục địa phương"; tìm giáo viên duyệt câu hỏi.
7. Tính năng khác (người dùng chọn): thêm câu hỏi; sự kiện (chào cờ thứ Hai, kiểm tra 15 phút, thi học kỳ); âm
   thanh nền; nhiều trường có bảng xếp hạng.
8. Xa hơn — multiplayer: server Node WebSocket (mỗi trường một phòng), tài khoản, **lọc chat + nút báo cáo +
   chặn**, chính sách cho người dùng dưới 16 tuổi, chỗ host (có thể tốn phí). Khi đó mới mở vai cô giáo.

### Quyết định quan trọng và lý do

| Quyết định | Lý do |
|---|---|
| Dự án ở thư mục + git riêng `E:\TruongHocOnline` | Người dùng chọn; tách khỏi Khu Vườn Tâm An dù được yêu cầu từ workspace đó |
| NPC trước, multiplayer sau | Người dùng chọn; nhanh, không tốn server, chưa cần kiểm duyệt chat cho trẻ em |
| Câu hỏi trắc nghiệm thật, lớp 6–9 (THCS, GDPT 2018) | Người dùng chọn; khớp đúng danh sách 12 môn người dùng đưa |
| Toán + Anh sinh câu hỏi tự động; môn khác dùng ngân hàng soạn sẵn, đáp án đúng đặt đầu | Sinh tự động không bao giờ sai đáp án và không lặp; đặt đúng-đầu giảm lỗi soạn; fuzz test bắt đáp án trùng |
| **Giờ thật: "cứ 6 tiếng mới về nhà" = 6 giờ ngoài đời**; bỏ "Buổi tối ở nhà"; nhà chỉ là chuẩn bị (2026-11-03) | Người dùng chọn (thay quyết định cũ "4 giai đoạn/ngày"). Nhịp kiểu game online: vào chơi một lúc, thoát, quay lại |
| Tiết học chạy theo thời gian chơi, không theo giờ thật; 6 tiết/buổi rồi tự do tới hết 6 giờ | Thoát game không bị phạt trốn tiết; không bắt ngồi chờ hàng giờ để có tiết; giới hạn điểm mỗi buổi để không xong cả khối trong 1 buổi |
| Giặt đồ = 15 phút **thật**, chạy cả khi tắt game | Người dùng chọn |
| Đồ dơ không trừ ngay ở cổng; chỉ trừ 3 khi sao đỏ/giám thị **bắt gặp**, tối đa 1 lần/buổi | Đúng ý người dùng ("nếu bị giám thị và sao đỏ bắt"); có may rủi, không phạt chồng |
| Mỗi khối 4 lớp × 3 môn, **học hết lớp này sang lớp kia** (A1→A4→khối trên); đồng phục đổi màu theo lớp | Người dùng chọn. GDPT 2018 không có Lý/Hoá riêng (gộp trong KHTN) nên A1 = Toán·KHTN·Tin; người dùng đồng ý cách chia |
| Mod cộng đồng = file JSON dữ liệu trong `mods/`, gửi qua GitHub, người dùng duyệt; không cho nhập mod chạy code | Người dùng chọn; an toàn cho trẻ em, không cần server |
| Góp ý qua Google Form điền sẵn (không cần tài khoản) | Người dùng chọn; học sinh nhỏ không có GitHub |
| Đồ chơi chọc phá chỉ với NPC, có hậu quả hạnh kiểm, không trong lớp/thư viện/với thầy cô | Game chống bắt nạt; trò nghịch phải nhẹ và có giới hạn |
| Tag "bị bắt nạt" = quyền được **bảo vệ** (Báo cô, giám thị đi theo, cô tư vấn, số 111), không biến bắt nạt thành trò chơi; Phòng tư vấn mở cho **mọi** người | Người chơi có thể là trẻ em; không khoá việc tìm giúp đỡ sau một tag |
| Cá biệt "dám" nói trong lớp/thư viện nhưng có thể bị nhắc; gỡ được khi hạnh kiểm ≥75 | Đúng ý người dùng (unlock cho cá biệt) mà vẫn có đường quay lại |
| Không đếm chuỗi ngày; hạnh kiểm hồi +3 mỗi buổi ngoan | Tránh để một lỗi nhỏ thành vòng luẩn quẩn khó thoát |
| Ảnh "Nhà Tù Online" chỉ tham khảo phong cách; tự dựng toàn bộ hình, tên NPC, bố cục | Không sao chép game có sẵn |
| Three.js r160 để sẵn trong repo, không CDN, không build | Chạy offline (PWA), dễ host tĩnh |
| **Ưu tiên điện thoại**: PWA + bố cục `body.touch` (cần điều khiển trái, nút phải, chạm-để-đi, chụm zoom) | Người dùng: "chủ yếu trên mobile" |
| Bảng cài hiện **ngay lần đầu**, trước khi tạo nhân vật, kèm cảnh báo; nút cài native chỉ gọi khi người dùng chạm | iPhone: app đã cài không dùng chung localStorage với Safari; `prompt()` ngoài thao tác chạm bị trình duyệt chặn |
| Trên cảm ứng: pixelRatio ≤ 1.5, shadow map 1024; camera lùi xa khi màn dọc; chỉ hiện nhãn lớp trên đầu học sinh **lớp khác** | Điện thoại rẻ chạy mượt, đỡ nóng; màn dọc nhìn ngang hẹp; nhãn dày đặc che màn hình |
| `display: fullscreen`, `orientation: any` | Game cần toàn màn hình; chơi được cả dọc lẫn ngang |
| Host GitHub Pages, repo public | Miễn phí, có HTTPS (bắt buộc cho SW + cài app); repo chỉ có mã nguồn. Pages cho repo private cần gói trả phí |
| Tiến độ lưu localStorage (không mã hoá), lưu thêm khi trang bị ẩn (`visibilitychange`) | Dữ liệu game, không nhạy cảm; điện thoại hay tắt app đột ngột |

## Nhật ký phiên

Mới nhất ở trên.

- **2026-11-03 · máy bàn** — Đọc CLAUDE.md, lên kế hoạch phiên. Phát hiện repo đã có remote/push nhưng private → hướng
  dẫn public + bật Pages; lần đầu 404 vì Pages đang build, sau 1–2 phút chạy. Người dùng chơi được trên điện thoại
  và yêu cầu 6 ý: nhịp 6 giờ + giặt 15 phút + ăn sáng bằng coco; chia lớp 3 môn (6A1 Toán…); đồng phục theo lớp;
  mod cộng đồng (quần áo, đồ ăn, đồ chơi); đồ chơi chọc phá; hộp thư góp ý. Hỏi 4 điểm → chọn: 6 giờ ngoài đời,
  giặt 15 phút thật, học hết lớp này sang lớp kia, Google Form + mod qua GitHub. Chia lớp theo GDPT 2018 (không có
  Lý/Hoá riêng) → người dùng "ok". Làm **Giai đoạn 1** (game.js viết lại vòng ngày, world/npc/subjects), sửa lỗi
  bảng cài Android (prompt không có thao tác chạm), viết lại e2e.mjs (~40 kiểm tra, 3 cỡ đạt), SW `tho-v4`. Còn
  treo: Giai đoạn 2–5, link Google Form, tỉnh, duyệt câu hỏi.
- **2026-11-02 · máy bàn** (phiên mở từ workspace `E:\KhuVuonTamAn`) — Người dùng muốn "trường học online" dựa trên
  đi chùa online, kèm ảnh *Nhà Tù Online* làm mẫu phong cách. Hỏi 4 điểm → chọn: thư mục riêng, NPC trước, trắc
  nghiệm thật, lớp 6–9. Làm MVP (Three.js r160 vendor; trường 3D, nhà riêng, ~35 NPC, 4 giai đoạn, 12 môn, 5 tag,
  bắt nạt hướng hỗ trợ), fuzz câu hỏi (sửa lỗi đáp án trùng ở phân số/luỹ thừa), E2E Edge headless, commit
  `dc056c6`. Người dùng gửi ảnh bảng "Cài trên iPhone" + "chủ yếu trên mobile" → làm PWA (manifest, icon PNG, SW
  offline), bảng cài iPhone/Android, bố cục cảm ứng, chạm-để-đi, chụm zoom, giảm đồ hoạ; E2E giả lập iPhone; commit
  `092da41`. Còn treo: người dùng chơi thử, publish GitHub Pages, thử điện thoại thật, duyệt câu hỏi, chọn tỉnh.
