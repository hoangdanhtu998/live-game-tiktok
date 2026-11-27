# Kháng Chiến

## Chạy bản demo

Mở PowerShell trong thư mục này, chạy `node server.js`, sau đó mở http://127.0.0.1:8765/index.html. Trang điều khiển: http://127.0.0.1:8765/control.html; trang quản lý: http://127.0.0.1:8765/admin.html.

Nếu cổng 8765 đã được dùng bởi một bản game khác, dừng bản đó trước khi chạy bản này.

## TikTok LIVE

Chạy `node server.js TEN_TAI_KHOAN_TIKTOK` với tên tài khoản thực. Kết nối LIVE thật chưa được kiểm tra trong phiên này.

Bình luận 1 chọn phe Xanh, bình luận 2 chọn phe Quái. Mỗi 100 tim của người xem được tính cho phe họ chọn trong bình luận gần nhất; phe đó gọi luân phiên quân dân thường. Mỗi lượt vào phe mặc định gọi một nhóm quân. Quà gọi thần thú hoặc yêu tinh theo cấp. Vua Trống Sấm ở cấp 5 và có thể xuất hiện trong quay may phe xanh hoặc được gọi từ trang điều khiển. Chiến trường có 8 đường đánh; quân tự sinh mặc định tắt.

Bảng “Tỉ lệ thắng thật” chỉ ghi nhận trận đã kết thúc, hiển thị tổng và 20 trận gần nhất; trận đang chạy không được tính là thắng. Lịch sử lưu trong localStorage của trình duyệt đang mở, nên dùng chung khi tải lại cùng địa chỉ game nhưng không tự đồng bộ giữa các thiết bị hoặc cổng khác nhau.

Hiệu ứng tăng theo giá quà: cấp 1–2 có lời gọi và động tác chiến đấu; cấp 3 trở lên có chiêu riêng và hào quang; tướng cấp 4 trở lên có intro/zoom khi xuất hiện, cấp 5 có cảnh Thần Tướng giáng thế, cấp 6 có cảnh Thần Thoại giáng thế cùng hiệu ứng màn hình mạnh hơn và lời hô riêng. Phượng Hoàng gọi mưa thiên hỏa, Hồ Tinh phóng hồ hỏa, Thanh Long gọi lôi vũ, Hắc Giao quét hắc triều; mỗi chiêu có tên và hiệu ứng riêng.

Đòn lan được giới hạn theo bán kính, số mục tiêu và sát thương phụ để cân bằng: Bạch Hổ/Ngô Công chém sượt thêm một địch; Xà Tinh và Bạch Tượng đánh trúng nhóm nhỏ; Pháo Thần Công, Vua Trống Sấm và các thần thú bậc cao gây sát thương vùng rộng hơn. Mưa thiên hỏa, Cửu Ảnh, lưới nhện và tường Kim Quy đều có giới hạn mục tiêu rõ ràng; mục tiêu phụ nhận ít sát thương hơn đòn trúng trực tiếp.

Voi Chiến/Bạch Tượng nếu chưa có địch để xung trận sẽ rống hiệu lệnh, buff quân thường gần đó trong 5 giây: +15% sát thương và tốc đánh, đồng thời giảm 10% sát thương nhận vào. Khi có địch thì vẫn xung trận.

Khi quà kích hoạt quay may, vòng quay chạy 4 giây với 18 lựa chọn theo phe. Mỗi ô ghi vai trò (cận chiến, hỗ trợ/đỡ đòn, bắn xa hoặc chưởng xa) và tỷ lệ trúng cho giá xu của món quà đó. Hai phe có cùng số lựa chọn ở từng bậc nên cùng giá có cùng xác suất và mặt bằng sức mạnh; kỹ năng và lối đánh vẫn khác nhau. Vòng quay nằm trong bảng tối màu dưới sân đấu để không che giao tranh.

Ba quà Rosa (10 xu), Tea (50 xu) và Confetti (100 xu) luôn mở vòng quay 18 nhân vật trong 4 giây. Thánh Gióng cưỡi ngựa sắt xung phong, Yêu Trư húc và hất lùi nhóm địch; chúng nằm cùng bậc sức mạnh tương ứng giữa hai phe. Tên/giá quà có thể khác theo vùng và thời điểm; đối chiếu tên quà nhận được từ TikTok LIVE thật nếu cần chỉnh mapping.

Cú xung trận của Bạch Tượng khóa vào địch gần nhất, giới hạn quãng lao trước cổng thành và không tự kích hoạt khi không có mục tiêu.

Bạch Tượng được thể hiện như voi chiến mặc giáp có thần tướng Đại Việt cưỡi; Bé chăn trâu vẫn là dân thường bậc thấp. Ngư Tinh vẫn dùng hình Kình Ngư tạm. Các sprite được tạo bằng AI; cần xem lại chuyển động và cân bằng trong trận dài trước khi dùng trên LIVE.

## Hiệu năng và cấu hình hình ảnh

Ảnh PNG gốc được giữ lại; game tải các bản WebP lossless cho 34 ảnh đang dùng. Canvas có cấu hình mặc định giữ nguyên ở chất lượng đầy đủ. Khi cần trên máy yếu, có thể đặt `window.KC_QUALITY = { renderScale: 0.8, effects: false, minimap: false }` trước `game.js`, hoặc gọi `window.__kc.setQuality({ renderScale: 0.8, effects: false, minimap: false })` trong phiên đang chạy. `renderScale` được giới hạn trong khoảng 0.6–1. `window.__kc.profile()` trả về nhịp khung hình gần nhất, thời gian update/vẽ, số quân, hạt hiệu ứng và đạn.

Chạy benchmark update mô phỏng bằng `node bench/performance.cjs 240 7`; `--baseline` chạy bản đối chứng với cách quét/thu gom mảng cũ. Đây là thời gian simulation trong Node với canvas/DOM stub, không phải FPS trình duyệt. `node bench/verify-assets.cjs` xác nhận pixel RGBA nhìn thấy và tổng dung lượng PNG/WebP.

Danh sách nâng cấp, kết quả đo và việc còn lại: [UPGRADE_PLAN.md](UPGRADE_PLAN.md).

Quân thường từ tim/bình luận được xếp theo làn trong hàng đợi, giới hạn tổng 1.800 quân thường đang hoạt động và rút khỏi trận sau 75 giây; quân gọi bằng quà có giới hạn riêng 240 và thời lượng dài hơn. Tự sinh quân mặc định tắt.
