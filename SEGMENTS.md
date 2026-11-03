# Các phần việc (segment) để giao cho người hoặc agent

Mỗi segment là một gói việc **làm độc lập được**, có đầu vào, file đụng tới và tiêu chí "xong". Giao một segment bằng
cách gửi mã của nó (ví dụ "làm segment **A3** trong SEGMENTS.md").

Cập nhật 2026-11-03. Trạng thái tổng của dự án ở [CLAUDE.md](CLAUDE.md).

## Luật chung cho mọi segment

1. **Đọc trước:** `CLAUDE.md`, `.claude/rules/*.md` (đặc biệt `decisions.md` và `child-safety.md`). Agent Claude Code
   tự nạp các file này khi mở repo.
2. **Mỗi segment một nhánh** `seg/<mã>-<tên-ngắn>` (ví dụ `seg/A3-am-thanh`), commit nhỏ, gửi về bằng Pull Request.
   Không push thẳng `main`.
3. **Không đổi quyết định** trong `decisions.md` khi chưa hỏi chủ dự án. Gặp chỗ phải chọn, ghi câu hỏi vào PR.
4. **`sw.js` `VERSION`:** không tăng trong nhánh. Chủ dự án tăng một lần lúc gộp (tránh xung đột giữa các nhánh).
   Chỉ được **thêm file mới vào `FILES`**.
5. **Định dạng save (`state.v`):** mỗi lúc chỉ **một** segment được đổi (kèm `migrate()`). Segment nào cần đổi thì
   ghi rõ trong PR.
6. **Kiểm thử trước khi gửi:** chạy bộ test (có sau khi xong **S0**), chụp ảnh màn hình cỡ điện thoại 390×844.
7. Code, biến, comment bằng tiếng Anh; chữ hiện cho người chơi bằng tiếng Việt; thụt lề 2 dấu cách; không thêm bước
   build, không thêm thư viện qua CDN.
8. Khoá bí mật (Supabase `service_role`, khoá API AI) **không bao giờ** nằm trong repo hoặc code trình duyệt.

### Mẫu lời nhờ agent

> Làm segment **[mã]** trong `SEGMENTS.md` của repo E:\TruongHocOnline. Tạo nhánh `seg/[mã]-…`, theo đúng luật chung,
> chạy test, rồi báo lại: đã làm gì, test nào đạt, câu hỏi nào cần tôi quyết.

## Bản đồ xung đột

`js/game.js` (≈80 KB) chứa gần hết lối chơi. Các segment đụng nhiều vào nó **không nên chạy song song** trừ khi đã
xong **S1** (tách game.js).

| Nhóm file | Segment đụng tới |
|---|---|
| `js/game.js` (nhiều) | S1, A2, B2, B4 |
| `js/game.js` (ít, vài dòng nối) | A3, A6, B5 |
| `js/world.js`, `js/npc.js`, `js/chars.js` | A4 |
| `js/subjects.js` | A1, Q2 |
| `js/feedback.js`, `js/config.js` | B3, B2 |
| `js/economy.js` | B4 |
| `tests/`, `tools/`, `.github/` | S0, A1, A5 |
| `supabase/` (mới) | B1, B2, B4, B5 |
| Repo trang quản trị (riêng) | D1–D5 |

**Chạy song song an toàn ngay bây giờ:** S0 + A1 + A5 + B1 (soạn trước) + mọi việc của người (P\*).

## Thứ tự gợi ý

