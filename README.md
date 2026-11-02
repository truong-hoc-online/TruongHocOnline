# 🏫 Trường Học Online

Game 3D trên trình duyệt: đi học mỗi ngày, học đủ 12 môn theo chương trình THCS (GDPT 2018) để lên lớp,
từ lớp 6 đến lớp 9. Bản thử nghiệm chơi một mình với bạn học NPC; tiến độ lưu trên máy (localStorage).

## Chạy thử

Nhấp đúp `chay.bat` (cần Python), trình duyệt mở `http://localhost:8081/`.
Không mở trực tiếp file `index.html`, vì ES module cần chạy qua http.

Điều khiển: W A S D / mũi tên · E hoặc Space để tương tác · Enter để chat · lăn chuột để zoom.
Điện thoại: cần điều khiển trên màn hình + nút vàng.

## Chơi trên điện thoại (chính)

Game là PWA: mở link bằng Safari (iPhone) hoặc Chrome (Android), một bảng hướng dẫn **"Cài trên iPhone / Android"**
sẽ hiện ra. Cài xong thì mở từ biểu tượng **Trường Học**: toàn màn hình, chơi được khi không có mạng.
Trên iPhone, tiến độ trong Safari **không** chuyển sang app đã cài, nên cài trước rồi mới tạo nhân vật.

Cài app cần **HTTPS**, nên phải đưa lên host (ví dụ GitHub Pages). `chay.bat` chỉ để thử trên máy tính.

Cảm ứng: cần điều khiển (trái dưới) hoặc chạm xuống đất để đi · nút vàng (phải dưới) để tương tác ·
💬 để chat · chụm/mở 2 ngón để zoom · chạm tên trường để thu gọn bảng thông tin.

## Lối chơi

**Server = tên trường** (THCS Hoa Phượng, Ánh Dương…). Game chạy theo **giờ thật**: mỗi buổi ở trường dài
**6 tiếng**, rồi về nhà chuẩn bị cho buổi sau. Thoát game giữa chừng không sao, vào lại là tiếp tục đúng chỗ;
nếu đã quá 6 tiếng thì coi như đã tan trường và về nhà.

| Giai đoạn | Việc |
|---|---|
| 🏠 Ở nhà chuẩn bị | Không giới hạn giờ. Ăn sáng (cơm trắng; sắp có món mua bằng tiền coco), **giặt đồ nếu dơ: 15 phút thật** (thoát game vẫn giặt), mặc đồng phục đúng màu lớp, khăn quàng đỏ, soạn cặp, mang đồ ăn. Sao đỏ ở cổng ghi tên nếu thiếu đồ |
| 🏫 Tại trường | 6 tiết, mỗi tiết 3 câu trắc nghiệm. Ra chơi sau tiết 2 và tiết 4 (căng tin, đá cầu, thư viện). Không vào lớp kịp là muộn; không vào hẳn là trốn tiết. Học xong thì tự do ở trường tới giờ tan |
| 🔔 Tan trường | Về thẳng nhà, hoặc lêu lổng (ăn vặt, đá cầu, tụ tập): vui hơn nhưng trừ hạnh kiểm; ở lại quá 3 phút thì mẹ gọi về |

**Đồ dơ:** mặc cả buổi thì đồng phục dơ. Mặc đồ dơ đi học không bị trừ ngay; chỉ khi **sao đỏ** (ở cổng) hoặc
**thầy giám thị** (đi quanh sân) bắt gặp mới bị trừ 3 hạnh kiểm, tối đa 1 lần mỗi buổi.

**Lớp và lên lớp:** mỗi khối có 4 lớp, mỗi lớp 3 môn và một màu đồng phục. Học xong 3 môn thì chuyển lớp:

| Lớp | Môn | Áo |
|---|---|---|
| A1 | Toán · Khoa học tự nhiên · Tin học | xanh dương |
| A2 | Ngữ văn · Lịch sử và Địa lý · GDCD | đỏ đô |
| A3 | Tiếng Anh · Công nghệ · Trải nghiệm, hướng nghiệp | xanh lá |
| A4 | Giáo dục thể chất · Nghệ thuật · Giáo dục địa phương | cam |

