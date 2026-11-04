# Quyết định quan trọng và lý do

Trước khi đổi một điều dưới đây, hỏi người dùng: đa số là lựa chọn của họ.

## Sản phẩm và lối chơi

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
| Đồng phục dự phòng mua bằng coco; chuyển lớp thì mẹ đổi miễn phí toàn bộ sang màu mới | Mua không bị mất giá trị khi lên lớp; vẫn có lý do mua (khỏi chờ giặt 15 phút) |
| Coco: chỉ bán đồ trang trí/vui, không bán điểm/hạnh kiểm, không gacha; giới hạn kiếm 40/ngày; mọi thay đổi qua `economy.js` + sổ cái | Trẻ em chơi; chuẩn bị chuyển số dư lên server mà không sửa chỗ gọi |
| Mod cộng đồng = file JSON dữ liệu trong `mods/`, gửi qua GitHub, người dùng duyệt; không cho nhập mod chạy code | Người dùng chọn; an toàn cho trẻ em, không cần server |
| Đồ chơi chọc phá chỉ với NPC, có hậu quả hạnh kiểm, không trong lớp/thư viện/với thầy cô | Game chống bắt nạt; trò nghịch phải nhẹ và có giới hạn |
| Tag "bị bắt nạt" = quyền được **bảo vệ** (Báo cô, giám thị đi theo, cô tư vấn, số 111), không biến bắt nạt thành trò chơi; Phòng tư vấn mở cho **mọi** người | Người chơi có thể là trẻ em; không khoá việc tìm giúp đỡ sau một tag |
| Cá biệt "dám" nói trong lớp/thư viện nhưng có thể bị nhắc; gỡ được khi hạnh kiểm ≥75 | Đúng ý người dùng (unlock cho cá biệt) mà vẫn có đường quay lại |
| Không đếm chuỗi ngày; hạnh kiểm hồi +3 mỗi buổi ngoan | Tránh để một lỗi nhỏ thành vòng luẩn quẩn khó thoát |
| Ảnh "Nhà Tù Online" chỉ tham khảo phong cách; tự dựng toàn bộ hình, tên NPC, bố cục | Không sao chép game có sẵn |

## Kỹ thuật và hạ tầng