```
Đợt 0 (nền)      S0 test vào repo ──► S1 tách game.js
Người, song song P1 chơi thử · P2 tên miền · P3 Supabase · P4 trả lời câu hỏi · P5 giáo viên
Đợt 1 (offline)  A1 xuất câu hỏi ─► (P5 giáo viên duyệt) ─► Q2 nhập lại
                 A3 âm thanh · A4 hiệu năng · A5 CI + kiểm mod · A2 sự kiện (sau S1)
Đợt 2 (host)     P2 ─► H1 Cloudflare Pages + tên miền
Đợt 3 (backend)  B1 schema+RLS ─► P3 ─► B3 góp ý ─► B2 lưu mạng ─► B4 coco server ─► B5 xếp hạng
Đợt 4 (quản trị) B1 + P4 ─► D1 khung ─► D2 góp ý · D3 duyệt mod · D4 cửa hàng · D5 sổ cái
Sau              AI1 AI soạn câu hỏi (cần khoá API + D1) · M multiplayer (cần quyết định + pháp lý)
```

---

## Việc của người (không cần biết code)

### P1 · Chơi thử trên điện thoại thật — *chủ dự án hoặc người thử*
- **Làm:** chơi bản mới nhất (sau khi push) trên 1 iPhone + 1 Android, tốt nhất có 1 máy rẻ/cũ.
- **Ghi lại:** máy + trình duyệt; có giật/lag/nóng máy không; cài lên màn hình chính được không; tắt mạng rồi mở có
  chạy không; tai thỏ có che nút không; coco, cửa hàng, ăn sáng, chọc bạn, hộp thư góp ý có dễ hiểu không; 6 tiết/buổi
  và giặt 15 phút có quá dài/ngắn không; màu áo các lớp có dễ phân biệt không. Chụp màn hình chỗ lỗi.
- **Xong khi:** có danh sách phản hồi gửi cho chủ dự án → thành việc sửa cho agent.

### P2 · Mua tên miền + tạo tài khoản Cloudflare — *chủ dự án*
- **Làm:** mua tên miền (có thể mua ngay tại Cloudflare Registrar), tạo tài khoản Cloudflare.
- **Xong khi:** có tên miền trỏ về Cloudflare → mở khoá **H1**. Làm càng sớm càng tốt: đổi link = người đã cài app phải
  cài lại.

### P3 · Tạo project Supabase — *chủ dự án*
- **Làm:** tạo project **riêng** cho game, region Singapore, bật *Anonymous sign-ins*.
- **Gửi cho agent:** Project URL + `anon` key. **Không gửi** `service_role` key.
- **Xong khi:** có URL + anon key → mở khoá **B2–B5**.

### P4 · Trả lời các câu hỏi còn treo — *chủ dự án*
1. Multiplayer để hẳn sau, hay làm sớm bản nhẹ (chỉ câu chat có sẵn)?
2. Ai dùng trang quản trị: chỉ chủ dự án, hay cả giáo viên / người kiểm duyệt?
3. Tỉnh nào cho môn "Giáo dục địa phương"?
4. Sự kiện (A2): chào cờ / kiểm tra 15 phút / thi học kỳ thưởng phạt thế nào, có bắt buộc không?

### P5 · Giáo viên duyệt câu hỏi — *giáo viên THCS (mỗi người 1–3 môn)*
- **Đầu vào:** file bảng tính do **A1** xuất (mỗi dòng một câu: môn, lớp tối thiểu, câu hỏi, đáp án đúng, 3 đáp án sai).
- **Làm:** đánh dấu đúng/sai/sửa, ghi câu sửa, gợi ý câu mới theo GDPT 2018. Môn Địa phương: viết câu theo sách của
  tỉnh đã chọn (P4.3).
- **Xong khi:** trả file đã duyệt → agent làm **Q2**.

### P6 · Tư vấn pháp lý — *chủ dự án + luật sư* (chưa gấp)
Chỉ cần trước khi bán coco bằng tiền thật hoặc mở chat giữa người chơi. Xem mục Pháp lý trong
`.claude/rules/infrastructure.md`.

---

## Đợt 0 · Nền (agent, làm trước)

### S0 · Đưa bộ test vào repo
- **Vì sao:** script unit/E2E/fuzz hiện chỉ nằm ở thư mục tạm của phiên Claude và đã mất. Không có test trong repo thì
  không giao việc an toàn được.
