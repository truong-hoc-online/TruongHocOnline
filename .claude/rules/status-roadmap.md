# Trạng thái và việc tiếp theo

**Cập nhật 2026-11-03**

| Phần | Trạng thái |
|---|---|
| MVP một người chơi + NPC: 12 môn, lớp 6→9, 5 tag + phòng riêng, cấm nói chuyện, bắt nạt (hướng hỗ trợ), lưu tiến độ | ✅ commit `dc056c6` |
| PWA (manifest, icon, SW offline) + bảng hướng dẫn cài iPhone/Android + bố cục cảm ứng | ✅ commit `092da41` |
| Đưa lên GitHub Pages (HTTPS) — https://truong-hoc-online.github.io/TruongHocOnline/ | ✅ 2026-11-03, repo public |
| Chạy trên điện thoại thật | ✅ Người dùng báo "đã chơi được trên điện thoại" (2026-11-03); chưa có chi tiết giật/lag, cài MH chính, offline |
| **Lối chơi mới — Giai đoạn 1**: phiên 6 giờ thật, bỏ buổi tối, 6 tiết/buổi + tự do; lớp A1–A4 × 3 môn, màu đồng phục theo lớp, chuyển lớp → lên khối; giặt đồ 15 phút thật; đồ dơ chỉ trừ khi sao đỏ/giám thị bắt; migrate save v1 → v2 | ✅ 2026-11-03, SW `tho-v4` |
| Sửa lỗi bảng cài Android: tự hiện gọi `prompt()` không có thao tác chạm → bị chặn, bảng không hiện | ✅ 2026-11-03: tự hiện luôn mở bảng; nút "📲 Cài ngay" bên trong gọi prompt khi chạm |
| Giai đoạn 2: đồ theo dữ liệu (`mods/`, validatePack), coco 🥥 + sổ cái, bàn ăn (cơm trắng / hủ tiếu / cơm sườn…), căng tin, 🛒 cửa hàng, đồng phục dự phòng (uniform tính theo bộ), phụ kiện (mũ, nơ, kính, băng đô), save v3 | ✅ 2026-11-03, SW `tho-v5` |
| Giai đoạn 3: đồ chơi chọc bạn (súng nước, bã kẹo cao su, trà sữa phun trân châu, pháo giấy) + hiệu ứng hạt + bị bắt / bị mách | ✅ 2026-11-03 |
| Giai đoạn 4: hộp thư góp ý 📮 (nút HUD + hộp thư cạnh cổng), hàng chờ trên máy | ✅ Giao diện + hàng chờ. ⏳ Gửi thật cần Supabase (bảng `feedback`) — **thay cho Google Form** |
| Giai đoạn 5: `MODDING.md`, `_headers` (Cloudflare), unit test 24 + E2E 54 kiểm tra × 3 cỡ | ✅ 2026-11-03, commit `6e35dcb` |
| Tách CLAUDE.md thành `.claude/rules/` (mỗi file một chủ đề; 3 file theo `paths`) | ✅ 2026-11-03 |
| Supabase (lưu tiến độ, góp ý, xếp hạng, sổ cái coco trên server) | ⏳ Chờ người dùng tạo project riêng + gửi URL + anon key |
| Chuyển host sang Cloudflare Pages + tên miền riêng | ⏳ Chờ người dùng mua tên miền |
| Trang quản trị (Next.js theo mẫu durian-operadmin, xuất tĩnh, Cloudflare Pages + Access) | ❌ Chưa làm — cần Supabase |
| AI soạn câu hỏi → giáo viên duyệt (Cloudflare Workers + AI Gateway gọi Claude) | 💡 Đề xuất, chưa làm — cần khoá API |
| Giáo viên duyệt câu hỏi `js/subjects.js` | ❌ Chưa |
| Nội dung "Giáo dục địa phương" theo tỉnh | ❌ Đang là văn hoá chung — cần hỏi người dùng tỉnh nào |
| Cân bằng nhịp chơi mới (6 tiết/buổi, tối đa 1 khối / ~4 buổi = ~24 giờ thật nếu đúng hết) | ❓ Chưa có phản hồi người chơi |
| Multiplayer thật (server = tên trường, chat thật) | ❌ Để sau (người dùng chọn NPC trước) |
| Vai cô giáo chơi được, Phòng giáo viên có tính năng | ❌ Chờ multiplayer |

## Việc tiếp theo (theo thứ tự)

1. **[Người dùng]** Push bằng GitHub Desktop → chơi thử trên điện thoại (coco, cửa hàng, chọc bạn, góp ý, nhịp 6 giờ).
2. **[Người dùng]** Mua tên miền; tạo **project Supabase riêng** (region Singapore, bật Anonymous sign-ins) → gửi
   Project URL + anon key (KHÔNG gửi service_role); trả lời: multiplayer để hẳn sau hay làm bản nhẹ (câu chat có sẵn)?
   ai dùng trang quản trị (chỉ người dùng / cả giáo viên, người kiểm duyệt)?
3. Chuyển game sang **Cloudflare Pages** + tên miền (sớm, vì đổi link = người đã cài app phải cài lại). `_headers` đã có.
4. **Supabase S1–S3**: bảng + RLS + test RLS; đăng nhập (ẩn danh trước; khi thương mại cần số điện thoại); lưu tiến
   độ lên mạng (sửa lỗi iPhone mất tiến độ khi cài app); bảng `feedback` (insert-only) → điền `js/config.js`;
   chuyển ví coco (`economy.js`) lên server: số dư + sổ cái + mua hàng qua hàm DB/Edge Function, giới hạn kiếm/ngày.
5. **Trang quản trị** (xem `infrastructure.md`).
6. AI soạn câu hỏi → giáo viên duyệt (Cloudflare Worker + AI Gateway, giới hạn chi tiêu). Không cho AI chat tự do với trẻ.
7. Hỏi tỉnh cho "Giáo dục địa phương"; tìm giáo viên duyệt câu hỏi.
8. Tính năng khác: thêm câu hỏi; sự kiện (chào cờ, kiểm tra 15 phút, thi học kỳ); âm thanh nền; xếp hạng theo trường.
9. Multiplayer + chat thật (Supabase Realtime trước, Railway khi cần server riêng): lọc chat + báo cáo + chặn; trước khi
   bán coco cần xem lại pháp lý (game có người chơi tương tác = nhóm G1, khó xin phép nhất — chưa xác minh).
10. Thương mại (sau, có thể qua công ty Hồng Kông): pháp nhân, cổng thanh toán, Supabase Pro, giấy phép — người dùng tự
    tìm tư vấn.
