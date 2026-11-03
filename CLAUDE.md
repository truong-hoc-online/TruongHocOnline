# CLAUDE.md — Trường Học Online

Game 3D trình duyệt "trường học online" cho học sinh THCS (lớp 6–9), **ưu tiên điện thoại** (PWA). JavaScript thuần +
Three.js r160, không build. **Luôn trả lời người dùng bằng tiếng Việt.**

File này là **bản đồ dự án + nhật ký tiến độ**: cập nhật Trạng thái, Việc tiếp theo, Quyết định và Nhật ký ở cuối
mỗi phiên. Quy tắc chi tiết theo chủ đề nằm trong `.claude/rules/`. File không có `paths` được nạp mọi phiên; file có
`paths` chỉ nạp khi đọc/sửa file khớp.

## Bản đồ quy tắc (`.claude/rules/`)

| File | Nội dung | Nạp |
|---|---|---|
| `language-and-style.md` | Tiếng Việt cho người dùng, tiếng Anh trong code, thụt lề | luôn |
| `project-scope.md` | Dự án là gì, ý tưởng gốc, ranh giới với dự án khác, không sao chép game | luôn |
| `workflow-git.md` | Git, commit sau mỗi lần sửa, công cụ trên máy, việc cuối phiên | luôn |
| `project-map.md` | Bản đồ file mã nguồn | luôn |
| `gameplay.md` | Nhịp 6 giờ, đồng phục/giặt đồ, lớp A1–A4, coco, chọc bạn, tag | luôn |
| `child-safety.md` | An toàn cho trẻ em (bắt nạt, thương mại, chat, AI, dữ liệu, mod) | luôn |
| `infrastructure.md` | Host, Supabase, Cloudflare, trang quản trị, thương mại, pháp lý | luôn |
| `decisions.md` | **Toàn bộ** quyết định quan trọng và lý do (từ đầu dự án) | luôn |
| `pwa-offline.md` | Service worker, cài app, iPhone/Android | `sw.js`, `index.html`, manifest, `js/install.js`… |
| `mods-and-economy.md` | Mod, ví coco, góp ý, định dạng save | `mods/**`, `js/items.js`, `js/economy.js`, `js/game.js`… |
| `testing.md` | Fuzz, unit, E2E 3 cỡ, mẹo test | `js/**/*.js`, `sw.js`, `index.html`, `style.css`, `mods/**` |

Link game: https://truong-hoc-online.github.io/TruongHocOnline/ · Repo: github.com/truong-hoc-online/TruongHocOnline
(public) · SW cache hiện tại: `tho-v8` · Save: `state.v = 3`.

## Trạng thái

**Cập nhật 2026-11-03 (cuối phiên)**