- **Làm:** viết lại theo mô tả trong `.claude/rules/testing.md`:
  `tests/package.json` (`{"type":"module"}`, chỉ cho thư mục tests), `tests/fuzz-questions.mjs`, `tests/unit.mjs`
  (validatePack + ví coco, ≥24 kiểm tra), `tests/e2e.mjs` (Edge/Chrome headless + CDP, 3 cỡ, ≥54 kiểm tra),
  `tests/run-all.ps1` (bật python http.server cổng 8081 → chạy hết → tắt server), `tests/README.md` (cách chạy).
- **Không đụng:** code game (trừ khi phát hiện lỗi; khi đó tách commit riêng).
- **Xong khi:** `tests/run-all.ps1` chạy trên máy chủ dự án, tất cả đạt; cập nhật `testing.md` trỏ tới `tests/`.

### S1 · Tách `js/game.js` thành mô-đun (không đổi hành vi) — *sau S0*
- **Làm:** tách thành các file theo chủ đề, ví dụ `js/session.js` (phiên 6 giờ, tiết học, tổng kết), `js/laundry.js`
  (đồng phục, giặt, sao đỏ bắt), `js/shop.js` (cửa hàng, bàn ăn, căng tin, tủ đồ, cặp), `js/prank.js`,
  `js/tags.js`, `js/save.js` (lưu + `migrate()`), `js/input.js` (phím, cần điều khiển, chạm, chụm). `game.js` còn vòng
  lặp + nối các phần.
- **Giữ nguyên:** key localStorage, `state.v = 3`, API `window.__g` khi `?debug`.
- **Xong khi:** E2E 3 cỡ đạt như trước; thêm file mới vào `FILES` của `sw.js`; cập nhật `project-map.md`.

---

## Đợt 1 · Tính năng chạy offline (agent)

### A1 · Xuất ngân hàng câu hỏi cho giáo viên
- **Làm:** `tools/export-questions.mjs` → `questions-review.csv` (UTF-8 có BOM để Excel đọc đúng tiếng Việt): môn, lớp
  tối thiểu (`g`), câu hỏi, đáp án đúng (phần tử đầu), 3 đáp án sai, cột trống "Duyệt" / "Sửa thành" / "Ghi chú". Thêm
  vài câu Toán + Anh sinh tự động làm mẫu (đánh dấu "tự sinh").
- **Đụng:** chỉ `tools/`, đọc `js/subjects.js`.
- **Xong khi:** file mở được bằng Excel/Google Sheets, đủ mọi câu trong `BANK`.

### Q2 · Nhập lại câu hỏi đã duyệt — *sau P5*
- **Làm:** `tools/import-questions.mjs` đọc CSV đã duyệt → cập nhật `BANK` trong `js/subjects.js` (giữ quy ước đáp án
  đúng đặt đầu). In báo cáo: bao nhiêu câu giữ/sửa/xoá/thêm.
- **Xong khi:** fuzz câu hỏi đạt (đủ 4 đáp án khác nhau mọi môn × lớp 6–9); bỏ dòng "CẦN giáo viên duyệt" cho môn đã
  duyệt trong `project-map.md` / README.

### A2 · Sự kiện trường: chào cờ, kiểm tra 15 phút, thi học kỳ — *sau S1 và P4.4*
- **Làm:** chào cờ đầu buổi (xếp hàng ở sân), kiểm tra 15 phút (bộ câu không được gợi ý, chấm điểm), thi học kỳ trước
  khi lên khối. Thưởng/phạt theo trả lời P4.4.
- **Lưu ý:** có thể cần đổi save → ghi rõ trong PR (luật 5). Không bán điểm thi bằng coco.
- **Xong khi:** E2E có thêm bước cho từng sự kiện; `gameplay.md` cập nhật.

### A3 · Âm thanh nền
- **Làm:** nhạc nền nhẹ + tiếng trống trường, tiếng chuông, tiếng sân trường, **tạo bằng WebAudio** (không thêm file
  âm thanh lớn) trong `js/ui.js`; nút bật/tắt + nhớ lựa chọn; tắt khi trang bị ẩn; nhớ `unlockAudio` cho iOS.
