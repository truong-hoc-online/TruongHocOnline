# Công cụ: duyệt câu hỏi (segment A1 + Q2), kiểm mod + CI (A5)

Script Node (Node 24, không cần `npm install`), chạy từ thư mục gốc repo. Mục 1–3: giáo viên duyệt ngân hàng câu hỏi
`BANK` trong `js/subjects.js` bằng Excel / Google Sheets rồi nhập lại vào game. Mục 4: kiểm tra pack mod. Cuối: CI.

## 1. Xuất cho giáo viên — `export-questions.mjs`

```
node tools/export-questions.mjs [out.csv] [--delimiter ;] [--samples 10] [--blank 3] [--source js/subjects.js]
```

- Mặc định ghi `tools/out/questions-review.csv` và chép `tools/HUONG-DAN-DUYET.md` (hướng dẫn cho giáo viên) vào
  cùng thư mục. `tools/out/` nằm trong `.gitignore`.
- CSV: UTF-8 **có BOM** (Excel hiện đúng tiếng Việt), chuẩn RFC 4180, xuống dòng CRLF. `--delimiter ;` nếu Excel
  tiếng Việt của giáo viên dồn mọi thứ vào một cột.
- Mỗi câu một dòng: `ID` (ví dụ `van-001` = môn + số thứ tự trong `BANK`), Môn, Lớp tối thiểu (`g`, mặc định 6),
  Câu hỏi, Đáp án đúng (phần tử đầu của `a`), Sai 1–3, Nguồn, **Duyệt** (trống), các cột **Sửa …**, Ghi chú.
- Toán và Tiếng Anh do máy sinh: xuất ~10 câu **mẫu** mỗi lớp 6–9 (`Nguồn = tự sinh — mẫu`, cố định nhờ hạt giống
  ngẫu nhiên) để giáo viên xem — **không nhập lại được**. Mỗi môn có thêm 3 dòng trống `Mới` để đề xuất câu mới.
- Giá trị dễ bị Excel đổi thành ngày tháng (`1/6`, `2/9/1945`…) được ghi dạng `="1/6"` để giữ nguyên chữ.
- In bảng số câu mỗi môn và cảnh báo dữ liệu (đáp án trùng, lớp ngoài 6–9, câu hỏi trùng).

**ID chỉ ổn định giữa hai lần nhập:** xuất → giáo viên duyệt → nhập. Nếu `BANK` đã đổi (thêm/xoá câu) sau khi xuất,
hãy xuất lại file mới cho giáo viên, đừng dùng file cũ.

## 2. Nhập file đã duyệt — `import-questions.mjs`

```
node tools/import-questions.mjs <file-da-duyet.csv>            # chạy thử, chỉ in báo cáo
node tools/import-questions.mjs <file-da-duyet.csv> --write    # ghi vào js/subjects.js
node tools/import-questions.mjs <file.csv> --write --target <bản-sao/subjects.js>
```

- Đọc được: có/không BOM, phân cách `,` / `;` / tab (tự nhận theo dòng tiêu đề), ô có ngoặc kép, CRLF/LF. File
  không phải UTF-8 (Excel lưu "CSV" thường) → báo lỗi, nhờ lưu lại bằng "CSV UTF-8".
- Cột **Duyệt** (không phân biệt hoa thường / dấu):
  - `Đ` / `Đúng` / `OK` → giữ (nếu có ghi ở cột Sửa thì vẫn áp dụng);
  - `Sửa` → thay các ô có ghi ở cột "Sửa …"; ô trống giữ nguyên;
  - `Xoá` / `Xóa` → bỏ câu;
  - `S` / `Sai` / để trống → giữ nguyên, liệt kê trong báo cáo "chưa duyệt / sai cần xem".
  - Lớp tối thiểu sửa thẳng trong cột của nó.
- Dòng `Mới` có nội dung → thêm vào cuối môn đó (Toán / Tiếng Anh không có `BANK` → chỉ báo lại cho người lập trình).
- Mỗi câu sau khi áp dụng phải hợp lệ: câu hỏi không rỗng, **4 đáp án khác nhau, không rỗng**, lớp 6–9. Câu sửa
  không hợp lệ → giữ câu cũ; câu mới không hợp lệ → không thêm. Môn nào hết câu cho một lớp → không ghi file.
- `--write` chỉ viết lại khối `const BANK = { … }` (giữ nguyên mọi phần khác của file, cả comment trong `BANK`),
  đúng kiểu `{ q: '...', a: ['đúng', 'sai', 'sai', 'sai'], g: 8 }`, đáp án đúng đặt đầu, `g` bỏ khi là 6. Sau khi ghi
  tự nạp lại file để kiểm tra.
