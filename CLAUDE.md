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
                           lưu localStorage (key `truong-hoc-online-v1`, định dạng `state.v = 3`, migrate() v1→v2→v3),
                           coco + cửa hàng + bàn ăn/căng tin/tủ đồ/cặp (đồ từ mods/), chọc bạn (prank, spawnFx),
                           hộp thư góp ý. ?debug → window.__g (tp, skip, interact, state, today, endSession,
                           finishWash, catalog, prankTarget, giveCoco)
  js\items.js              đọc mods/index.json → validatePack(): kiểm kiểu, kẹp số, bỏ trường lạ; id = `<pack>:<id>`
  js\economy.js            ví coco: earn (giới hạn 40/ngày) / spend / lose / buy + sổ cái `state.ledger` (≤100 dòng).
                           Thiết kế để sau chuyển lên server (Supabase) mà giữ nguyên lời gọi
  js\feedback.js           hộp thư góp ý: chọn loại → ghi chữ → kèm lớp/vị trí/câu vừa gặp (`ui.lastQ`) → hàng chờ
                           localStorage `tho-feedback-outbox`; có Supabase thì POST /rest/v1/feedback rồi xả hàng chờ
  js\config.js             BACKEND { supabaseUrl, supabaseAnonKey } (để trống = offline), GAME_VERSION
  mods\index.json, base.json   danh sách pack + đồ gốc (18 món: 9 đồ ăn, 1 đồng phục, 4 phụ kiện, 4 đồ chơi)
  MODDING.md               hướng dẫn làm mod + quy định nội dung được duyệt
  _headers                 header cho Cloudflare Pages (sw.js + mods/ no-cache, nosniff, X-Frame-Options…)
  js\world.js              dựng trường (mét, +z = phía cổng) + nhà ở x=200; 4 phòng học = lớp A1–A4 của khối
                           đang học (W.seats/classDoors/teacher theo số lớp 1–4, W.setGrade đổi biển + tên zone)
  js\npc.js                bạn học (mặc áo màu lớp; n.grade = số phòng 1–4), cô giáo, sao đỏ, giám thị, cô thư
                           viện, cô tư vấn, mẹ, 2 bạn lớp 9 bắt nạt (không có ghế, chỉ hiện ở sân);
                           đi theo waypoint (ghế → cửa lớp → sân), không pathfinding
  js\chars.js              nhân vật chibi từ khối cơ bản (khăn quàng đỏ bật/tắt, màu áo `shirt`, phụ kiện `acc`
                           {kind: cap|bow|glasses|headband, color})
  js\subjects.js           12 môn, POINTS_TO_PASS=5, CLASS_GROUPS (4 lớp × 3 môn + màu áo), ngân hàng câu (đáp án
                           ĐÚNG đặt ĐẦU, xáo khi hiện, `g` = lớp tối thiểu); Toán + Anh sinh tự động   ← CẦN giáo viên duyệt
  js\ui.js                 ask()/runQuiz()/chat/toast/nhãn trên đầu/âm thanh WebAudio (unlockAudio cho iOS)
  js\install.js            hướng dẫn "Thêm vào MH chính" (iPhone Safari / iPhone Chrome / Android; nút cài 1 chạm
                           nếu có beforeinstallprompt); tự hiện lần đầu trên điện thoại; đăng ký sw.js
  js\vendor\three.module.min.js   Three.js r160 (MIT, kèm THREE-LICENSE.txt)
  sw.js                    cache offline — TĂNG `VERSION` mỗi lần sửa BẤT KỲ file nào (+ thêm file mới vào FILES).
                           Hiện tại: `tho-v5`
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
- Đồng phục `state.uniform = { clean, dirty, washing, until }` (số bộ, save v3). Mặc lấy 1 bộ khỏi đống sạch (hoặc
  dơ); hết buổi bộ đang mặc → dirty; giặt = mọi bộ dơ → washing 15 phút thật (chạy cả khi tắt game) → clean. Mua
  "đồng phục dự phòng" = thêm bộ sạch. Đồ dơ chỉ bị trừ 3 khi sao đỏ (50% lúc qua cổng) hoặc sao đỏ/giám thị lại gần
  (40%/lần gặp) bắt được, tối đa 1 lần/buổi. Cổng: không đồng phục −5, quên khăn −3, quên sách −2; buổi ngoan +3.