| Quyết định | Lý do |
|---|---|
| Three.js r160 để sẵn trong repo, không CDN, không build | Chạy offline (PWA), dễ host tĩnh |
| **Ưu tiên điện thoại**: PWA + bố cục `body.touch` (cần điều khiển trái, nút phải, chạm-để-đi, chụm zoom) | Người dùng: "chủ yếu trên mobile" |
| Bảng cài hiện **ngay lần đầu**, trước khi tạo nhân vật, kèm cảnh báo; nút cài native chỉ gọi khi người dùng chạm | iPhone: app đã cài không dùng chung localStorage với Safari; `prompt()` ngoài thao tác chạm bị trình duyệt chặn |
| Trên cảm ứng: pixelRatio ≤ 1.5, shadow map 1024; camera lùi xa khi màn dọc; chỉ hiện nhãn lớp trên đầu học sinh **lớp khác** | Điện thoại rẻ chạy mượt, đỡ nóng; màn dọc nhìn ngang hẹp; nhãn dày đặc che màn hình |
| `display: fullscreen`, `orientation: any` | Game cần toàn màn hình; chơi được cả dọc lẫn ngang |
| Host GitHub Pages, repo public (tạm thời) | Miễn phí, có HTTPS (bắt buộc cho SW + cài app); repo chỉ có mã nguồn. Pages cho repo private cần gói trả phí |
| Tiến độ lưu localStorage (không mã hoá), lưu thêm khi trang bị ẩn (`visibilitychange`) | Dữ liệu game, không nhạy cảm; điện thoại hay tắt app đột ngột |
| **Định hướng thương mại (2026-11-03): bán coco + vật phẩm** — CHỐT: **phi thương mại trước**, tính sau (có thể công ty Hồng Kông); chưa có pháp nhân. Host: **Cloudflare** | Người dùng chọn. Cần: số dư coco do server giữ, chỉ bán đồ trang trí, không gacha, giới hạn chi tiêu trẻ em; pháp lý VN chưa xác minh, người dùng cần tư vấn |
| Backend = **Supabase** (project riêng); game giữ host tĩnh; **Railway để sau** (chỉ khi multiplayer cần server riêng); Netlify/Vercel không dùng cho game | Supabase gọi thẳng từ trình duyệt, đủ cho lưu tiến độ / góp ý / xếp hạng / realtime; Vercel Hobby cấm thương mại |
| Góp ý gửi vào **Supabase** (bảng `feedback`), hàng chờ trên máy khi offline — thay Google Form | Người dùng chọn Supabase cho "hộp thư góp ý + duyệt mod"; không cần tài khoản Google, xem được trong trang quản trị |
| Trang quản trị: Next.js theo mẫu `E:\GitHub\durian-operadmin` (chỉ tham khảo, không sửa repo đó), host cho phép thương mại | Người dùng quen bộ công cụ này |
| Quy tắc cho Claude tách vào `.claude/rules/` (mỗi file một chủ đề; PWA / mod-kinh tế / kiểm thử nạp theo `paths`) | Người dùng yêu cầu; CLAUDE.md một file quá dài (>200 dòng) |
| Coco trên server: kiếm ≤40 / **6 giờ trượt** (≤10/lần), mua theo giá server, mất ≤10/lần; số dư cũ trên máy chuyển lên **1 lần, ≤200**; op có `op_id` để gửi lại không cộng 2 lần (2026-11-03, Claude chọn, đã báo người dùng) | Server không tin được bộ đếm "ngày" của máy; 6 giờ = 1 buổi học |
| Mã chuyển máy 8 ký tự, 15 phút, 1 lần, ≤10 lần thử/giờ; **chuyển** (không sao chép) save + coco, máy cũ về màn hình đầu | Sửa lỗi iPhone (app không chung localStorage với Safari) mà không nhân đôi coco |
| Góp ý chỉ gửi khi đã đăng nhập ẩn danh, ≤10/giờ; duyệt: new → approved (cần sửa) → fixed/rejected/duplicate; đã chốt thì chỉ admin mở lại; nút "📋 Xuất cho Claude" | Người dùng muốn duyệt báo lỗi rồi đưa Claude sửa |
| Nhân viên (admin/moderator/teacher) bắt buộc MFA (`aal2`) mới có quyền; điều chỉnh coco cần 2 admin; trang quản trị giữ phiên trong sessionStorage | An toàn dữ liệu trẻ em; không lặp điểm yếu token localStorage của durian-operadmin |
| Test SQL/RLS bằng PGlite (Postgres trong Node) + `stub.sql` giả lập Supabase | Máy không có Docker/Postgres |
| Câu hỏi do AI soạn chỉ nằm ở `questions/drafts/`; `import-questions` chỉ nhập dòng Nguồn "AI…" khi giáo viên ghi Đ/Sửa | child-safety: nội dung AI cho học sinh phải có người duyệt |
| Agent song song: mỗi segment một git worktree `E:\TruongHocOnline-wt\<tên>` + nhánh `seg/<tên>` + cổng test riêng; phiên chính gộp, chạy đủ test, tăng `VERSION` một lần mỗi đợt | Tránh giẫm file/cổng; người dùng muốn chia việc cho nhiều agent |
| Nút 🔊 có 3 chế độ (Bật / Chỉ hiệu ứng / Tắt); vào lớp = trống trường, ra chơi = trống 2 tiếng, sao đỏ bắt = còi; âm thanh tạo bằng WebAudio (không file) | Nhẹ cho PWA offline; agent A3 chọn, cần người dùng nghe thử |
| Trang quản trị ở repo riêng `E:\GitHub\TruongHocOnline-Admin` | Tách khỏi game (host tĩnh khác, có Cloudflare Access) |
| Supabase thật: project `ahppbfhwhyiycxsusntj`, org riêng "Moter School 1" (cùng tài khoản durian); khoá publishable công khai trong `js/config.js` (2026-11-04) | Người dùng chọn dùng chung tài khoản; khoá publishable an toàn khi RLS đúng |
| E2E chặn gọi Supabase thật (`E2E_LIVE=1` bỏ chặn) | Không tạo dữ liệu giả trong database thật |
| Trang quản trị deploy Cloudflare Pages + Access, **không Vercel** | Vercel Hobby cấm thương mại; Access miễn phí |
| **CLAUDE.md = bản đồ dự án + nhật ký tiến độ** (trạng thái, việc tiếp theo, quyết định của phiên, nhật ký), luôn cập nhật cuối phiên; rules giữ quy tắc theo chủ đề | Người dùng yêu cầu rõ; trạng thái/nhật ký chỉ ở một nơi để không lệch nhau |
