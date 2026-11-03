# Supabase cho Trường Học Online

Cơ sở dữ liệu cho: lưu tiến độ trên mạng + mã chuyển máy, hộp thư góp ý, ví coco + sổ cái, cửa hàng, bảng xếp hạng
theo trường, duyệt mod, nhân viên (admin / kiểm duyệt / giáo viên) cho trang quản trị.

```
migrations/20261103000000_init.sql   bảng + hàm + RLS (toàn bộ quyền)
seed.sql                             cửa hàng (shop_items), sinh từ mods/*.json bằng gen-seed.mjs
gen-seed.mjs                         node supabase/gen-seed.mjs  (chạy lại khi thêm đồ trong mods/)
tests/                               test RLS chạy bằng PGlite (Postgres trong Node, không cần Docker)
```

## Cài lên project (làm một lần, khi đã tạo project)

1. Supabase → **New project** (riêng cho game, region **Singapore**).
2. **Authentication → Sign In / Providers → Anonymous sign-ins: bật.** Nên bật thêm **CAPTCHA** (Cloudflare
   Turnstile) để chống tạo tài khoản ẩn danh hàng loạt.
3. **SQL Editor** → chạy lần lượt, mỗi file một query mới (dán toàn bộ → Run):
   1. `migrations/20261103000000_init.sql`
   2. `migrations/20261103000001_review_locks_audit.sql`
   3. `seed.sql`
4. **Project Settings → API**: gửi **Project URL** và khoá **anon / publishable** cho agent để điền `js/config.js`.
   **Không gửi, không dán vào code** khoá `service_role` / secret.
5. Tài khoản quản trị: **Authentication → Users → Add user** (email của bạn) → đăng nhập trang quản trị, bật MFA →
   trong SQL Editor:
   ```sql
   insert into public.staff (user_id, role, display_name)
   select id, 'admin', 'Tên bạn' from auth.users where email = 'email-cua-ban@...';
   ```
   Vai trò: `admin` (tất cả), `moderator` (góp ý, duyệt mod, ẩn tên xấu), `teacher` (chỉ góp ý loại "câu hỏi sai").
   Điều chỉnh coco cần **2 admin khác nhau** (một người đề nghị, người kia duyệt).

## Quy tắc quyền (tóm tắt)

| Bảng / hàm | Người chơi (đăng nhập ẩn danh) | Nhân viên (bắt buộc MFA) |
|---|---|---|
| `saves` | đọc/ghi **chỉ dòng của mình** | không xem |
| `profiles` | chỉ xem của mình; tự sinh từ save (không ghi tay) | admin/kiểm duyệt: xem, ẩn tên |
| `leaderboard()` | ai cũng gọi được; không lộ user_id; tên có từ cấm bị ẩn | |
| `feedback` | **chỉ gửi** (≤10/giờ), không đọc lại | duyệt: new → approved (cần sửa) → fixed / rejected / duplicate |
| `shop_items` | xem | admin sửa giá, bật/tắt (ghi nhật ký) |
| `coco_apply()` | kiếm ≤40 coco / 6 giờ (≤10 mỗi lần), mua theo giá server, mất ≤10, chuyển số dư cũ 1 lần ≤200 | |
| `wallets`, `coco_ledger` | chỉ xem của mình, không ghi trực tiếp | admin xem |
| `request_adjustment` / `decide_adjustment` | không | 2 admin khác nhau |
| `create_transfer_code` / `claim_transfer_code` | mã 8 ký tự, 15 phút, dùng 1 lần, ≤10 lần thử / giờ; **chuyển** dữ liệu sang máy mới | |
| `audit_log` | không | admin xem |

## Chạy test

```
cd supabase/tests
npm install
node rls.test.mjs
```

`stub.sql` giả lập phần Supabase có sẵn (vai trò anon/authenticated, `auth.uid()`, `auth.jwt()`, quyền mặc định
"grant all" của Supabase), nên test kiểm được việc migration đã thu hồi quyền mặc định.

## Đổi schema

Thêm file migration mới (không sửa file đã chạy trên project thật), thêm test vào `rls.test.mjs`, chạy lại test.