- Lớp: `state.section` 1–4 = A1–A4 (`CLASS_GROUPS`). Xong 3 môn của lớp → về nhà chuyển lớp kế; mẹ đổi **mọi** bộ
  (cả bộ mua thêm) sang màu mới, sạch (`newClassUniforms`). Xong A4 + HK ≥50 → lên khối. Lớp 9 xong → tốt nghiệp.
- **Coco 🥥** (`state.coco`, save v3; tiền "k" cũ chuyển 1:1): +1/câu đúng, +5 xong môn, +5 buổi ngoan, tối đa
  40/ngày. Tiêu: ăn sáng ở bàn ăn (cơm trắng miễn phí; hủ tiếu 15, cơm sườn 20…), căng tin, 🛒 cửa hàng ở bàn học
  (đồng phục dự phòng 60, phụ kiện 25–40, đồ chơi 10–25). Bị bắt nạt "đưa tiền" = mất ≤10 coco. Chưa bán bằng tiền thật.
- **Chọc bạn**: bỏ tối đa 2 loại đồ chơi vào cặp ở nhà (`today.packed`). Lúc preBell/ra chơi/tự do/tan trường, ngoài
  vùng yên lặng, đứng ≤1,8 m cạnh bạn cùng trường (không phải thầy cô/nhân viên/2 bạn lớp 9) → nút "🔫 Xịt nước …".
  Thầy cô/sao đỏ trong 9 m → xác suất `catch` của món: tịch thu + HK −3. Chọc cùng một bạn lần 2 → bạn mách cô,
  HK −2, nhắc "chọc mãi một người là bắt nạt". `prankCount` ≥6 → `ca-biet`.
- **Góp ý 📮**: nút trên HUD + hộp thư cạnh cổng trường.
- Tag: `gioi` (≥15 câu, đúng ≥80%, HK ≥80) · `lop-truong` (ngày ≥3, HK ≥85, đúng ≥60%) · `ca-biet` (HK <60 / vào lớp
  muộn 3 / lêu lổng 4 / chọc bạn 6; gỡ khi HK ≥75 và reset bộ đếm) · `bi-bat-nat` (sự kiện ra chơi, từ ngày 2, 35%;
  gỡ sau 2 lần kể cô Thu) · `co-giao` (chưa lấy được).

## Kiểm thử

- Fuzz câu hỏi (Node): mọi môn × lớp 6–9 × 2000 lần → đủ 4 đáp án khác nhau, có đáp án đúng. Cần `package.json`
  `{"type":"module"}` tạm thời để import `js/subjects.js` (xoá sau khi chạy).
- `node --check`: copy file sang đuôi `.mjs` rồi check.
- Unit (Node) `unit.mjs <repo>`: validatePack với base.json + pack "phá" (HTML, giá âm, trường lạ, trùng id, kind/fx
  lạ, không phải object) + ví coco (giới hạn ngày, thiếu tiền, số âm, mua, sổ cái). 24 kiểm tra. Ở scratchpad phiên.
