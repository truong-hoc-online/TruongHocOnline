# Hạ tầng, backend và định hướng thương mại

## Hiện tại

- Host: GitHub Pages (repo public) — https://truong-hoc-online.github.io/TruongHocOnline/ (bật 2026-11-03).
  Pages cho repo private cần gói trả phí. Điều khoản GitHub Pages không dành cho trang chủ yếu để kinh doanh → khi
  thương mại phải ở host cho phép thương mại.
- Không có server: tiến độ, coco, hàng chờ góp ý đều lưu localStorage trên máy.

- **Supabase (từ 2026-11-04):** project `ahppbfhwhyiycxsusntj` (https://ahppbfhwhyiycxsusntj.supabase.co), org
  "Moter School 1" (Free, cùng tài khoản với durian nhưng org riêng), Singapore. Khoá **publishable** trong
  `js/config.js`. Đã chạy migrations 0000 + 0001 + seed; anonymous sign-ins bật. Migration mới phải chạy tay trong SQL
  Editor (chưa nối CLI). Free: tạm dừng sau ~1 tuần không dùng → Restore trong dashboard.

## Đã chốt (2026-11-03)

- **Phi thương mại trước**; bán coco + vật phẩm tính sau (có thể mở công ty ở Hồng Kông). Chưa có pháp nhân.
- **Host: Cloudflare** (Pages cho game + trang quản trị; Access khoá thêm trang quản trị; Workers + AI Gateway cho AI).
  Chuyển sớm kèm **tên miền riêng**, vì đổi link = người đã cài app phải cài lại. `_headers` đã sẵn.
- **Backend: Supabase**, **project riêng** (không dùng chung dự án khác; region Singapore; bật Anonymous sign-ins).
  Dùng cho: lưu tiến độ trên mạng (sửa lỗi iPhone: app đã cài không dùng chung localStorage với Safari), góp ý +
  duyệt mod, bảng xếp hạng theo trường, multiplayer + chat (Realtime). Chỉ đưa Project URL + anon key vào
  `js/config.js`; quyền do RLS khoá. Supabase Free tạm dừng sau ~1 tuần không dùng; khi thương mại cần Pro.
- **Railway để sau** (chỉ khi multiplayer cần server riêng). Netlify/Vercel không dùng cho game (Vercel Hobby cấm
  thương mại).

## Kế hoạch trang quản trị

Repo riêng Next.js + shadcn, xuất tĩnh (`output: 'export'`) lên Cloudflare Pages, khoá bằng Cloudflare Access; đăng
nhập Supabase + MFA; vai trò (admin / giáo viên / kiểm duyệt) kiểm ở RLS; mục Góp ý, Duyệt mod, Cửa hàng, Sổ cái coco,
Điều chỉnh (2 người duyệt), Nhật ký thao tác. Khuôn trang theo `E:\GitHub\durian-operadmin` (lọc trạng thái → bảng →
Modal xác nhận → flash; khoá khi đã chốt; giao diện chỉ ẩn nút, quyền thật kiểm ở server). **Không chép:** token trong
localStorage, thiếu test, sidebar không có giao diện điện thoại.

## Coco trên server (khi có Supabase)

Số dư + sổ cái do server giữ; mua hàng qua hàm DB/Edge Function (game chỉ gửi "mua món X"); giới hạn kiếm/ngày kiểm ở
server; nạp tiền (sau này) qua webhook cổng thanh toán → Edge Function kiểm chữ ký, mỗi giao dịch cộng một lần. Mua
hàng cần mạng; chơi/học vẫn offline.

## Pháp lý (chưa xác minh — người dùng cần tư vấn)

Theo hiểu biết, chưa tra lại: game bán vật phẩm ở VN cần doanh nghiệp + giấy phép/đăng ký theo loại game (chỉ NPC +
lưu server có lẽ là G2; có người chơi tương tác/chat = G1, khó nhất) theo NĐ 147/2024; xác thực tài khoản (số điện
thoại); giới hạn giờ chơi cho người dưới 18; dữ liệu trẻ em (NĐ 13/2023, Luật Bảo vệ dữ liệu cá nhân 2026); cổng
thanh toán (VNPay/MoMo/ZaloPay) cần pháp nhân. Gợi ý: bán coco ở bản NPC trước, multiplayer sau khi có giấy phép.
