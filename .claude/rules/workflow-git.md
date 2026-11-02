# Quy trình làm việc và git

- Repo `E:\TruongHocOnline`: git riêng, nhánh `main`, remote `origin` = github.com/truong-hoc-online/TruongHocOnline
  (public).
- Git: `C:\Users\adminpc01\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`, `core.autocrlf false`.
- **Mỗi lần chỉnh xong → commit.** Người dùng tự push bằng GitHub Desktop. Mỗi lần push, GitHub Pages build lại mất
  khoảng 1–2 phút.
- Máy có: Python 3.14 (`C:\Python314`), Node 24, Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
- PowerShell 5: `Set-Content -Encoding utf8` thêm BOM. Ghi file bằng tool Write/Edit hoặc Node, không dùng Set-Content.
- Cuối mỗi phiên: cập nhật `.claude/rules/status-roadmap.md` (trạng thái, việc tiếp theo), `decisions.md` (nếu có
  quyết định mới) và thêm một mục vào đầu `.claude/rules/session-log.md`.