- Báo cáo: số câu giữ / sửa / xoá / thêm / không hợp lệ, danh sách chưa duyệt, ghi chú của giáo viên, góp ý cho câu
  tự sinh, cảnh báo (ID lạ, ID lặp, câu không có trong CSV…).

Sau khi `--write`: chạy fuzz câu hỏi (`tests/`), xem `git diff js/subjects.js`, commit, và bỏ dòng "CẦN giáo viên
duyệt" cho môn đã duyệt trong `.claude/rules/project-map.md` / README.

## 3. Kiểm tra công cụ — `test-roundtrip.mjs`

```
node tools/test-roundtrip.mjs
```

Làm trên bản sao tạm, không đụng `js/subjects.js` thật: xuất → nhập lại không đổi (BANK giống hệt về nội dung và
từng byte) → file phân cách `;` → mô phỏng giáo viên duyệt (Đ, Sửa, Xoá, S, Mới, sửa sai luật, đổi lớp).

## 4. Kiểm tra mod — `check-mod.mjs` (segment A5)

```
node tools/check-mod.mjs <pack.json | https://raw.githubusercontent.com/.../pack.json> [pack khác...]
node tools/test-check-mod.mjs     # tự kiểm: fixtures/bad-pack.json phải bị báo lỗi, mods/*.json phải đạt
```

- Chạy `validatePack` của game (import `js/items.js`) rồi kiểm thêm nội dung: link / tên miền, e-mail, dãy ≥ 9 chữ
  số (số điện thoại), từ cấm, giá > 500, id pack đã có ở `mods/`, tên file không đúng `[a-z0-9-]+.json` → **LỖI**,
  mã thoát 1. Link chỉ nhận `https://`.
- **CẢNH BÁO** (mã thoát 0): id món trùng `mods/base.json`; pack chưa có trong `mods/index.json` hoặc `FILES` của
  `sw.js`.
- In mọi chữ người chơi thấy (tên, mô tả, icon, nút, câu thoại) để người duyệt đọc theo `MODDING.md`; nhắc chạy
  `node supabase/gen-seed.mjs`.
- Danh sách từ cấm là **bản chép** `BAD_WORDS` trong `js/game.js` (không import được game.js trong Node): sửa một chỗ
  thì sửa cả chỗ kia.
- `fixtures/bad-pack.json`: pack hỏng có chủ ý (id sai, type lạ, trùng id, kind lạ, e-mail, link, số điện thoại, từ
  cấm, giá 9999) — dùng cho `test-check-mod.mjs` trong CI.

## CI trên GitHub — `.github/workflows/test.yml`

Mỗi push và Pull Request (ubuntu-latest, Node 24) chạy 2 job:

- **checks:** `node --check` mọi file JS → fuzz câu hỏi (500 lần) → `tests/unit.mjs` → `tools/test-roundtrip.mjs` →
  `check-mod` trên mọi `mods/*.json` (trừ `index.json`) → `test-check-mod.mjs` → `supabase/seed.sql` khớp
  `gen-seed.mjs` → `supabase/tests` (`npm ci` + `node rls.test.mjs`).
- **e2e:** `python -m http.server 8081` + `tests/e2e.mjs` ở 3 cỡ bằng Chrome headless có sẵn trên runner
  (`EDGE_PATH=/usr/bin/google-chrome`). Ảnh chụp + `results.json` tải về ở mục Artifacts của lần chạy
  (`e2e-screenshots`).

## File

| File | Vai trò |
|---|---|
| `export-questions.mjs` | Xuất CSV cho giáo viên |
| `import-questions.mjs` | Nhập CSV đã duyệt |
| `questions-lib.mjs` | Dùng chung: đọc/ghi CSV, tìm và ghi `BANK`, kiểm tra câu hỏi |
| `test-roundtrip.mjs` | Kiểm tra hai công cụ |
| `check-mod.mjs` | Kiểm tra pack mod trước khi nhận vào `mods/` |
| `test-check-mod.mjs`, `fixtures/bad-pack.json` | Kiểm tra `check-mod.mjs` (pack hỏng mẫu phải bị báo lỗi) |
| `HUONG-DAN-DUYET.md` | Hướng dẫn gửi kèm cho giáo viên |
| `package.json` | `{"type":"module"}` cho thư mục `tools/` |