- Mọi chữ từ mod chèn vào HTML phải qua `esc()` (nhãn nút / toast dùng textContent nên an toàn).
- E2E: Edge headless `--headless=new --use-angle=swiftshader --enable-unsafe-swiftshader` + CDP qua `WebSocket` của
  Node, mở `http://localhost:8081/?debug`. Ba cỡ: 1280×720, 390×844, và **giả lập iPhone**
  (`Emulation.setTouchEmulationEnabled` + UA Safari iOS). Script `e2e.mjs <outDir> [w] [h] [iphone]` (viết lại
  2026-11-03, 54 kiểm tra): mod tải đủ → cửa hàng (súng nước, mũ, đồng phục dự phòng) → đeo mũ → ăn hủ tiếu bằng coco
  → mang đồ chơi → 6 tiết (+ chọc bạn ở sân, chọc lần 2 bị mách, không chọc được trong lớp) → tự do → hộp thư góp ý
  (hàng chờ có câu hỏi + vị trí) → giám thị bắt đồ dơ (1 lần) → cấm nói → `endSession()` → tổng kết → mặc bộ dự
  phòng / giặt / `finishWash()` → chuyển 6A1→6A2 → xong A4 lên 7A1 → đóng game quá 6 giờ → vào lại giữa buổi →
  migrate save v1→v3 → SW `tho-v5` có mods → không lỗi console. Nằm ở scratchpad phiên — viết lại nếu mất.
  `drain()` bấm nút ĐẦU TIÊN của modal — đừng dùng để đóng tủ đồ (sẽ mặc đồ); bấm 'Thôi'.
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
| Giai đoạn 2: đồ theo dữ liệu (`mods/`, validatePack), coco 🥥 + sổ cái, bàn ăn (cơm trắng / hủ tiếu / cơm sườn…), căng tin, 🛒 cửa hàng, đồng phục dự phòng (uniform tính theo bộ), phụ kiện (mũ, nơ, kính, băng đô), save v3 | ✅ 2026-11-03, SW `tho-v5` |
| Giai đoạn 3: đồ chơi chọc bạn (súng nước, bã kẹo cao su, trà sữa phun trân châu, pháo giấy) + hiệu ứng hạt + bị bắt / bị mách | ✅ 2026-11-03 |
| Giai đoạn 4: hộp thư góp ý 📮 (nút HUD + hộp thư cạnh cổng), hàng chờ trên máy | ✅ Giao diện + hàng chờ. ⏳ Gửi thật cần Supabase (bảng `feedback`) — **thay cho Google Form** |
| Giai đoạn 5: `MODDING.md`, `_headers` (Cloudflare), unit test 24 + E2E 54 kiểm tra × 3 cỡ | ✅ 2026-11-03 |
| Supabase (lưu tiến độ, góp ý, xếp hạng, sổ cái coco trên server) | ⏳ Chờ người dùng tạo project riêng + gửi URL + anon key |
| Chuyển host sang Cloudflare Pages + tên miền riêng | ⏳ Chờ người dùng mua tên miền |
| Trang quản trị (Next.js theo mẫu durian-operadmin, xuất tĩnh, Cloudflare Pages + Access) | ❌ Chưa làm — cần Supabase |
| AI soạn câu hỏi → giáo viên duyệt (Cloudflare Workers + AI Gateway gọi Claude) | 💡 Đề xuất, chưa làm — cần khoá API |
| Giáo viên duyệt câu hỏi `js/subjects.js` | ❌ Chưa |
| Nội dung "Giáo dục địa phương" theo tỉnh | ❌ Đang là văn hoá chung — cần hỏi người dùng tỉnh nào |
| Cân bằng nhịp chơi mới (6 tiết/buổi, tối đa 1 khối / ~4 buổi = ~24 giờ thật nếu đúng hết) | ❓ Chưa có phản hồi người chơi |
| Multiplayer thật (server = tên trường, WebSocket, chat thật) | ❌ Để sau (người dùng chọn NPC trước) |
| Vai cô giáo chơi được, Phòng giáo viên có tính năng | ❌ Chờ multiplayer |

### Việc tiếp theo (theo thứ tự)

