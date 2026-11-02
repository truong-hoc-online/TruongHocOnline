# Nhật ký phiên

Mới nhất ở trên. Mỗi phiên một mục ngắn: yêu cầu của người dùng, đã chọn gì, đã làm gì (commit), còn treo gì.

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
  MODDING.md, `_headers`, save v3, SW `tho-v5`; unit 24 + E2E 54 × 3 cỡ đạt (commit `6e35dcb`). Cuối phiên: tách
  CLAUDE.md thành `.claude/rules/` theo đặc tả Claude Code. Còn treo: Supabase URL/key, tên miền, ai dùng trang quản
  trị, multiplayer sớm hay muộn, tỉnh, duyệt câu hỏi.
- **2026-11-02 · máy bàn** (phiên mở từ workspace `E:\KhuVuonTamAn`) — Người dùng muốn "trường học online" dựa trên
  đi chùa online, kèm ảnh *Nhà Tù Online* làm mẫu phong cách. Hỏi 4 điểm → chọn: thư mục riêng, NPC trước, trắc
  nghiệm thật, lớp 6–9. Làm MVP (Three.js r160 vendor; trường 3D, nhà riêng, ~35 NPC, 4 giai đoạn, 12 môn, 5 tag,
  bắt nạt hướng hỗ trợ), fuzz câu hỏi (sửa lỗi đáp án trùng ở phân số/luỹ thừa), E2E Edge headless, commit
  `dc056c6`. Người dùng gửi ảnh bảng "Cài trên iPhone" + "chủ yếu trên mobile" → làm PWA (manifest, icon PNG, SW
  offline), bảng cài iPhone/Android, bố cục cảm ứng, chạm-để-đi, chụm zoom, giảm đồ hoạ; E2E giả lập iPhone; commit
  `092da41`. Còn treo: người dùng chơi thử, publish GitHub Pages, thử điện thoại thật, duyệt câu hỏi, chọn tỉnh.
