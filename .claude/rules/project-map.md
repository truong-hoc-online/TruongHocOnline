# Bản đồ file

```
E:\TruongHocOnline\
  index.html               HUD, màn tạo nhân vật, modal, bảng cài (#install), nút 💬 (#btnChat), 📮 (#btnMail)
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
  js\ui.js                 ask()/runQuiz()/chat/toast/nhãn trên đầu/âm thanh WebAudio (unlockAudio cho iOS); ui.lastQ
  js\install.js            hướng dẫn "Thêm vào MH chính" (iPhone Safari / iPhone Chrome / Android; nút cài 1 chạm
                           nếu có beforeinstallprompt); tự hiện lần đầu trên điện thoại; đăng ký sw.js
  js\vendor\three.module.min.js   Three.js r160 (MIT, kèm THREE-LICENSE.txt)
  mods\index.json, base.json   danh sách pack + đồ gốc (18 món: 9 đồ ăn, 1 đồng phục, 4 phụ kiện, 4 đồ chơi)
  sw.js                    cache offline — TĂNG `VERSION` mỗi lần sửa BẤT KỲ file nào (+ thêm file mới vào FILES).
                           Hiện tại: `tho-v5`
  manifest.webmanifest     display fullscreen, orientation any
  _headers                 header cho Cloudflare Pages (sw.js + mods/ no-cache, nosniff, X-Frame-Options…)
  icon.svg, icons\*.png    PNG (192, 512, maskable 512, apple-touch 180) render từ icon.svg bằng Edge headless
  chay.bat                 python http.server cổng 8081 + mở trình duyệt (chỉ để thử trên PC)
  README.md                mô tả lối chơi, tag, cách chơi trên điện thoại, việc trước khi phát hành
  MODDING.md               hướng dẫn làm mod + quy định nội dung được duyệt
  CLAUDE.md                giới thiệu ngắn + mục lục .claude/rules/
  .claude\rules\*.md       quy tắc cho Claude Code, mỗi file một chủ đề
```