1. **[Người dùng]** Push bằng GitHub Desktop → chơi thử trên điện thoại (coco, cửa hàng, chọc bạn, góp ý, nhịp 6 giờ).
2. **[Người dùng]** Mua tên miền; tạo **project Supabase riêng** (region Singapore, bật Anonymous sign-ins) → gửi
   Project URL + anon key (KHÔNG gửi service_role); trả lời: multiplayer để hẳn sau hay làm bản nhẹ (câu chat có sẵn)?
   ai dùng trang quản trị (chỉ người dùng / cả giáo viên, người kiểm duyệt)?
3. Chuyển game sang **Cloudflare Pages** + tên miền (sớm, vì đổi link = người đã cài app phải cài lại). `_headers` đã có.
4. **Supabase S1–S3**: bảng + RLS + test RLS; đăng nhập (ẩn danh trước; khi thương mại cần số điện thoại); lưu tiến
   độ lên mạng (sửa lỗi iPhone mất tiến độ khi cài app); bảng `feedback` (insert-only) → điền `js/config.js`;
   chuyển ví coco (`economy.js`) lên server: số dư + sổ cái + mua hàng qua hàm DB/Edge Function, giới hạn kiếm/ngày.
5. **Trang quản trị**: repo riêng Next.js + shadcn, xuất tĩnh (`output: 'export'`) lên Cloudflare Pages, khoá thêm bằng
   Cloudflare Access; đăng nhập Supabase + MFA; vai trò (admin / giáo viên / kiểm duyệt) kiểm ở RLS; mục Góp ý, Duyệt
   mod, Cửa hàng, Sổ cái coco, Điều chỉnh (2 người duyệt), Nhật ký thao tác. Khuôn trang theo durian-operadmin (lọc
   trạng thái → bảng → Modal xác nhận → flash; khoá khi đã chốt). KHÔNG chép: token trong localStorage, thiếu test,
   sidebar không có giao diện điện thoại.
6. AI soạn câu hỏi → giáo viên duyệt (Cloudflare Worker + AI Gateway, giới hạn chi tiêu). Không cho AI chat tự do với trẻ.
7. Hỏi tỉnh cho "Giáo dục địa phương"; tìm giáo viên duyệt câu hỏi.
8. Tính năng khác: thêm câu hỏi; sự kiện (chào cờ, kiểm tra 15 phút, thi học kỳ); âm thanh nền; xếp hạng theo trường.
9. Multiplayer + chat thật (Supabase Realtime trước, Railway khi cần server riêng): lọc chat + báo cáo + chặn; trước khi
   bán coco cần xem lại pháp lý (game có người chơi tương tác = nhóm G1, khó xin phép nhất — chưa xác minh).
