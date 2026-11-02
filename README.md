# 🏫 Trường Học Online

Game 3D trên trình duyệt: đi học mỗi ngày, học đủ 12 môn theo chương trình THCS (GDPT 2018) để lên lớp,
từ lớp 6 đến lớp 9. Bản thử nghiệm chơi một mình với bạn học NPC; tiến độ lưu trên máy (localStorage).

## Chạy thử

Nhấp đúp `chay.bat` (cần Python), trình duyệt mở `http://localhost:8081/`.
Không mở trực tiếp file `index.html`, vì ES module cần chạy qua http.

Điều khiển: W A S D / mũi tên · E hoặc Space để tương tác · Enter để chat · lăn chuột để zoom.
Điện thoại: cần điều khiển trên màn hình + nút vàng.

## Lối chơi

**Server = tên trường** (THCS Hoa Phượng, Ánh Dương…). **Một ngày có 4 giai đoạn:**

| Giai đoạn | Việc |
|---|---|
| 🌅 Chuẩn bị đến trường | Ăn sáng, mặc đồng phục, đeo khăn quàng đỏ, soạn cặp, mang đồ ăn. Đồng hồ chạy; ra khỏi nhà sau 6:45 là trễ. Sao đỏ ở cổng ghi tên nếu trễ hoặc thiếu đồ |
| 🏫 Tại trường | 4 tiết, mỗi tiết 3 câu trắc nghiệm của môn đó. Giữa tiết 2 và 3 là ra chơi (căng tin, đá cầu, thư viện). Không vào lớp kịp là muộn; không vào hẳn là trốn tiết |
| 🔔 Tan trường | Về thẳng nhà, hoặc lêu lổng (ăn vặt, đá cầu, tụ tập): vui hơn nhưng trừ hạnh kiểm và bớt lượt việc buổi tối |
| 🌙 Buổi tối | 4 lượt việc: học bài (lấy thêm điểm), giặt đồng phục, nghỉ ngơi, điện thoại… soạn cặp. Lên giường để sang ngày mới |

**Lên lớp:** mỗi môn cần 5 điểm (mỗi câu đúng 1 điểm). Đủ 12 môn và hạnh kiểm từ Trung bình thì lên lớp.
Câu hỏi khó dần theo lớp.

**Khu vực không được nói chuyện:** lớp học, thư viện. Học sinh cá biệt thì "dám" nói, nhưng có thể bị nhắc.

**Danh hiệu (tag) và khu vực riêng:**

| Tag | Cách có | Quyền |
|---|---|---|
| 🌟 Học sinh giỏi | Đúng từ 80% (≥ 15 câu), hạnh kiểm từ 80 | Phòng học sinh giỏi: thử thách nhân đôi điểm |
| 🎗️ Lớp trưởng | Từ ngày 3, hạnh kiểm từ 85, đúng từ 60% | Phòng Đội (họp cán sự, sổ đầu bài), nút "Giữ trật tự" |
| 😎 Cá biệt | Hạnh kiểm dưới 60 / trễ 3 lần / lêu lổng 4 lần | Nói chuyện trong lớp và thư viện, Góc sau căng tin. Hạnh kiểm lên 75 thì hết |
| 🛡️ Bị bắt nạt | Gặp sự kiện bị bắt nạt lúc ra chơi | Nút "Báo cô", thầy giám thị bảo vệ, cô Thu ở Phòng tư vấn. Kèm số 111 ngoài đời |
| 👩‍🏫 Cô giáo | Chưa có (dành cho bản nhiều người chơi) | Phòng giáo viên |

Phòng tư vấn mở cho **mọi** học sinh: không bao giờ khoá việc tìm giúp đỡ sau một tag.

## Trước khi phát hành rộng

- [ ] Giáo viên duyệt câu hỏi trong `js/subjects.js`. Môn *Giáo dục địa phương* đang là kiến thức văn hoá chung;
      mỗi tỉnh có sách riêng nên cần thay theo tỉnh.
- [ ] Thử trên điện thoại thật.
- [ ] Bản nhiều người chơi: server WebSocket, lọc chat kỹ hơn, nút báo cáo, chính sách cho người dùng dưới 16 tuổi.

Three.js r160 (MIT) được để sẵn ở `js/vendor/`, không cần CDN.
