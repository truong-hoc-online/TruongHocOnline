# An toàn cho người chơi nhỏ tuổi

Người chơi có thể là trẻ em. Mọi tính năng phải qua các nguyên tắc này:

- **Bắt nạt không bao giờ là phần thưởng.** Tag `bi-bat-nat` = quyền được **bảo vệ** (nút Báo cô, giám thị đi theo,
  cô tư vấn, số 111). Phòng tư vấn mở cho **mọi** người: không khoá việc tìm giúp đỡ sau một tag.
- **Chọc bạn chỉ là trò nghịch nhẹ:** chỉ với NPC, có hậu quả hạnh kiểm, không trong lớp/thư viện/với thầy cô; chọc
  một người nhiều lần bị gọi đúng tên là bắt nạt. Khi có người chơi thật: không nhắm vào bạn đang có tag `bi-bat-nat`.
- **Coco/thương mại:** chỉ bán đồ trang trí/vui, **không bán điểm, hạnh kiểm, lên lớp**; **không gacha / hộp quà ngẫu
  nhiên trả tiền**; có giới hạn chi tiêu cho người dưới 18 và xác nhận phụ huynh khi bật bán thật.
- **Chat thật / multiplayer:** chỉ làm khi có lọc từ, nút báo cáo, chặn, người kiểm duyệt. Bản nhẹ có thể dùng câu chat
  có sẵn.
- **AI:** nội dung AI tạo cho học sinh phải có người duyệt (ví dụ AI soạn câu hỏi → giáo viên duyệt). Không cho AI chat
  tự do với trẻ. Khoá API chỉ nằm phía server (Worker/Edge Function), có giới hạn chi tiêu.
- **Dữ liệu cá nhân:** thu thập tối thiểu; form góp ý nhắc không ghi số điện thoại, địa chỉ, mật khẩu. Khoá
  `service_role` của Supabase không bao giờ nằm trong code phía trình duyệt.
- **Mod cộng đồng:** chỉ dữ liệu, không chạy code; phải được duyệt nội dung (xem MODDING.md: không tục, không bạo lực
  thật, không rượu bia/thuốc lá/cờ bạc, không quảng cáo, không thông tin cá nhân).
