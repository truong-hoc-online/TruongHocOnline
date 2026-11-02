// Subjects of the Vietnamese lower-secondary curriculum (GDPT 2018, grades 6–9) and a question bank.
// Every fixed question lists the CORRECT answer FIRST in `a`; options are shuffled when shown.
// `g` = minimum grade (optional). Content should be reviewed by a teacher before wide release.

export const SUBJECTS = [
  { id: 'toan', name: 'Toán học', icon: '📐', teacher: 'Cô Hạnh' },
  { id: 'van', name: 'Ngữ văn', icon: '📖', teacher: 'Cô Mai' },
  { id: 'anh', name: 'Tiếng Anh', icon: '🔤', teacher: 'Thầy Nam' },
  { id: 'khtn', name: 'Khoa học tự nhiên', icon: '🔬', teacher: 'Thầy Phúc' },
  { id: 'su-dia', name: 'Lịch sử và Địa lý', icon: '🌏', teacher: 'Cô Thảo' },
  { id: 'gdcd', name: 'Giáo dục công dân', icon: '🤝', teacher: 'Cô Hiền' },
  { id: 'cong-nghe', name: 'Công nghệ', icon: '🔧', teacher: 'Thầy Long' },
  { id: 'tin', name: 'Tin học', icon: '💻', teacher: 'Thầy Khoa' },
  { id: 'the-duc', name: 'Giáo dục thể chất', icon: '⚽', teacher: 'Thầy Dũng' },
  { id: 'nghe-thuat', name: 'Nghệ thuật', icon: '🎨', teacher: 'Cô Ngân' },
  { id: 'trai-nghiem', name: 'Trải nghiệm, hướng nghiệp', icon: '🧭', teacher: 'Cô Hạnh' },
  { id: 'dia-phuong', name: 'Giáo dục địa phương', icon: '🏮', teacher: 'Cô Thảo' },
];

export const POINTS_TO_PASS = 5; // correct answers needed to finish a subject in one grade