- **Xong khi:** không lỗi console; trên iPhone giả lập không phát trước khi chạm; mặc định âm lượng nhỏ.

### A4 · Hiệu năng trên điện thoại rẻ
- **Làm:** đo FPS + draw calls (thêm chỉ số khi `?debug`); gộp hình tĩnh trong `js/world.js`
  (`BufferGeometryUtils`-kiểu tự viết hoặc instancing), giảm vật liệu trùng; NPC ở xa cập nhật thưa hơn (`js/npc.js`);
  cân nhắc bỏ bóng trên máy yếu.
- **Xong khi:** báo cáo số draw call / FPS trước–sau ở 390×844; nhìn không khác (ảnh chụp so sánh).

### A5 · CI trên GitHub + công cụ kiểm mod — *sau S0*
- **Làm:** `.github/workflows/test.yml` chạy fuzz + unit trên mỗi PR (E2E nếu chạy được trên runner Ubuntu với Chrome
  headless); `tools/check-mod.mjs <file.json>` dùng `validatePack` in lỗi dễ đọc + danh sách chữ cần người duyệt nội
  dung (theo quy định trong `MODDING.md`). Hướng dẫn trong `MODDING.md`.
- **Xong khi:** PR mẫu có mod hỏng bị CI báo đỏ.

### A6 · Câu chat có sẵn (chuẩn bị multiplayer bản nhẹ) — *chỉ khi P4.1 = "làm sớm"*
- **Làm:** thay ô gõ tự do bằng danh sách câu có sẵn (chào, hỏi bài, rủ chơi, cảm ơn…) dạng dữ liệu (có thể mở rộng
  bằng mod), vẫn tôn trọng vùng cấm nói.
- **Xong khi:** E2E chat đạt; không còn đường gửi chữ tự do.

---

## Đợt 2 · Host

### H1 · Chuyển sang Cloudflare Pages + tên miền — *sau P2; chủ dự án + agent*
- **Chủ dự án:** nối repo GitHub vào Cloudflare Pages (không có bước build, thư mục xuất = gốc repo), gắn tên miền.
- **Agent:** kiểm `_headers` có hiệu lực (sw.js no-cache…), cập nhật `start_url`/`scope` nếu cần, thêm thông báo trên
  bản GitHub Pages cũ: "Game đã chuyển sang <tên miền> — hãy cài lại" (iPhone không chuyển được dữ liệu tự động → nhắc
  dùng tính năng lưu mạng khi có B2). Cập nhật link trong CLAUDE.md, README, `infrastructure.md`.
- **Xong khi:** cài app từ tên miền mới trên iPhone + Android; offline chạy.

---

## Đợt 3 · Backend Supabase

### B1 · Schema + RLS + test RLS — *soạn được ngay, áp dụng sau P3*
- **Làm:** `supabase/migrations/*.sql`: `profiles` (id = auth.uid, tên hiển thị, trường, khối), `saves` (1 dòng/người,
  JSON + `v` + `updated_at`), `feedback` (chỉ insert, không đọc lại từ game), `coco_ledger` + hàm tính số dư,
  `shop_items`, `leaderboard` (view). RLS: mỗi người chỉ đọc/ghi dòng của mình; `feedback` insert-only; cột vai trò
  cho admin/giáo viên/kiểm duyệt (theo P4.2). `supabase/tests/rls.sql` (hoặc script Node) chứng minh người A không
  đọc được dữ liệu người B.
- **Thu thập tối thiểu:** không lưu tên thật, số điện thoại, email của học sinh.
- **Xong khi:** migration chạy sạch trên project trống; test RLS đạt; tài liệu `supabase/README.md`.