Mỗi môn cần 5 điểm (mỗi câu đúng 1 điểm). Xong lớp A4 (đủ 12 môn) và hạnh kiểm từ Trung bình thì lên khối trên
(6A4 → 7A1 …). Câu hỏi khó dần theo lớp.

**Coco 🥥 và cửa hàng:** kiếm coco khi trả lời đúng (+1/câu), học xong môn (+5), một buổi ngoan (+5), tối đa
40 coco/ngày. Tiêu vào:
- đồ ăn sáng ở bàn ăn: cơm trắng miễn phí; hủ tiếu, cơm sườn, phở… thêm năng lượng và tâm trạng;
- căng tin ở trường;
- 🛒 cửa hàng online ở bàn học: đồng phục dự phòng (khỏi chờ giặt), phụ kiện (mũ, nơ, kính, băng đô), đồ chơi.

Bản này **chưa bán coco bằng tiền thật**.

**Đồ chơi chọc bạn:** bỏ vào cặp ở nhà (tối đa 2 loại). Lúc ra chơi, lại gần bạn để xịt nước, dính kẹo, phun trân
châu, bắn pháo giấy. Không dùng được trong lớp, thư viện, với thầy cô. Thầy cô hoặc sao đỏ bắt gặp thì bị tịch thu
và trừ hạnh kiểm; chọc mãi một bạn thì bạn ấy mách cô, vì như vậy là bắt nạt.

**Hộp thư góp ý 📮:** nút trên màn hình hoặc hộp thư cạnh cổng trường. Báo câu hỏi sai, chỗ bị kẹt, lỗi game; game
tự gửi kèm lớp, vị trí và câu hỏi vừa gặp. Chưa có máy chủ thì góp ý được giữ trên máy, chờ gửi.

**Mod:** đồ ăn, đồng phục, phụ kiện, đồ chơi đều là file dữ liệu trong `mods/`. Cộng đồng có thể làm thêm; xem
[MODDING.md](MODDING.md).

**Khu vực không được nói chuyện:** lớp học, thư viện. Học sinh cá biệt thì "dám" nói, nhưng có thể bị nhắc.

**Danh hiệu (tag) và khu vực riêng:**

| Tag | Cách có | Quyền |
|---|---|---|
| 🌟 Học sinh giỏi | Đúng từ 80% (≥ 15 câu), hạnh kiểm từ 80 | Phòng học sinh giỏi: thử thách nhân đôi điểm |
| 🎗️ Lớp trưởng | Từ ngày 3, hạnh kiểm từ 85, đúng từ 60% | Phòng Đội (họp cán sự, sổ đầu bài), nút "Giữ trật tự" |
| 😎 Cá biệt | Hạnh kiểm dưới 60 / vào lớp muộn 3 lần / lêu lổng 4 lần / chọc bạn 6 lần | Nói chuyện trong lớp và thư viện, Góc sau căng tin. Hạnh kiểm lên 75 thì hết |
| 🛡️ Bị bắt nạt | Gặp sự kiện bị bắt nạt lúc ra chơi | Nút "Báo cô", thầy giám thị bảo vệ, cô Thu ở Phòng tư vấn. Kèm số 111 ngoài đời |
| 👩‍🏫 Cô giáo | Chưa có (dành cho bản nhiều người chơi) | Phòng giáo viên |

Phòng tư vấn mở cho **mọi** học sinh: không bao giờ khoá việc tìm giúp đỡ sau một tag.

## Trước khi phát hành rộng

- [ ] Giáo viên duyệt câu hỏi trong `js/subjects.js`. Môn *Giáo dục địa phương* đang là kiến thức văn hoá chung;
      mỗi tỉnh có sách riêng nên cần thay theo tỉnh.
- [ ] Thử trên điện thoại thật.
- [ ] Bản nhiều người chơi: server WebSocket, lọc chat kỹ hơn, nút báo cáo, chính sách cho người dùng dưới 16 tuổi.

Three.js r160 (MIT) được để sẵn ở `js/vendor/`, không cần CDN.
