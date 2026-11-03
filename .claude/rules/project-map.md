# Bản đồ file

```
E:\TruongHocOnline\
  index.html               HUD, màn tạo nhân vật, modal, bảng cài (#install), nút 💬 (#btnChat), 📮 (#btnMail)
  style.css                token màu :root + dark mode; khối `body.touch` = bố cục cảm ứng; bottom sheet cài app
  js\game.js               điểm vào: nối các mô-đun (init*), nhãn trên đầu, ánh sáng theo giờ, vòng lặp tick()
                           (camera, hotspot → nút hành động), màn bắt đầu (begin), ?debug → window.__g (tp, skip,
                           interact, actionFor, state, sub, sitting, busy, today, endSession, finishWash, catalog,
                           prankTarget, giveCoco, pos, ambience, audio); ambienceFor() chọn tiếng nền theo
                           giai đoạn + zone (gọi 4 lần/giây cùng HUD)
  js\ctx.js                G = trạng thái dùng chung, đổi được từ mọi mô-đun (state, player, meLabel, sub, busy,
                           sitting, now, camDist, movedAway, prankTarget, classStart/breakStart/preBellUntil,
                           bullyAt/bullyActive/guardUntil, washNotified, currentAction); TOUCH; tiện ích (pick,
                           clamp, fmt, mmss, hhmm, has, addStat, conductName, accuracy, subj, cls, isDone)
  js\stage.js              three.js: renderer, scene, SKY, camera, hemi/sun, W = buildWorld, npcs, ring, camPos
  js\save.js               lưu localStorage (key `truong-hoc-online-v1`, định dạng `state.v = 3`, migrate() v1→v2→v3),
                           newState/newToday, save() + cloud.scheduleSave (chặn khi movedAway), initSaveHooks
                           (visibilitychange)
  js\session.js            phiên 6 giờ thật (home → school → after), tiết học/ra chơi/tự do, cổng (gateCheck),
                           tổng kết (finishSession), chuyển lớp A1→A4 + lên lớp (checkPromotion), ôn bài (quizFor),
                           phaseTick + chatterTick
  js\laundry.js            đồng phục: laundry() giặt 15 phút thật, shirtColor, sao đỏ/giám thị bắt đồ dơ (patrolTick),
                           newClassUniforms
  js\shop.js               catalog đồ (mods/, giá server) + bàn ăn, tủ quần áo, bàn học, 🛒 cửa hàng, cặp, căng tin
  js\prank.js              chọc bạn (findPrankTarget, prank) + hiệu ứng spawnFx/fxTick
  js\tags.js               TAGS, evaluateTags, refreshMyTag, renderSpecial (Báo cô, Giữ trật tự), bắt nạt
                           (bullyEvent, reportTeacher)
  js\input.js              phím, cần điều khiển, chạm-để-đi, chụm 2 ngón (initInput), moveTick (đi mỗi khung hình)
  js\player.js             nhân vật người chơi (makePlayer, placePlayer…), respawnNpcs, va chạm + RULES (cửa khoá
                           theo tag/giai đoạn), zoneAt
  js\actions.js            hotspot → hành động (actionFor, interact), hộp thư góp ý, lêu lổng, cô tư vấn, thử
                           thách HSG, họp cán sự
  js\chat.js               chat + vùng cấm nói + lọc từ tục (cleanText)
  js\hud.js                dòng mục tiêu (setObjective), updateHud, nút HUD (môn, tag, 📮, 🏆, âm thanh, ❓), showHelp
  js\online.js             xếp hạng + mã chuyển máy (rankAndTransfer, giveTransferCode, claimTransfer,
                           onTransferredAway)
  js\items.js              đọc mods/index.json → validatePack(): kiểm kiểu, kẹp số, bỏ trường lạ; id = `<pack>:<id>`
  js\economy.js            ví coco: earn (giới hạn 40/ngày) / spend / lose / buy + sổ cái `state.ledger` (≤100 dòng).
                           Thiết kế để sau chuyển lên server (Supabase) mà giữ nguyên lời gọi
  js\feedback.js           hộp thư góp ý: chọn loại → ghi chữ → kèm lớp/vị trí/câu vừa gặp (`ui.lastQ`) → hàng chờ
                           localStorage `tho-feedback-outbox`; có Supabase thì POST /rest/v1/feedback rồi xả hàng chờ
  js\backend.js            client Supabase tự viết (fetch): đăng nhập ẩn danh, làm mới token (`tho-auth`), rest(), rpc()
  js\cloud.js              sao lưu save (`saves`), mã chuyển máy, hàng chờ op coco (`tho-coco-ops`) → `coco_apply`,
                           giá cửa hàng từ server, xếp hạng. Không có backend = no-op
  supabase\                migrations/*.sql (schema + RLS), seed.sql (sinh bằng gen-seed.mjs từ mods/), tests/
                           (PGlite, `node rls.test.mjs`), README (cách cài lên project)
  tests\                   run-all.ps1 → fuzz-questions, unit, e2e × 3 cỡ (xem testing.md)
  tools\                   export-questions / import-questions (CSV cho giáo viên duyệt), test-roundtrip
  (repo khác) E:\GitHub\TruongHocOnline-Admin   trang quản trị Next.js xuất tĩnh
  js\config.js             BACKEND { supabaseUrl, supabaseAnonKey } (để trống = offline), GAME_VERSION
  js\world.js              dựng trường (mét, +z = phía cổng) + nhà ở x=200; 4 phòng học = lớp A1–A4 của khối
                           đang học (W.seats/classDoors/teacher theo số lớp 1–4, W.setGrade đổi biển + tên zone);
                           hộp thư góp ý cạnh cổng (hotspot `mailbox`)
  js\npc.js                bạn học (mặc áo màu lớp; n.grade = số phòng 1–4), cô giáo, sao đỏ, giám thị, cô thư
                           viện, cô tư vấn, mẹ, 2 bạn lớp 9 bắt nạt (không có ghế, chỉ hiện ở sân);
                           đi theo waypoint (ghế → cửa lớp → sân), không pathfinding
  js\chars.js              nhân vật chibi từ khối cơ bản (khăn quàng đỏ bật/tắt, màu áo `shirt`, phụ kiện `acc`
                           {kind: cap|bow|glasses|headband, color})
  js\subjects.js           12 môn, POINTS_TO_PASS=5, CLASS_GROUPS (4 lớp × 3 môn + màu áo), ngân hàng câu (đáp án
                           ĐÚNG đặt ĐẦU, xáo khi hiện, `g` = lớp tối thiểu); Toán + Anh sinh tự động   ← CẦN giáo viên duyệt
  js\ui.js                 ask()/runQuiz()/chat/toast/nhãn trên đầu; ui.lastQ; âm thanh chỉ bằng WebAudio (không file):
                           sfx(ok|bad|up|pop|bell|drum|drum2|whistle), ambience(yard|outside|class|home|null) = tiếng
                           nền theo chỗ (ồn sân + chim, room tone lớp, nhà yên + giai điệu rất nhỏ); chế độ 🔊 bật →
                           🔉 chỉ hiệu ứng → 🔇 tắt (localStorage `tho-sound`, mặc định bật, âm lượng nhỏ);
                           AudioContext chỉ tạo khi người chơi chạm/bấm (iOS), suspend khi trang ẩn; audioInfo()
  js\install.js            hướng dẫn "Thêm vào MH chính" (iPhone Safari / iPhone Chrome / Android; nút cài 1 chạm
                           nếu có beforeinstallprompt); tự hiện lần đầu trên điện thoại; đăng ký sw.js
  js\vendor\three.module.min.js   Three.js r160 (MIT, kèm THREE-LICENSE.txt)
  mods\index.json, base.json   danh sách pack + đồ gốc (18 món: 9 đồ ăn, 1 đồng phục, 4 phụ kiện, 4 đồ chơi)
  sw.js                    cache offline — TĂNG `VERSION` mỗi lần sửa BẤT KỲ file nào (+ thêm file mới vào FILES).
                           Hiện tại: `tho-v8`
  manifest.webmanifest     display fullscreen, orientation any
  _headers                 header cho Cloudflare Pages (sw.js + mods/ no-cache, nosniff, X-Frame-Options…)
  icon.svg, icons\*.png    PNG (192, 512, maskable 512, apple-touch 180) render từ icon.svg bằng Edge headless
  chay.bat                 python http.server cổng 8081 + mở trình duyệt (chỉ để thử trên PC)
  README.md                mô tả lối chơi, tag, cách chơi trên điện thoại, việc trước khi phát hành
  MODDING.md               hướng dẫn làm mod + quy định nội dung được duyệt
  SEGMENTS.md              việc chia thành segment để giao người/agent (luật chung, bản đồ xung đột, thứ tự)
  CLAUDE.md                bản đồ dự án + nhật ký tiến độ (trạng thái, việc tiếp theo, quyết định, nhật ký phiên)
  .claude\rules\*.md       quy tắc cho Claude Code, mỗi file một chủ đề
```