### B3 · Gửi góp ý thật — *sau B1 + P3* (nhỏ, làm đầu tiên)
- **Làm:** điền `js/config.js`, kiểm `js/feedback.js` POST vào `feedback`, xả hàng chờ khi có mạng.
- **Xong khi:** góp ý gửi từ điện thoại hiện trong bảng Supabase; offline thì vào hàng chờ rồi tự gửi lại.

### B2 · Đăng nhập ẩn danh + lưu tiến độ lên mạng — *sau B1 + P3*
- **Làm:** đăng nhập ẩn danh lúc mở game; đồng bộ save ↔ bảng `saves` (luật gộp: bản mới hơn theo `updated_at`, hỏi
  người chơi khi lệch lớn); **mã chuyển máy** (ví dụ 6 ký tự) để chuyển tiến độ từ Safari sang app đã cài trên iPhone.
  Vẫn chơi được offline.
- **Không dùng thư viện qua CDN:** gọi REST/Auth API của Supabase bằng `fetch`, hoặc để sẵn file thư viện trong
  `js/vendor/`.
- **Xong khi:** E2E: chơi → reload ở "máy khác" bằng mã chuyển máy → tiến độ giữ nguyên.

### B4 · Ví coco trên server — *sau B2*
- **Làm:** hàm DB / Edge Function `earn`, `buy` (kiểm giới hạn 40/ngày ở server, chỉ nhận "mua món X"); `js/economy.js`
  giữ nguyên lời gọi, bên trong gọi server khi có mạng; mua hàng cần mạng, học vẫn offline (ghi chờ đồng bộ phần kiếm).
- **Xong khi:** sửa localStorage bằng tay không tăng được số dư thật; unit ví coco vẫn đạt.

### B5 · Bảng xếp hạng theo trường — *sau B2*
- **Làm:** view xếp hạng (điểm/khối/hạnh kiểm, không lộ thông tin cá nhân), màn hình xếp hạng trong game.
- **Xong khi:** hiện top 20 + hạng của mình; tên hiển thị đi qua lọc từ tục.

---

## Đợt 4 · Trang quản trị (repo riêng) — *sau B1 + P4.2*

Theo kế hoạch ở `.claude/rules/infrastructure.md` (Next.js + shadcn, `output: 'export'`, Cloudflare Pages + Access,
Supabase Auth + MFA, quyền kiểm ở RLS; tham khảo khuôn trang `E:\GitHub\durian-operadmin` nhưng **không sửa** repo đó
và **không chép**: token trong localStorage, thiếu test, không có giao diện điện thoại).

| Mã | Việc | Xong khi |
|---|---|---|
| D1 | Khung repo: đăng nhập + MFA, layout có giao diện điện thoại, phân vai trò, nhật ký thao tác, test | Đăng nhập được; vai trò sai bị RLS chặn (có test) |
| D2 | Góp ý: lọc trạng thái → bảng → xem chi tiết → đánh dấu đã xử lý | Xử lý góp ý thật từ B3 |
| D3 | Duyệt mod: xem nội dung pack, chạy `check-mod`, duyệt/từ chối có lý do | Duyệt một pack mẫu |
| D4 | Cửa hàng: sửa giá, bật/tắt món (chỉ đồ trang trí/vui) | Thay đổi hiện trong game |
| D5 | Sổ cái coco + điều chỉnh (cần 2 người duyệt) | Mọi điều chỉnh có nhật ký, không sửa trực tiếp số dư |

---

## Để sau (cần quyết định hoặc điều kiện)

- **AI1 · AI soạn câu hỏi → giáo viên duyệt:** cần khoá API (chỉ đặt ở Cloudflare Worker/Edge Function, có giới hạn
  chi tiêu), D1 và hàng chờ duyệt. Không câu nào tới học sinh khi chưa có người duyệt.
- **M · Multiplayer + chat:** cần P4.1, lọc từ + báo cáo + chặn + người kiểm duyệt, và tư vấn pháp lý (P6).
- **Vai cô giáo (tag `co-giao`)**, bán coco bằng tiền thật: sau khi có pháp nhân.