| Phần | Trạng thái |
|---|---|
| MVP một người chơi + NPC (12 môn, lớp 6→9, 5 tag + phòng riêng, cấm nói chuyện, bắt nạt hướng hỗ trợ) | ✅ `dc056c6` |
| PWA + bảng cài iPhone/Android + bố cục cảm ứng | ✅ `092da41` |
| GitHub Pages public (HTTPS) | ✅ 2026-11-03 |
| Chạy trên điện thoại thật | ✅ Người dùng xác nhận chơi được. Chưa báo chi tiết: giật/lag, cài MH chính, offline, tai thỏ |
| **Lối chơi v2**: phiên 6 giờ thật, bỏ buổi tối, 6 tiết/buổi + tự do; lớp A1–A4 × 3 môn + màu áo; chuyển lớp → lên khối; giặt đồ 15 phút thật; đồ dơ chỉ trừ khi bị bắt | ✅ `7fcb1ac` |
| Sửa lỗi bảng cài Android không bao giờ hiện (`prompt()` gọi từ hẹn giờ, không có thao tác chạm) | ✅ `7fcb1ac` |
| Coco 🥥 + sổ cái (giới hạn 40/ngày), ăn sáng (cơm trắng miễn phí / hủ tiếu / cơm sườn…), căng tin, 🛒 cửa hàng, đồng phục dự phòng, phụ kiện | ✅ `6e35dcb` |
| Mod cộng đồng (`mods/*.json` + `validatePack`) + `MODDING.md` | ✅ `6e35dcb` |
| Đồ chơi chọc bạn (súng nước, bã kẹo cao su, trà sữa trân châu, pháo giấy) + bị bắt / bị mách | ✅ `6e35dcb` |
| Hộp thư góp ý 📮 (nút HUD + hộp thư cạnh cổng), hàng chờ trên máy | ✅ `6e35dcb` · ⏳ gửi thật cần Supabase |
| `_headers` cho Cloudflare Pages | ✅ `6e35dcb` · ⏳ chưa chuyển host |
| **S0** Bộ test trong repo `tests/` (`run-all.ps1`): fuzz, unit 38, E2E 69/69/71 × 3 cỡ | ✅ `fee81d0` · đạt cho `503d6a5` |
| **A1** Xuất/nhập ngân hàng câu hỏi CSV cho giáo viên (`tools/`) | ✅ `fd3462e` · chờ giáo viên (P5) |
| **B1** Supabase schema + RLS + hàm (lưu, mã chuyển máy, góp ý, ví coco, cửa hàng, xếp hạng, duyệt mod, nhân viên + MFA, nhật ký); test RLS bằng PGlite 75 | ✅ `4cd88bf`, `3b03717` · người dùng đang tạo project |
| **B2–B5** Game nối Supabase: đăng nhập ẩn danh, sao lưu save, mã chuyển máy, đồng bộ coco, giá server, 🏆 xếp hạng | ✅ `503d6a5` |
| **Supabase thật** project `ahppbfhwhyiycxsusntj` (org "Moter School 1", Singapore): 2 migration + seed đã chạy, anonymous sign-in bật, khoá publishable trong `js/config.js`; thử online bằng chính `backend.js`/`cloud.js` 20/20 (2 máy giả lập); E2E chặn gọi Supabase (`E2E_LIVE=1` để bỏ chặn); SW `tho-v8` | ✅ 2026-11-04 · ⏳ chưa push · còn dữ liệu thử: người chơi "Claude thử" + 1 góp ý "Claude: kiểm thử" |
| **D1–D5** Trang quản trị — repo riêng `E:\GitHub\TruongHocOnline-Admin` (Next 16 xuất tĩnh, MFA, sessionStorage, `?demo`, 📋 Xuất cho Claude, 28 test) | ✅ `f99dc81` (repo đó) · ⏳ chưa có remote, chưa deploy |
| Quy tắc Claude tách vào `.claude/rules/` theo đặc tả Claude Code | ✅ `1db0c1c` |
| **Chưa push** các commit của phiên này | ⏳ Người dùng push bằng GitHub Desktop |
| Cloudflare Pages + tên miền riêng | ⏳ Chờ người dùng mua tên miền |
| AI soạn câu hỏi → giáo viên duyệt | 💡 Đề xuất — cần khoá API |
| Giáo viên duyệt câu hỏi `js/subjects.js` | ❌ Chưa |
| "Giáo dục địa phương" theo tỉnh | ❌ Đang là văn hoá chung — chưa biết tỉnh |
| Cân bằng nhịp chơi (6 tiết/buổi, ~24 giờ thật/khối nếu đúng hết) | ❓ Chưa có phản hồi |
| Multiplayer + chat thật; vai cô giáo | ❌ Để sau |
| Thương mại (bán coco bằng tiền thật) | ❌ Phi thương mại trước; chưa có pháp nhân |

## Agent / nhánh đang làm dở

Mỗi segment code làm trong **git worktree riêng** `E:\TruongHocOnline-wt\<tên>` trên nhánh `seg/<tên>` (tạo bằng
`git worktree add -b seg/<tên> E:\TruongHocOnline-wt\<tên> main`; công cụ `isolation: worktree` của Agent không chạy
vì git không nằm trong PATH). Mỗi agent chạy test trên một cổng riêng (`tests\run-all.ps1 -Port 80xx`).
**Mở phiên mới:** với mỗi dòng dưới đây xem `git -C <worktree> log main..HEAD` + `git status`. Agent cũ còn trong phiên
thì gửi tiếp (SendMessage); phiên mới thì giao agent mới tiếp tục từ nhánh đó (đọc SEGMENTS.md + commit đã có). Xong
→ chạy test → merge vào `main` → tăng `VERSION` trong `sw.js` một lần → `git worktree remove` → xoá dòng ở đây.

