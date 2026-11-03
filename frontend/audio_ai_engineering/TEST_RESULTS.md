# Kết quả kiểm tra audio — 03/11/2026

Phạm vi: thuyết minh Việt/Anh, âm thanh môi trường 360°, camera tùy chọn và luồng cảm biến. Kiểm tra bằng Chrome headless thực thi Web Audio/WebGL, gồm cửa sổ desktop và màn hình mobile giả lập 375 × 812. Các trường hợp không có camera được mô phỏng ở API trình duyệt, không cần webcam vật lý.

| Trường hợp | Kết quả |
| --- | --- |
| Camera trả về NotFoundError (không có thiết bị) | Hiển thị lỗi phù hợp, vẫn vào cảnh và bật âm thanh 360° được |
| Camera trả về NotAllowedError (từ chối quyền) | Hiển thị lỗi phù hợp, vẫn vào cảnh và bật âm thanh 360° được |
| Trình duyệt không có mediaDevices | Hiển thị thông báo, vẫn dùng cảnh 3D và audio được |
| Tự phát khi mở màn hình | Không tạo AudioContext trước thao tác bật âm thanh |
| Sáu MP3 của drum/jar/dagger, Việt/Anh | Fetch thành công, Chrome giải mã được, có mẫu âm khác 0 |
| Đổi ngôn ngữ khi đang phát thuyết minh | Dừng bản cũ, tải đúng MP3 của ngôn ngữ mới |
| Rời màn hình khi đang phát thuyết minh | Phần tử audio cũ chuyển sang trạng thái paused |
| File thuyết minh tiếng Việt trả về HTTP 404 | Hiện thông báo chưa sẵn sàng; chuyển sang tiếng Anh vẫn tải được |
| Đổi góc nhìn 180° | AudioListener thay đổi theo camera Three.js |
| Kiểm tra stereo bằng OfflineAudioContext/HRTF | Kênh gần nguồn lớn hơn; xoay 180° đổi bên trái/phải |
| Mức nguồn theo hướng nhìn | Hệ số trước mặt 1, quay lưng 0,25 |
| Âm lượng tổng về 0 | Master gain về gần 0 |
| Tắt từng nguồn | Gain của nguồn về gần 0 |
| Phát môi trường | Đo được tín hiệu âm thanh khác 0 ở đầu ra |
| Tạm dừng/bật lại môi trường | Suspend/resume, tái sử dụng cùng AudioContext |
| Đưa trang ra nền | Âm thanh môi trường chuyển sang suspended |
| Rời màn hình 360° | AudioContext được đóng |
| Giả lập từ chối quyền cảm biến | Thông báo rõ, điều khiển thủ công vẫn dùng được |
| Giả lập cảm biến quay 90° | Góc nhìn thay đổi khoảng 90° và đồng bộ với camera |
| Giả lập cấp quyền nhưng không có dữ liệu | Sau 5 giây thông báo dùng điều khiển thủ công |
| Giao diện rộng 375px | Không tràn ngang; nút camera không che nút điều hướng |
| Lỗi JavaScript trong lượt kiểm tra spatial | Không ghi nhận pageerror |
| TypeScript và bản build production | Thành công |
| Lint | Không có lỗi; còn cảnh báo ở mã có sẵn về refs/effects/Fast Refresh |

Vite còn cảnh báo kích thước JavaScript bundle vượt 500 kB sau minify. Đây chưa phải phép đo hiệu năng trên điện thoại cấu hình thấp.

## Giới hạn

- Chưa dùng camera/cảm biến vật lý hoặc iOS Safari thật. Màn hình mobile và sự kiện hướng được mô phỏng; không thay thế kiểm tra phần cứng.
- Đã kiểm tra dữ liệu và phát audio bằng trình duyệt; vẫn cần nghe duyệt phát âm tên riêng và chất lượng cảm nhận qua tai nghe.
- Không gọi ElevenLabs hoặc dùng credit trong lượt kiểm tra này.

## Thử trên PC không có camera

Chạy `npm run dev` tại `frontend`, chọn hiện vật, mở **Âm thanh 360°**, bấm **Bật âm thanh**, đeo tai nghe và kéo cảnh hoặc dùng thanh góc xoay ngang. Camera là tùy chọn. Bấm **Đặt lại góc nhìn** để chuyển từ thanh góc nhìn về kéo cảnh bằng chuột.