10. Thương mại (sau, có thể qua công ty Hồng Kông): pháp nhân, cổng thanh toán, Supabase Pro, giấy phép — người dùng tự
    tìm tư vấn.

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
| **Định hướng thương mại (2026-11-03): bán coco + vật phẩm trong game** — CHỐT: **phi thương mại trước**, tính sau (có thể mở công ty ở Hồng Kông); chưa có pháp nhân. Host: **Cloudflare** (người dùng chọn). Coco giai đoạn đầu chỉ kiếm bằng học, nhưng sổ cái để sẵn trên server cho việc bán sau. Đang bàn: Supabase làm backend (project riêng, không chung dự án khác), trang quản trị Next.js theo mẫu `E:\GitHub\durian-operadmin` (chỉ tham khảo, không sửa repo đó), host phải cho phép thương mại (Vercel Hobby cấm; GitHub Pages không dành cho kinh doanh) | Người dùng chọn. Cần: số dư coco do server giữ (sổ cái), chỉ bán đồ trang trí (không bán điểm/hạnh kiểm), không gacha, giới hạn chi tiêu trẻ em; pháp lý VN (giấy phép game, xác thực tài khoản, giờ chơi <18, dữ liệu trẻ em, cổng thanh toán) — chưa xác minh, người dùng cần tư vấn |
| Mod cộng đồng = file JSON dữ liệu trong `mods/`, gửi qua GitHub, người dùng duyệt; không cho nhập mod chạy code | Người dùng chọn; an toàn cho trẻ em, không cần server |
| Góp ý gửi vào **Supabase** (bảng `feedback`), hàng chờ trên máy khi offline — thay Google Form | Người dùng chọn Supabase cho "hộp thư góp ý + duyệt mod"; không cần tài khoản Google, xem được trong trang quản trị |
| Backend = **Supabase** (project riêng); game giữ host tĩnh; **Railway để sau** (chỉ khi multiplayer cần server riêng); Netlify/Vercel không dùng cho game | Supabase gọi thẳng từ trình duyệt, đủ cho lưu tiến độ / góp ý / xếp hạng / realtime; Vercel Hobby cấm thương mại |
| Coco: chỉ bán đồ trang trí/vui, không bán điểm/hạnh kiểm, không gacha; giới hạn kiếm 40/ngày; mọi thay đổi qua `economy.js` + sổ cái | Trẻ em chơi; chuẩn bị chuyển số dư lên server mà không sửa chỗ gọi |
| Đồng phục dự phòng mua bằng coco; chuyển lớp thì mẹ đổi miễn phí toàn bộ sang màu mới | Mua không bị mất giá trị khi lên lớp; vẫn có lý do mua (khỏi chờ giặt 15 phút) |
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
  bảng cài Android (prompt không có thao tác chạm), viết lại e2e.mjs (~40 kiểm tra, 3 cỡ đạt), SW `tho-v4`.
  Sau đó bàn hạ tầng: người dùng muốn Supabase/Netlify/Vercel/Railway → so sánh ưu/nhược, chọn: Supabase (lưu tiến
  độ, multiplayer + chat, góp ý + duyệt mod, xếp hạng), giữ host tĩnh; tham khảo `E:\GitHub\durian-operadmin` (Next.js
  + shadcn, Vercel, BE FastAPI trên Railway) cho trang quản trị; định hướng bán coco + vật phẩm nhưng **phi thương mại
  trước** (chưa có pháp nhân, có thể mở công ty HK sau), host **Cloudflare**; đề xuất AI soạn câu hỏi → giáo viên
  duyệt. "Làm những gì có thể trước" → làm **Giai đoạn 2–5** không cần tài khoản ngoài: mods/ + validatePack, coco +
  sổ cái, cửa hàng, bàn ăn, căng tin, đồng phục dự phòng, phụ kiện, chọc bạn + hiệu ứng, hộp thư góp ý (hàng chờ),
  MODDING.md, `_headers`, save v3, SW `tho-v5`; unit 24 + E2E 54 × 3 cỡ đạt. Còn treo: Supabase URL/key, tên miền,
  ai dùng trang quản trị, multiplayer sớm hay muộn, tỉnh, duyệt câu hỏi.
- **2026-11-02 · máy bàn** (phiên mở từ workspace `E:\KhuVuonTamAn`) — Người dùng muốn "trường học online" dựa trên
  đi chùa online, kèm ảnh *Nhà Tù Online* làm mẫu phong cách. Hỏi 4 điểm → chọn: thư mục riêng, NPC trước, trắc
  nghiệm thật, lớp 6–9. Làm MVP (Three.js r160 vendor; trường 3D, nhà riêng, ~35 NPC, 4 giai đoạn, 12 môn, 5 tag,
  bắt nạt hướng hỗ trợ), fuzz câu hỏi (sửa lỗi đáp án trùng ở phân số/luỹ thừa), E2E Edge headless, commit
  `dc056c6`. Người dùng gửi ảnh bảng "Cài trên iPhone" + "chủ yếu trên mobile" → làm PWA (manifest, icon PNG, SW
  offline), bảng cài iPhone/Android, bố cục cảm ứng, chạm-để-đi, chụm zoom, giảm đồ hoạ; E2E giả lập iPhone; commit
  `092da41`. Còn treo: người dùng chơi thử, publish GitHub Pages, thử điện thoại thật, duyệt câu hỏi, chọn tỉnh.
