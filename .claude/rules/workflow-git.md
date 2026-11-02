# Quy trình làm việc và git

- Repo `E:\TruongHocOnline`: git riêng, nhánh `main`, remote `origin` = github.com/truong-hoc-online/TruongHocOnline
  (public).
- Git: `C:\Users\adminpc01\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`, `core.autocrlf false`.
- **Mỗi lần chỉnh xong → commit.** Người dùng tự push bằng GitHub Desktop. Mỗi lần push, GitHub Pages build lại mất
  khoảng 1–2 phút.
- Máy có: Python 3.14 (`C:\Python314`), Node 24, Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- PowerShell 5: `Set-Content -Encoding utf8` thêm BOM. Ghi file bằng tool Write/Edit hoặc Node, không dùng Set-Content.
- **Cuối mỗi phiên, cập nhật `CLAUDE.md`** (bản đồ dự án + nhật ký tiến độ, người dùng yêu cầu luôn cập nhật):
  bảng Trạng thái (kèm commit), Việc tiếp theo cho phiên sau, Quyết định quan trọng của phiên (kèm lý do), và một mục
  mới ở đầu Nhật ký phiên. Quyết định mới cũng thêm vào `.claude/rules/decisions.md` (danh sách đầy đủ). Rules nào có
  thông tin thay đổi (bản đồ file, lối chơi, hạ tầng…) thì sửa đúng file đó.
