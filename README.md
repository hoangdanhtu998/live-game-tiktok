# Kháng Chiến

## Chạy bản demo

Mở PowerShell trong thư mục này, chạy `node server.js`, sau đó mở http://127.0.0.1:8765/index.html. Trang điều khiển: http://127.0.0.1:8765/control.html; trang quản lý: http://127.0.0.1:8765/admin.html.

Nếu cổng 8765 đã được dùng bởi một bản game khác, dừng bản đó trước khi chạy bản này.

## TikTok LIVE

Chạy `node server.js TEN_TAI_KHOAN_TIKTOK` với tên tài khoản thực. Kết nối LIVE thật chưa được kiểm tra trong phiên này.

Bình luận 1 hoặc 4 chọn phe. Phe xanh gọi luân phiên quân dân thường khi bình luận hoặc đủ tim; phe đỏ gọi Quỷ Lùn. Mỗi lượt vào phe và mỗi mốc 100 tim mặc định gọi một nhóm 3 quân. Quà gọi thần thú hoặc yêu tinh theo cấp. Vua Trống Sấm ở cấp 5 và có thể xuất hiện trong quay may phe xanh hoặc được gọi từ trang điều khiển. Chiến trường có 8 đường đánh, tối đa 240 quân; quân tự sinh mặc định tắt.

Quân được chia đều theo mật độ từng làn; tướng lớn ưu tiên nhẹ khu vực giữa nhưng không bị khóa ở đó. Kẻ địch ở làn xa không chặn đường, quân mắc kẹt tìm làn thông thoáng theo nhịp giới hạn để tránh tốn khung hình. Khoảng cách xuất hàng tự tính theo kích cỡ từng nhân vật.

Bảng “Tỉ lệ thắng thật” chỉ ghi nhận trận đã kết thúc, hiển thị tổng và 20 trận gần nhất; trận đang chạy không được tính là thắng. Lịch sử lưu trong localStorage của trình duyệt đang mở, nên dùng chung khi tải lại cùng địa chỉ game nhưng không tự đồng bộ giữa các thiết bị hoặc cổng khác nhau.

Hiệu ứng tăng theo giá quà: cấp 1–2 có lời gọi và động tác chiến đấu; cấp 3 trở lên có chiêu riêng và hào quang; tướng cấp 4 trở lên có intro/zoom khi xuất hiện, cấp 5 có cảnh Thần Tướng giáng thế, cấp 6 có cảnh Thần Thoại giáng thế cùng hiệu ứng màn hình mạnh hơn và lời hô riêng. Phượng Hoàng gọi mưa thiên hỏa, Hồ Tinh phóng hồ hỏa, Thanh Long gọi lôi vũ, Hắc Giao quét hắc triều; mỗi chiêu có tên và hiệu ứng riêng.

Đòn lan được giới hạn theo bán kính, số mục tiêu và sát thương phụ để cân bằng: Bạch Hổ/Ngô Công chém sượt thêm một địch; Xà Tinh và Bạch Tượng đánh trúng nhóm nhỏ; Pháo Thần Công, Vua Trống Sấm và các thần thú bậc cao gây sát thương vùng rộng hơn. Mưa thiên hỏa, Cửu Ảnh, lưới nhện và tường Kim Quy đều có giới hạn mục tiêu rõ ràng; mục tiêu phụ nhận ít sát thương hơn đòn trúng trực tiếp.

Voi Chiến/Bạch Tượng nếu chưa có địch để xung trận sẽ rống hiệu lệnh, buff quân thường gần đó trong 5 giây: +15% sát thương và tốc đánh, đồng thời giảm 10% sát thương nhận vào. Khi có địch thì vẫn xung trận.

Khi quà kích hoạt quay may, vòng quay chạy 10 giây với 18 lựa chọn theo phe. Mỗi ô ghi vai trò (cận chiến, hỗ trợ/đỡ đòn, bắn xa hoặc chưởng xa) và tỷ lệ trúng cho giá xu của món quà đó. Hai phe có cùng số lựa chọn ở từng bậc nên cùng giá có cùng xác suất và mặt bằng sức mạnh; kỹ năng và lối đánh vẫn khác nhau.

Ba quà Rosa (10 xu), Tea (50 xu) và Confetti (100 xu) luôn mở vòng quay 18 nhân vật trong 10 giây. Thánh Gióng cưỡi ngựa sắt xung phong, Yêu Trư húc và hất lùi nhóm địch; chúng nằm cùng bậc sức mạnh tương ứng giữa hai phe. Tên/giá quà có thể khác theo vùng và thời điểm; đối chiếu tên quà nhận được từ TikTok LIVE thật nếu cần chỉnh mapping.

Cú xung trận của Bạch Tượng khóa vào địch gần nhất, giới hạn quãng lao trước cổng thành và không tự kích hoạt khi không có mục tiêu.

Bạch Tượng được thể hiện như voi chiến mặc giáp có thần tướng Đại Việt cưỡi; Bé chăn trâu vẫn là dân thường bậc thấp. Ngư Tinh vẫn dùng hình Kình Ngư tạm. Các sprite được tạo bằng AI; cần xem lại chuyển động và cân bằng trong trận dài trước khi dùng trên LIVE.