| Segment | Worktree / nhánh | Cổng test | Trạng thái (2026-11-03) |
|---|---|---|---|
| S1 tách `game.js` → 15 module | — | | ✅ gộp `e50974f` |
| A5 CI (`.github/workflows/test.yml`) + `tools/check-mod.mjs` | — | | ✅ gộp `4d689c5` · CI chưa chạy thật trên GitHub |
| A7 244 câu AI nháp + 4 đề xuất sửa → `questions/drafts/`, cổng duyệt trong import | — | | ✅ gộp `7e0cffd` · chờ giáo viên |
| A4 hiệu năng: lệnh vẽ 760→315 (−58%), tam giác −40%, gộp mesh tĩnh, chung hình nhân vật, NPC xa >25 m hoạt hình cách khung | — | | ✅ gộp `c423845`, test đủ đạt trên main · còn hook gợi ý: `renderer/scene/camera` vào `__g`, `npcs.focus = player.position`, chế độ bóng nhẹ cho máy yếu, nhãn tên cập nhật mỗi khung |
| A3 âm thanh nền WebAudio (sân/ngoài trời/lớp/nhà, trống trường, còi sao đỏ, nút 3 chế độ `tho-sound`) | — | | ✅ gộp `102ba5c`, E2E 81/81/83 · cần người nghe thử trên điện thoại thật |
| A2 sự kiện / A6 chat câu có sẵn | (chưa tạo) | | chờ người dùng quyết (P4) |

Hiện **không có worktree nào đang mở**. Cuối phiên 2026-11-03 máy được tắt theo yêu cầu người dùng sau khi mọi agent xong.

## Việc tiếp theo (phiên sau)

Việc chia thành segment để giao người/agent: [SEGMENTS.md](SEGMENTS.md). Đã xong: S0, S1, A1, A3, A4, A5, A7, B1–B5
(phía code), D1–D5. Mở phiên: chào người dùng, báo tóm tắt đợt agent (bảng trên), hỏi các việc dưới.

1. **Supabase đã nối (2026-11-04).** Tiếp: tài khoản admin (Authentication → Add user, email người dùng) → đăng nhập
   trang quản trị + MFA → `insert into staff` (SQL trong supabase/README.md) → `.env.local` trang quản trị
   (URL + khoá publishable) → thử thật trang quản trị (góp ý "Claude: kiểm thử" có sẵn để thử duyệt / Xuất cho Claude)
   → repo GitHub **private** cho trang quản trị → deploy Cloudflare Pages + Access. Dọn dữ liệu thử sau đó.
2. **Push** (người dùng, GitHub Desktop) → xem lần chạy CI đầu tiên trên GitHub (job e2e trên Linux chưa từng chạy).
3. **Hỏi người dùng:** chơi thử bản mới (giật/lag sau A4, âm thanh A3: trống có giống trống trường không, tiếng sân
   có như tiếng ồn/gió, còi có chói, iPhone im trước khi chạm); P4: A2 sự kiện (thưởng phạt, thi học kỳ bắt buộc?),
   A6 multiplayer nhẹ sớm hay để sau, giới hạn giá 500 hay 1000, ai dùng trang quản trị, tỉnh cho Địa phương.
4. **Giáo viên (P5):** gửi `questions/drafts/2026-11-03-ai.csv` + `fixes-2026-11-03.csv` + `tools/HUONG-DAN-DUYET.md`
   (và `tools/out/questions-review.csv` cho câu cũ). Câu AI ít chắc: tuổi chịu TNHS (GDCD 9), Holland (HĐTN 9),
   COUNTIF/IF (Tin 9), "Nói giảm nói tránh"/"Đất rừng phương Nam" lớp 7; check-drafts cảnh báo van-ai-023, cong-nghe-ai-003.
5. Hook A4 còn lại (nhỏ, tự làm): `renderer/scene/camera` vào `__g`; `npcs.focus = player.position` trong
   `makePlayer`; chế độ bóng nhẹ khi `hardwareConcurrency <= 4`; nhãn tên NPC cập nhật thưa hơn.
6. Tên miền → H1 Cloudflare Pages. Sau: AI1 (khoá API), multiplayer.

## Quyết định quan trọng trong phiên 2026-11-03