const BANK = {
  van: [
    { q: 'Tác giả của "Truyện Kiều" là ai?', a: ['Nguyễn Du', 'Nguyễn Trãi', 'Hồ Xuân Hương', 'Nguyễn Đình Chiểu'] },
    { q: 'Bài thơ "Bánh trôi nước" là của ai?', a: ['Hồ Xuân Hương', 'Bà Huyện Thanh Quan', 'Nguyễn Khuyến', 'Tú Xương'] },
    { q: '"Lục Vân Tiên" là tác phẩm của ai?', a: ['Nguyễn Đình Chiểu', 'Nguyễn Du', 'Phạm Tiến Duật', 'Nguyễn Trãi'], g: 8 },
    { q: '"Thánh Gióng" thuộc thể loại nào?', a: ['Truyền thuyết', 'Truyện cười', 'Ngụ ngôn', 'Thơ lục bát'] },
    { q: '"Sọ Dừa" thuộc thể loại nào?', a: ['Truyện cổ tích', 'Truyền thuyết', 'Tiểu thuyết', 'Kí'] },
    { q: 'Thể thơ có cặp câu 6 chữ và 8 chữ gọi là gì?', a: ['Lục bát', 'Thất ngôn bát cú', 'Ngũ ngôn', 'Song thất lục bát'] },
    { q: 'Từ nào là từ láy?', a: ['Lấp lánh', 'Bàn ghế', 'Sách vở', 'Hoa quả'] },
    { q: '"Ông mặt trời thức dậy" dùng biện pháp tu từ nào?', a: ['Nhân hoá', 'So sánh', 'Hoán dụ', 'Nói quá'] },
    { q: '"Thân em như chẽn lúa đòng đòng" dùng biện pháp nào?', a: ['So sánh', 'Nhân hoá', 'Điệp ngữ', 'Liệt kê'] },
    { q: '"Bình Ngô đại cáo" do ai viết?', a: ['Nguyễn Trãi', 'Lý Thường Kiệt', 'Trần Hưng Đạo', 'Lê Lợi'], g: 8 },
    { q: 'Truyện ngắn "Chiếc lược ngà" của ai?', a: ['Nguyễn Quang Sáng', 'Kim Lân', 'Nam Cao', 'Tô Hoài'], g: 9 },
    { q: '"Dế Mèn phiêu lưu kí" là của nhà văn nào?', a: ['Tô Hoài', 'Nam Cao', 'Ngô Tất Tố', 'Thạch Lam'] },
  ],
  khtn: [
    { q: 'Công thức hoá học của nước là gì?', a: ['H₂O', 'CO₂', 'O₂', 'NaCl'] },
    { q: 'Đơn vị đo lực là gì?', a: ['Niutơn (N)', 'Mét (m)', 'Kilôgam (kg)', 'Jun (J)'] },
    { q: 'Bộ phận chủ yếu thực hiện quang hợp ở cây là gì?', a: ['Lá', 'Rễ', 'Thân', 'Hoa'] },
    { q: 'Ở áp suất tiêu chuẩn, nước sôi ở bao nhiêu độ?', a: ['100 °C', '0 °C', '50 °C', '37 °C'] },
    { q: 'Đơn vị cấu tạo cơ bản của sự sống là gì?', a: ['Tế bào', 'Nguyên tử', 'Mô', 'Cơ quan'] },
    { q: 'Kim loại nào ở thể lỏng ở nhiệt độ thường?', a: ['Thuỷ ngân', 'Sắt', 'Đồng', 'Nhôm'] },
    { q: 'Con người hô hấp cần lấy khí nào?', a: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'] },
    { q: 'Công thức tính tốc độ là gì?', a: ['v = s / t', 'v = s · t', 'v = t / s', 'v = s + t'], g: 7 },
    { q: 'Cơ quan nào bơm máu đi khắp cơ thể?', a: ['Tim', 'Phổi', 'Gan', 'Dạ dày'], g: 8 },
    { q: 'Kí hiệu hoá học của sắt là gì?', a: ['Fe', 'S', 'Si', 'Ag'] },
    { q: 'Dung dịch có pH nhỏ hơn 7 có tính gì?', a: ['Acid', 'Base', 'Trung tính', 'Muối'], g: 8 },
    { q: 'Ánh sáng truyền nhanh nhất trong môi trường nào?', a: ['Chân không', 'Nước', 'Thuỷ tinh', 'Không khí ẩm'] },
  ],
  'su-dia': [
    { q: 'Ai lãnh đạo chiến thắng Bạch Đằng năm 938?', a: ['Ngô Quyền', 'Trần Hưng Đạo', 'Lê Hoàn', 'Lý Thường Kiệt'] },
    { q: 'Chiến thắng Điện Biên Phủ diễn ra năm nào?', a: ['1954', '1945', '1975', '1930'], g: 9 },
    { q: 'Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập ngày nào?', a: ['2/9/1945', '19/8/1945', '30/4/1975', '7/5/1954'] },
    { q: 'Khởi nghĩa Hai Bà Trưng nổ ra năm nào?', a: ['Năm 40', 'Năm 938', 'Năm 1010', 'Năm 248'] },
    { q: 'Vua Lý Công Uẩn dời đô về Thăng Long năm nào?', a: ['1010', '1009', '1226', '1428'], g: 7 },
    { q: 'Vua Quang Trung đại phá quân Thanh năm nào?', a: ['1789', '1771', '1802', '1858'], g: 8 },
    { q: 'Đại dương lớn nhất thế giới là gì?', a: ['Thái Bình Dương', 'Đại Tây Dương', 'Ấn Độ Dương', 'Bắc Băng Dương'] },
    { q: 'Đỉnh núi cao nhất Việt Nam là gì?', a: ['Phan Xi Păng', 'Bà Đen', 'Ngọc Linh', 'Tây Côn Lĩnh'] },
    { q: 'Việt Nam nằm ở khu vực nào?', a: ['Đông Nam Á', 'Nam Á', 'Đông Á', 'Trung Á'] },
    { q: 'Châu lục rộng lớn nhất là châu nào?', a: ['Châu Á', 'Châu Phi', 'Châu Mỹ', 'Châu Âu'] },
    { q: 'Kinh tuyến gốc (0°) đi qua đài thiên văn nào?', a: ['Greenwich (Luân Đôn)', 'Paris', 'Bắc Kinh', 'Washington'] },
    { q: 'Quần đảo Trường Sa thuộc tỉnh nào của Việt Nam?', a: ['Khánh Hoà', 'Quảng Ngãi', 'Bình Định', 'Phú Yên'] },
  ],
  gdcd: [
    { q: 'Ngày Quốc tế Thiếu nhi là ngày nào?', a: ['1/6', '1/5', '20/11', '8/3'] },
    { q: 'Ngày Nhà giáo Việt Nam là ngày nào?', a: ['20/11', '20/10', '1/6', '26/3'] },
    { q: 'Khi thấy bạn bị bắt nạt, em nên làm gì?', a: ['Báo thầy cô hoặc người lớn tin cậy', 'Đứng xem cho vui', 'Quay video đăng mạng', 'Làm như không thấy'] },
    { q: 'Tổng đài quốc gia bảo vệ trẻ em là số nào?', a: ['111', '113', '114', '1080'] },
    { q: 'Tiết kiệm là gì?', a: ['Sử dụng hợp lí của cải, thời gian, sức lực', 'Không bao giờ tiêu tiền', 'Chỉ mua đồ rẻ nhất', 'Không giúp đỡ ai'] },
    { q: 'Biểu hiện nào thể hiện sự tôn trọng người khác?', a: ['Lắng nghe ý kiến của bạn', 'Ngắt lời khi bạn đang nói', 'Chế giễu ngoại hình', 'Tự ý lục cặp của bạn'] },
    { q: 'Văn bản có hiệu lực pháp lí cao nhất ở Việt Nam là gì?', a: ['Hiến pháp', 'Nghị định', 'Thông tư', 'Nội quy trường'], g: 9 },
    { q: 'Khi đi xe đạp, việc làm nào đúng luật?', a: ['Đi bên phải, không dàn hàng ngang', 'Buông cả hai tay', 'Đi vào đường cấm', 'Kéo đẩy xe khác'] },
    { q: 'Làm vỡ đồ của bạn, cách cư xử trung thực là gì?', a: ['Nhận lỗi và xin lỗi bạn', 'Đổ lỗi cho người khác', 'Giấu đi', 'Im lặng bỏ đi'] },
    { q: 'Mật khẩu tài khoản mạng xã hội nên được xử lí thế nào?', a: ['Giữ bí mật, không chia sẻ', 'Đưa cho bạn mới quen', 'Đăng lên trang cá nhân', 'Dán ở bàn học trên lớp'] },
  ],
  'cong-nghe': [
    { q: 'Nhóm thực phẩm nào giàu chất đạm?', a: ['Thịt, cá, trứng', 'Gạo, ngô, khoai', 'Dầu, mỡ', 'Rau xanh'] },
    { q: 'Bảo quản thực phẩm trong tủ lạnh nhằm mục đích gì?', a: ['Làm chậm vi khuẩn phát triển', 'Làm thức ăn ngon hơn', 'Tăng chất dinh dưỡng', 'Làm thức ăn chín'] },
    { q: 'Thiết bị nào biến điện năng thành quang năng?', a: ['Bóng đèn', 'Quạt điện', 'Nồi cơm điện', 'Máy bơm nước'] },
    { q: 'Vật liệu nào dẫn điện tốt?', a: ['Đồng', 'Nhựa', 'Gỗ khô', 'Cao su'] },
    { q: 'Cầu chì trong mạch điện có tác dụng gì?', a: ['Bảo vệ mạch khi quá tải, ngắn mạch', 'Làm đèn sáng hơn', 'Tăng điện áp', 'Tiết kiệm điện'], g: 8 },
    { q: 'Hình chiếu đứng có hướng chiếu như thế nào?', a: ['Từ trước tới', 'Từ trên xuống', 'Từ trái sang', 'Từ dưới lên'], g: 8 },
    { q: 'Việc nào giúp tiết kiệm điện trong gia đình?', a: ['Tắt đèn khi ra khỏi phòng', 'Mở tủ lạnh liên tục', 'Bật điều hoà 16 °C cả ngày', 'Để tivi chờ cả đêm'] },
    { q: 'Vai trò chính của nhà ở là gì?', a: ['Nơi trú ngụ, bảo vệ con người', 'Chỉ để trang trí', 'Nơi làm việc của mọi người', 'Chỉ để cất đồ'] },
    { q: 'Cây trồng cần yếu tố nào để phát triển?', a: ['Ánh sáng, nước, chất dinh dưỡng', 'Chỉ cần nước', 'Chỉ cần bóng tối', 'Chỉ cần phân bón'] },
  ],
  tin: [
    { q: '1 byte bằng bao nhiêu bit?', a: ['8 bit', '2 bit', '10 bit', '16 bit'] },
    { q: 'Thiết bị nào là thiết bị vào (nhập dữ liệu)?', a: ['Bàn phím', 'Màn hình', 'Loa', 'Máy in'] },
    { q: 'Thiết bị nào là thiết bị ra (xuất dữ liệu)?', a: ['Máy in', 'Chuột', 'Bàn phím', 'Micro'] },
    { q: 'Phím tắt sao chép (copy) là gì?', a: ['Ctrl + C', 'Ctrl + V', 'Ctrl + Z', 'Ctrl + P'] },
    { q: 'Thuật toán là gì?', a: ['Dãy các bước để giải quyết bài toán', 'Một loại máy tính', 'Một phần mềm diệt virus', 'Tên một ngôn ngữ'] },
    { q: 'Đơn vị nào lớn nhất?', a: ['GB', 'MB', 'KB', 'Byte'] },
    { q: 'Nhận được email lạ có tệp đính kèm, em nên làm gì?', a: ['Không mở, hỏi người lớn', 'Mở ngay xem có gì', 'Chuyển tiếp cho cả lớp', 'Trả lời kèm mật khẩu'] },
    { q: 'Trong bảng tính, ô là gì?', a: ['Giao của một hàng và một cột', 'Một trang tính', 'Một tệp', 'Một biểu đồ'], g: 7 },
    { q: 'Phần mềm nào dùng để duyệt web?', a: ['Trình duyệt (Edge, Chrome...)', 'Paint', 'Máy tính bỏ túi', 'Notepad'] },
    { q: 'Tệp văn bản Word thường có đuôi gì?', a: ['.docx', '.mp3', '.jpg', '.exe'] },
  ],
  'the-duc': [
    { q: 'Trước khi tập luyện, cần làm gì?', a: ['Khởi động', 'Ăn thật no', 'Ngủ một giấc', 'Uống nước ngọt có ga'] },
    { q: 'Một đội bóng đá có bao nhiêu cầu thủ trên sân?', a: ['11', '7', '9', '5'] },
    { q: 'Một đội bóng chuyền có bao nhiêu người trên sân?', a: ['6', '5', '7', '11'] },
    { q: 'Chạy cự li ngắn thường dùng kiểu xuất phát nào?', a: ['Xuất phát thấp', 'Xuất phát cao', 'Ngồi xổm', 'Nằm sấp'] },
    { q: 'Uống nước khi tập thế nào là đúng?', a: ['Uống từng ngụm nhỏ', 'Uống thật nhiều một lúc', 'Không uống gì', 'Chỉ uống nước đá'] },
    { q: 'Ngày Thể thao Việt Nam là ngày nào?', a: ['27/3', '26/3', '1/6', '2/9'] },
    { q: 'Trong cờ vua, quân nào đi chéo bao nhiêu ô cũng được?', a: ['Tượng', 'Mã', 'Xe', 'Tốt'] },
    { q: 'Tập thể dục đều đặn giúp gì?', a: ['Tăng cường sức khoẻ', 'Làm cơ thể yếu đi', 'Gây mất ngủ', 'Không có tác dụng'] },
  ],
  'nghe-thuat': [
    { q: 'Có bao nhiêu nốt nhạc cơ bản (Đô, Rê, Mi...)?', a: ['7', '5', '8', '12'] },
    { q: 'Ba màu cơ bản trong hội hoạ là gì?', a: ['Đỏ, vàng, lam', 'Đỏ, lục, tím', 'Đen, trắng, xám', 'Cam, tím, lục'] },
    { q: 'Pha màu vàng với màu lam được màu gì?', a: ['Lục (xanh lá)', 'Tím', 'Cam', 'Nâu'] },
    { q: 'Tác giả bài "Tiến quân ca" (Quốc ca) là ai?', a: ['Văn Cao', 'Trịnh Công Sơn', 'Phạm Tuyên', 'Hoàng Vân'] },
    { q: 'Nhạc cụ dân tộc nào chỉ có một dây?', a: ['Đàn bầu', 'Đàn tranh', 'Đàn nguyệt', 'Đàn tì bà'] },
    { q: 'Tranh dân gian Đông Hồ có nguồn gốc ở tỉnh nào?', a: ['Bắc Ninh', 'Huế', 'Cần Thơ', 'Lạng Sơn'] },
    { q: 'Nhóm màu nào là màu nóng?', a: ['Đỏ, cam, vàng', 'Lam, lục, tím', 'Đen, xám', 'Trắng, bạc'] },
    { q: 'Nốt nhạc đứng sau nốt Son là nốt gì?', a: ['La', 'Pha', 'Si', 'Mi'] },
  ],
  'trai-nghiem': [
    { q: 'Khi căng thẳng, cách nào lành mạnh?', a: ['Hít thở sâu, nói chuyện với người tin cậy', 'Giữ hết trong lòng', 'Thức trắng chơi game', 'Bỏ ăn'] },
    { q: 'Gặp đám cháy, em gọi số nào?', a: ['114', '113', '115', '111'] },
    { q: 'Cần cấp cứu y tế, em gọi số nào?', a: ['115', '114', '113', '1022'] },
    { q: 'Cách quản lí thời gian tốt là gì?', a: ['Lập thời gian biểu và làm theo', 'Để nước đến chân mới nhảy', 'Làm nhiều việc cùng lúc', 'Không cần kế hoạch'] },
    { q: 'Làm việc nhóm hiệu quả cần gì?', a: ['Lắng nghe và phân công rõ ràng', 'Một người làm hết', 'Ai làm gì thì làm', 'Tranh cãi để thắng'] },
    { q: 'Chọn nghề nên dựa vào đâu?', a: ['Sở thích, năng lực và nhu cầu xã hội', 'Chỉ theo bạn thân', 'Nghề nào nhiều tiền nhất', 'Bốc thăm'], g: 8 },
    { q: 'Nghề lập trình viên cần nhất phẩm chất nào?', a: ['Tư duy logic, kiên nhẫn', 'Giọng hát hay', 'Sức khoẻ cơ bắp', 'Vẽ đẹp'], g: 8 },
    { q: 'Cách tiết kiệm tiền tiêu vặt tốt là gì?', a: ['Để dành một phần mỗi tuần', 'Tiêu hết ngay', 'Vay bạn để mua sắm', 'Mua đồ không cần thiết'] },
  ],
  'dia-phuong': [
    // Generic Vietnamese culture; replace with your province's content (each province has its own book).
    { q: 'Tết Nguyên Đán bắt đầu vào ngày nào?', a: ['Mùng 1 tháng Giêng âm lịch', '1/1 dương lịch', '15/8 âm lịch', '10/3 âm lịch'] },
    { q: 'Giỗ Tổ Hùng Vương vào ngày nào?', a: ['10/3 âm lịch', '15/1 âm lịch', '5/5 âm lịch', '2/9 dương lịch'] },
    { q: 'Tết Trung thu vào ngày nào?', a: ['15/8 âm lịch', '15/7 âm lịch', '1/6 dương lịch', '23/12 âm lịch'] },
    { q: 'Vịnh Hạ Long thuộc tỉnh nào?', a: ['Quảng Ninh', 'Hải Phòng', 'Thanh Hoá', 'Nghệ An'] },
    { q: 'Dân ca Quan họ gắn với vùng nào?', a: ['Kinh Bắc (Bắc Ninh, Bắc Giang)', 'Nam Bộ', 'Tây Nguyên', 'Huế'] },
    { q: 'Đờn ca tài tử phổ biến ở vùng nào?', a: ['Nam Bộ', 'Tây Bắc', 'Kinh Bắc', 'Duyên hải Bắc Bộ'] },
    { q: 'Chợ nổi Cái Răng ở đâu?', a: ['Cần Thơ', 'Hà Nội', 'Đà Lạt', 'Hải Phòng'] },
    { q: 'Nhã nhạc cung đình Huế được UNESCO công nhận là gì?', a: ['Di sản văn hoá phi vật thể', 'Di sản thiên nhiên', 'Kì quan thế giới', 'Công viên địa chất'] },
  ],
};

const EN_WORDS = [
  ['apple', 'quả táo'], ['teacher', 'giáo viên'], ['library', 'thư viện'], ['classroom', 'lớp học'],
  ['friend', 'bạn bè'], ['homework', 'bài tập về nhà'], ['breakfast', 'bữa sáng'], ['uniform', 'đồng phục'],
  ['happy', 'vui vẻ'], ['tired', 'mệt mỏi'], ['river', 'dòng sông'], ['mountain', 'ngọn núi'],
  ['weather', 'thời tiết'], ['kitchen', 'nhà bếp'], ['hospital', 'bệnh viện'], ['subject', 'môn học'],
  ['science', 'khoa học'], ['history', 'lịch sử'], ['grandmother', 'bà'], ['healthy', 'khoẻ mạnh'],
  ['environment', 'môi trường'], ['festival', 'lễ hội'], ['dangerous', 'nguy hiểm'], ['invention', 'phát minh'],
];

const EN_GRAMMAR = [
  { q: 'She ___ to school every day.', a: ['goes', 'go', 'going', 'gone'] },
  { q: 'I ___ a student.', a: ['am', 'is', 'are', 'be'] },
  { q: 'There ___ two books on the desk.', a: ['are', 'is', 'am', 'be'] },
  { q: 'They ___ football yesterday.', a: ['played', 'play', 'plays', 'playing'], g: 7 },
  { q: 'Quá khứ của "go" là gì?', a: ['went', 'goed', 'gone', 'going'], g: 7 },
  { q: 'Số nhiều của "child" là gì?', a: ['children', 'childs', 'childes', 'child'] },
  { q: 'So sánh hơn của "big" là gì?', a: ['bigger', 'more big', 'biger', 'biggest'] },
  { q: 'Trái nghĩa của "hot" là gì?', a: ['cold', 'warm', 'big', 'fast'] },
  { q: 'If I were you, I ___ study harder.', a: ['would', 'will', 'am', 'did'], g: 9 },
  { q: 'He has lived here ___ 2020.', a: ['since', 'for', 'in', 'at'], g: 8 },
];

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Turn a correct numeric answer into 4 distinct options (correct first).
function numOptions(correct, spread = 5) {
  const set = new Set([correct]);
  let guard = 0;
  while (set.size < 4 && guard++ < 50) {
    const d = (rnd(spread) + 1) * (Math.random() < 0.5 ? -1 : 1);
    const v = correct + d;
    if (correct > 0 && v <= 0) continue;
    set.add(v);
  }
  return [...set].map(String);
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function mathQuestion(grade) {
  const gen = {
    6: [
      () => { const a = rnd(20) + 5, b = rnd(9) + 2, c = rnd(9) + 2; return { q: `Tính: ${a} + ${b} × ${c} = ?`, a: numOptions(a + b * c, 8) }; },
      () => { const g = pick([2, 3, 4, 5, 6]), x = pick([2, 3, 5, 7]), y = pick([3, 4, 5, 7].filter((v) => gcd(v, x) === 1)); return { q: `ƯCLN(${g * x}, ${g * y}) = ?`, a: numOptions(g, 3) }; },
      () => { const a = rnd(15) + 1, b = rnd(15) + 1; return { q: `Tính: (−${a}) + ${b} = ?`, a: numOptions(b - a, 6) }; },
      () => { const m = pick([5, 7, 9, 11]), a = rnd(4) + 1, b = rnd(4) + 1; return { q: `Tính: ${a}/${m} + ${b}/${m} = ?`, a: numOptions(a + b, 3).map((n) => `${n}/${m}`) }; },
    ],
    7: [
      () => { const a = pick([2, 3, 5]), m = rnd(4) + 2, n = rnd(4) + 2; return { q: `${a}^${m} · ${a}^${n} = ${a}^? (điền số mũ)`, a: numOptions(m + n, 3) }; },
      () => { const k = rnd(5) + 2, b = rnd(5) + 2, a = rnd(5) + 2; return { q: `Tìm x biết x / ${a} = ${b * k} / ${b}`, a: numOptions(a * k, 4) }; },
      () => { const x = rnd(40) + 30, y = rnd(40) + 30; return { q: `Tam giác có hai góc ${x}° và ${y}°. Góc còn lại bằng bao nhiêu độ?`, a: numOptions(180 - x - y, 10) }; },
      () => { const a = rnd(20) + 1; return { q: `|−${a}| = ?`, a: [String(a), String(-a), '0', String(a + 1)] }; },
    ],
    8: [
      () => { const a = rnd(5) + 2; return { q: `(x + ${a})² = x² + ?x + ${a * a}. Số cần điền là:`, a: numOptions(2 * a, 3) }; },
      () => { const a = rnd(5) + 2, x = rnd(9) + 1, b = rnd(10) + 1; return { q: `Giải phương trình: ${a}x + ${b} = ${a * x + b}. x = ?`, a: numOptions(x, 3) }; },
      () => { const p = rnd(30) + 70, q = rnd(30) + 70, r = rnd(30) + 70; return { q: `Tứ giác có ba góc ${p}°, ${q}°, ${r}°. Góc thứ tư bằng bao nhiêu độ?`, a: numOptions(360 - p - q - r, 10) }; },
      () => { const a = rnd(6) + 2; return { q: `x² − ${a * a} = (x − ${a})(x + ?)`, a: numOptions(a, 3) }; },
    ],
    9: [
      () => { const n = rnd(15) + 4; return { q: `√${n * n} = ?`, a: numOptions(n, 3) }; },
      () => { const x = rnd(9) + 2, y = rnd(x - 1) + 1; return { q: `Hệ: x + y = ${x + y}; x − y = ${x - y}. Giá trị của x là:`, a: numOptions(x, 3) }; },
      () => { const t = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]]); return { q: `Tam giác vuông có hai cạnh góc vuông ${t[0]} và ${t[1]}. Cạnh huyền bằng:`, a: numOptions(t[2], 3) }; },
      () => { const a = rnd(5) + 1, b = rnd(5) + 1; return { q: `Phương trình (x − ${a})(x − ${b + a}) = 0 có nghiệm lớn nhất là:`, a: numOptions(a + b, 3) }; },
    ],
  };
  return pick(gen[grade] || gen[6])();
}

function englishQuestion(grade) {
  if (Math.random() < 0.55) {
    const [en, vi] = pick(EN_WORDS);
    const wrong = shuffle(EN_WORDS.filter((w) => w[0] !== en)).slice(0, 3).map((w) => w[1]);
    return { q: `"${en}" nghĩa là gì?`, a: [vi, ...wrong] };
  }
  return pick(EN_GRAMMAR.filter((x) => !x.g || x.g <= grade));
}

// Returns { q, options[], answer } ready to show.
export function makeQuestion(subjectId, grade, avoid = new Set()) {
  let raw;
  if (subjectId === 'toan') raw = mathQuestion(grade);
  else if (subjectId === 'anh') raw = englishQuestion(grade);
  else {
    const pool = BANK[subjectId].filter((x) => !x.g || x.g <= grade);
    const fresh = pool.filter((x) => !avoid.has(x.q));
    raw = pick(fresh.length ? fresh : pool);
  }
  return { q: raw.q, options: shuffle(raw.a), answer: raw.a[0] };
}
