# Handoff — Kháng Chiến TikTok LIVE

## Repo và chạy cục bộ

- GitHub: https://github.com/hoangdanhtu998/live-game-tiktok
- Nhánh phát hành: `main`.
- Chạy demo: `npm install`, `node server.js`, rồi mở `http://127.0.0.1:8765/index.html`.
- TikTok LIVE: `node server.js TEN_TAI_KHOAN_TIKTOK`; chỉ thử với tài khoản LIVE do chủ dự án cung cấp.
- Trang điều khiển: `/control.html`; trang quản lý: `/admin.html`.

## Nội dung trong lần cập nhật này

- Đồng bộ game với cấu hình roster 6 bậc; quân Xanh là thần thú/anh hùng Việt, quân Đỏ là yêu tinh, mỗi món quà cùng giá có nhân vật riêng theo phe. Giữ spawn mặc định tắt.
- Đưa vòng quay 18 nhân vật về bảng tối phía dưới sân, chạy 4 giây và hiển thị vai trò/tỷ lệ; giữ các thay đổi hàng đợi quân thường, tuổi thọ lính thường và giới hạn riêng cho quân quà.
- Thêm các sprite/ảnh môi trường WebP lossless cho 34 ảnh được tải lúc chơi; giữ PNG gốc để rollback. Thêm hai script benchmark và xác minh ảnh trong `bench/`.
- Tối ưu truy vấn theo lưới chiến trường, thu gom mảng tại chỗ, bỏ vẽ nội dung ngoài khung, thêm cấu hình chất lượng/profiling và thử kết nối TikTok lại có backoff.

## Kiểm tra đã chạy

- `node --check game.js`, `node --check config.js`, `node --check server.js`.
- `node bench/verify-assets.cjs`: 34/34 ảnh khớp pixel RGBA nhìn thấy; payload ảnh giảm 33,4% (61,869,525 xuống 41,200,432 byte).
- `node bench/performance.cjs 100 5`, `180 5`, `240 5`: median update tương ứng 0.485 ms, 0.946 ms, 1.416 ms; tại 240 quân p95 là 4.623 ms. Đây là benchmark simulation Node với canvas/DOM giả lập, không đo FPS trình duyệt.

## Việc còn phải xác nhận

- Chưa đo frame time/FPS trong trình duyệt trên máy mục tiêu; chưa thể khẳng định đạt 60 FPS.
- Chưa thử kết nối TikTok LIVE thật, chưa soak test dài với dày hiệu ứng và chưa profile bộ nhớ giải mã ảnh trên thiết bị.
- Cần kiểm tra thủ công các màn game/admin/control sau khi cập nhật và xác nhận chiêu kéo `pullToward` trong tình huống đông quân.
- Cân bằng nhân vật chưa được thay đổi dựa trên phép đo trận dài; xem `UPGRADE_PLAN.md`.