Danh sách đầy đủ (cả các phiên trước) ở `.claude/rules/decisions.md`.

| Quyết định | Lý do |
|---|---|
| "Cứ 6 tiếng mới về nhà" = **6 giờ ngoài đời**; bỏ buổi tối; nhà chỉ để chuẩn bị | Người dùng chọn; nhịp game online: vào chơi, thoát, quay lại |
| Tiết học chạy theo thời gian chơi; 6 tiết/buổi rồi tự do tới hết 6 giờ | Thoát game không bị phạt trốn tiết; không xong cả khối trong 1 buổi |
| Giặt đồ **15 phút thật**, chạy cả khi tắt game; đồ dơ chỉ bị trừ khi sao đỏ/giám thị bắt gặp (1 lần/buổi) | Người dùng chọn; có may rủi nhưng không phạt chồng |
| 4 lớp × 3 môn, **học hết lớp này sang lớp kia**; A1 = Toán·KHTN·Tin (GDPT 2018 không có Lý/Hoá riêng); màu áo theo lớp | Người dùng chọn và đồng ý cách chia |
| Coco chỉ kiếm bằng học (40/ngày); chỉ bán đồ trang trí/vui, không bán điểm, không gacha; mọi thay đổi qua `economy.js` + sổ cái | An toàn trẻ em; sẵn sàng chuyển lên server |
| Mod = JSON dữ liệu, không chạy code; người dùng duyệt; chữ từ mod luôn qua `esc()` | An toàn; cộng đồng mod được mà không phá game |
| Chọc bạn chỉ với NPC, ngoài lớp/thư viện; bị bắt thì tịch thu; chọc một bạn 2 lần = bị gọi là bắt nạt | Game chống bắt nạt; trò nghịch phải nhẹ |
| Backend **Supabase** (project riêng, không chung dự án khác); **Railway để sau**; Netlify/Vercel không dùng cho game | Đủ cho lưu tiến độ / góp ý / xếp hạng / realtime mà không cần server; Vercel Hobby cấm thương mại |
| Góp ý vào Supabase thay **Google Form** | Người dùng chọn Supabase cho góp ý + duyệt mod |
| **Phi thương mại trước**, bán coco + vật phẩm sau (có thể công ty Hồng Kông); host **Cloudflare** | Chưa có pháp nhân; Cloudflare miễn phí cho cả thương mại, có Access/Workers/AI Gateway |
| Trang quản trị theo mẫu `E:\GitHub\durian-operadmin` (chỉ tham khảo, không sửa repo đó) | Người dùng quen bộ công cụ; bỏ các điểm yếu (token localStorage, không test, không mobile) |
| Tách quy tắc vào `.claude/rules/`; CLAUDE.md giữ vai trò bản đồ + nhật ký tiến độ | Người dùng yêu cầu: CLAUDE.md luôn là bản đồ dự án và nhật ký được cập nhật |

## Nhật ký phiên

Mới nhất ở trên.

- **2026-11-04 · máy bàn** — Người dùng tạo project Supabase `ahppbfhwhyiycxsusntj`, hỏi anon key là gì → giải thích
  publishable vs secret. Thử lần 1: chưa chạy SQL, chưa bật anonymous → hướng dẫn; lần 2 đạt. Thử online bằng code
  game thật 20/20, điền `js/config.js`, E2E chặn gọi Supabase để không tạo dữ liệu giả, SW `tho-v8`, test đủ đạt.

