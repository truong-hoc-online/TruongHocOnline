# Quy trình làm việc và git

- Repo `E:\TruongHocOnline`: git riêng, nhánh `main`, remote `origin` = github.com/truong-hoc-online/TruongHocOnline
  (public).
- Git (**máy cũ**, tới 2026-11-04): `C:\Users\adminpc01\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`,
  `core.autocrlf false`. **Máy mới:** tìm lại đường dẫn (`Get-ChildItem $env:LOCALAPPDATA\GitHubDesktop -Recurse -Filter
  git.exe`) hoặc dùng `git` trong PATH nếu đã cài Git for Windows, rồi sửa dòng này (và các dòng tương tự bên
  `E:\DamTangOnline\CLAUDE.md`).
- Repo liên quan: `E:\GitHub\TruongHocOnline-Admin` (trang quản trị, private, chưa có remote tới 2026-11-04);
  `E:\DamTangOnline` là dự án **khác** (đọc CLAUDE.md riêng của nó).
- **Mỗi lần chỉnh xong → commit.** Người dùng tự push bằng GitHub Desktop. Mỗi lần push, GitHub Pages build lại mất
  khoảng 1–2 phút.
- Máy cũ có: Python 3.14 (`C:\Python314`), Node 24, Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`),
  **không** có Docker/Postgres/git trong PATH. Máy mới: kiểm lại, cập nhật dòng này.
- PowerShell 5: `Set-Content -Encoding utf8` thêm BOM. Ghi file bằng tool Write/Edit hoặc Node, không dùng Set-Content.
- **Cuối mỗi phiên, cập nhật `CLAUDE.md`** (bản đồ dự án + nhật ký tiến độ, người dùng yêu cầu luôn cập nhật):
  bảng Trạng thái (kèm commit), Việc tiếp theo cho phiên sau, Quyết định quan trọng của phiên (kèm lý do), và một mục
  mới ở đầu Nhật ký phiên. Quyết định mới cũng thêm vào `.claude/rules/decisions.md` (danh sách đầy đủ). Rules nào có
  thông tin thay đổi (bản đồ file, lối chơi, hạ tầng…) thì sửa đúng file đó.
