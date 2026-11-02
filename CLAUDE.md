# CLAUDE.md — Trường Học Online

Game 3D trình duyệt "trường học online" cho học sinh THCS (lớp 6–9), **ưu tiên điện thoại** (PWA). JavaScript thuần +
Three.js r160, không build. **Luôn trả lời người dùng bằng tiếng Việt.**

Quy tắc chi tiết nằm trong `.claude/rules/`, mỗi file một chủ đề. Claude Code tự nạp các file này: file không có
`paths` được nạp mọi phiên, file có `paths` chỉ nạp khi đọc/sửa file khớp.

| File | Nội dung | Nạp |
|---|---|---|
| `language-and-style.md` | Tiếng Việt cho người dùng, tiếng Anh trong code, thụt lề | luôn |
| `project-scope.md` | Dự án là gì, ý tưởng gốc, ranh giới với dự án khác, không sao chép game | luôn |
| `workflow-git.md` | Git, commit sau mỗi lần sửa, công cụ trên máy, cập nhật trạng thái cuối phiên | luôn |
| `project-map.md` | Bản đồ file | luôn |
| `gameplay.md` | Nhịp 6 giờ, đồng phục/giặt đồ, lớp A1–A4, coco, chọc bạn, tag | luôn |
| `child-safety.md` | Nguyên tắc an toàn cho trẻ em (bắt nạt, thương mại, chat, AI, dữ liệu, mod) | luôn |
| `infrastructure.md` | Host, Supabase, Cloudflare, trang quản trị, thương mại, pháp lý | luôn |
| `decisions.md` | Quyết định quan trọng và lý do | luôn |
| `status-roadmap.md` | Trạng thái và việc tiếp theo | luôn |
| `session-log.md` | Nhật ký các phiên | luôn |
| `pwa-offline.md` | Service worker, cài app, iPhone/Android | `sw.js`, `index.html`, manifest, `js/install.js`… |
| `mods-and-economy.md` | Mod, ví coco, góp ý, định dạng save | `mods/**`, `js/items.js`, `js/economy.js`, `js/game.js`… |
| `testing.md` | Fuzz, unit, E2E 3 cỡ, mẹo test | `js/**/*.js`, `sw.js`, `index.html`, `style.css`, `mods/**` |

Khi thông tin thay đổi, sửa đúng file chủ đề đó; không thêm lại nội dung chi tiết vào CLAUDE.md.