- **2026-11-03 · máy bàn (tiếp 3)** — "Tiếp tục chia agent và segment" → 4 agent song song trong git worktree riêng
  (công cụ worktree tự động lỗi vì git không trong PATH → tạo tay `E:\TruongHocOnline-wt\`), mỗi agent một cổng test
  (sửa `run-all -Port` truyền xuống E2E, `ce3bdc4`): A5 CI + check-mod, A7 244 câu AI nháp + cổng duyệt, S1 tách
  game.js 15 module, A4 hiệu năng −58% lệnh vẽ; sau S1 giao A3 âm thanh. Gộp lần lượt (xung đột nhỏ tools/README),
  chạy đủ test trên main sau mỗi đợt; SW `tho-v8`. Người dùng hỏi tắt máy có phải chia lại không → không (ghi bảng
  agent vào CLAUDE.md); yêu cầu **tắt máy khi agent xong** → tắt bằng `shutdown /s /t 120`.

- **2026-11-03 · máy bàn (tiếp 2)** — Người dùng: P1 chơi thử dần + muốn chỗ duyệt báo lỗi rồi nhờ Claude sửa; làm
  A1, backend, trang quản trị. Giao agent S0 (test), A1 (CSV câu hỏi), D1–D5 (trang quản trị, repo riêng); tự làm B1
  (schema + 67→75 test RLS bằng PGlite, không Docker) và B2–B5 phía game. Phiên bị ngắt giữa chừng → tắt server 8081
  bị bỏ lại, cho agent làm tiếp. Vá thêm migration 0001 theo báo cáo agent quản trị (khoá góp ý đã chốt, nhật ký ẩn
  tên/từ cấm). Người dùng hỏi dùng chung tài khoản Supabase với durian → được, project + org riêng; hướng dẫn form tạo
  project (Singapore, tắt "auto expose", bật auto RLS). A1 phát hiện câu hỏi dùng tên tỉnh cũ (sáp nhập 2025).

- **2026-11-03 · máy bàn (tiếp)** — Người dùng muốn chia việc để nhờ người/agent làm → viết `SEGMENTS.md`: luật chung
  (nhánh mỗi segment, không tăng `VERSION` trong nhánh, một segment đổi save mỗi lúc), bản đồ xung đột (`game.js`),
  thứ tự đợt, 6 việc của người + 20 segment code. Phát hiện script test chỉ nằm ở scratchpad → segment S0.

- **2026-11-03 · máy bàn** — Lên kế hoạch phiên từ CLAUDE.md. Repo đã push nhưng private → hướng dẫn public + bật
  Pages (lần đầu 404 vì đang build). Người dùng chơi được trên điện thoại, yêu cầu 6 ý (nhịp 6 giờ + giặt 15 phút +
  ăn sáng bằng coco; lớp 3 môn; đồng phục theo lớp; mod cộng đồng; đồ chơi chọc phá; hộp thư góp ý). Hỏi 4 điểm →
  làm **lối chơi v2** + sửa lỗi bảng cài Android, viết lại E2E (`7fcb1ac`). Bàn hạ tầng: so sánh Supabase / Netlify /
  Vercel / Railway, trang quản trị (tham khảo durian-operadmin), AI/LLM trên từng nền tảng, thương mại (bán coco) và
  pháp lý VN → chốt Supabase + Cloudflare, phi thương mại trước (`5140199`, `3f94a57`). "Làm những gì có thể trước" →
  coco + sổ cái, mods/ + validatePack, cửa hàng, ăn sáng, căng tin, đồng phục dự phòng, phụ kiện, chọc bạn, hộp thư
  góp ý, MODDING.md, `_headers`, save v3, SW `tho-v5`; unit 24 + E2E 54 × 3 cỡ đạt (`6e35dcb`). Tách CLAUDE.md thành
  `.claude/rules/` (`1db0c1c`), rồi theo yêu cầu đưa trạng thái + nhật ký về lại CLAUDE.md. Còn treo: push, chơi thử,
  Supabase URL/key, tên miền, 2 câu hỏi (multiplayer sớm/muộn, ai dùng trang quản trị), tỉnh, duyệt câu hỏi.
- **2026-11-02 · máy bàn** (phiên mở từ workspace `E:\KhuVuonTamAn`) — Người dùng muốn "trường học online" dựa trên
  đi chùa online, kèm ảnh *Nhà Tù Online* làm mẫu phong cách. Hỏi 4 điểm → chọn: thư mục riêng, NPC trước, trắc
  nghiệm thật, lớp 6–9. Làm MVP (Three.js r160 vendor; trường 3D, nhà riêng, ~35 NPC, 4 giai đoạn, 12 môn, 5 tag,
  bắt nạt hướng hỗ trợ), fuzz câu hỏi, E2E Edge headless (`dc056c6`). Người dùng gửi ảnh bảng "Cài trên iPhone" +
  "chủ yếu trên mobile" → làm PWA, bảng cài iPhone/Android, bố cục cảm ứng, chạm-để-đi, chụm zoom (`092da41`).
