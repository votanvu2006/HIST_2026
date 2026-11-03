# Audio AI Engineering

## Chạy frontend

```powershell
npm ci
npm run dev
```

## Tạo giọng thuyết minh Việt/Anh

Kịch bản nằm trong `audio_ai_engineering/narration-scripts.json`. Hãy duyệt nội dung hai ngôn ngữ và chọn voice ID phù hợp với từng ngôn ngữ trên ElevenLabs trước khi tạo. Đây là hai bản kịch bản riêng, không có chức năng dịch tự động. Bước tạo chạy trên máy của người vận hành; khóa API không đưa vào mã frontend. Mỗi câu lệnh gọi API có thể tiêu tốn credit.

Đặt `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID_VI` và `ELEVENLABS_VOICE_ID_EN` trong `frontend/.env` hoặc cấu hình chúng trong môi trường PowerShell. Công cụ tự đọc `.env`; các biến đã có trong môi trường được ưu tiên. Tệp `.env` được Git bỏ qua.

Trên PowerShell, trong thư mục `frontend`:

```powershell
cd D:\CODING\HIST_2026\frontend
npm run narration:generate -- --exhibit drum --language vi
npm run narration:generate -- --exhibit drum --language en
```

Đổi `drum` thành `jar` hoặc `dagger` để tạo cho hiện vật khác. Có thể dùng `ELEVENLABS_VOICE_ID` nếu muốn dùng cùng một voice ID cho cả hai ngôn ngữ. Công cụ dùng model `eleven_v3`, tạo tối đa 5.000 ký tự mỗi lần và lưu MP3 vào `public/narration/<exhibit>-<language>.mp3`. Tệp JSON đi kèm giúp nhận biết bản thu đã được tạo từ cùng kịch bản, model và voice. Chạy lại cùng cấu hình sẽ bỏ qua tệp đã có; muốn thay bản thu hiện có sau khi duyệt thì thêm `--force`.

Frontend phát các tệp tĩnh này, do đó phải tạo và đưa chúng vào bản build/deploy. Nếu chưa có bản thu, màn hình hiển thị nội dung và thông báo tương ứng. Nếu tạo bằng công cụ khác, đặt MP3 vào đúng đường dẫn trên; không cần tệp JSON. Công cụ tạo sẽ không ghi đè tệp có sẵn nếu không truyền `--force`.

Nếu bạn từng đặt khóa trực tiếp trong phiên PowerShell, có thể xóa biến khỏi phiên sau khi sử dụng:

```powershell
Remove-Item Env:ELEVENLABS_API_KEY
```

## Phương án dự phòng

KorvaTTS tạo MP3 cục bộ bằng giọng `ngoc_huyen`, tương tự dự án `ganhmuusinh`, không dùng API key hoặc credit ElevenLabs. Đây là giọng riêng của KorvaTTS. Qwen3-VL 8B Instruct Q8 có thể hỗ trợ xử lý nội dung và hình ảnh; cần thêm bộ TTS để tạo giọng nói.

Đứng tại thư mục `frontend`, cài môi trường riêng nếu máy chưa có KorvaTTS:

```powershell
python -m venv audio_ai_engineering/.venv
audio_ai_engineering/.venv/Scripts/python.exe -m pip install -r audio_ai_engineering/requirements-local.txt
audio_ai_engineering/.venv/Scripts/python.exe audio_ai_engineering/generate-local-narration.py --exhibit all --language all
```

Lần đầu cần mạng để tải trọng số. Nếu đã có model, truyền `--assets-dir "<thư mục có onnx và voice_styles>"` để chạy hoàn toàn cục bộ và không tải gì thêm. Có thể dùng Python trong môi trường KorvaTTS đã cài thay cho môi trường mới ở trên. Chọn `--exhibit drum --language vi` để tạo riêng một bản. Công cụ lưu MP3 và thông tin model, voice, thời lượng tại `public/narration`; chạy lại cùng cấu hình bỏ qua các bản đã có, dùng `--force` để thay bản thu sau khi duyệt.

Các bản thu cần được nghe duyệt phát âm, tên riêng và nhịp đọc trước khi dùng trong demo chính thức.

## Âm thanh không gian 360°

Chọn hiện vật → **Âm thanh 360°** → **Bật âm thanh**. Nên dùng tai nghe stereo để nghe vị trí nguồn âm. Kéo cảnh 3D để đổi vị trí/góc nhìn; hoặc dùng thanh góc xoay ngang và góc nhìn lên/xuống. **Đặt lại góc nhìn** đưa cảnh về điều khiển bằng chuột/chạm.

Trình phát thuyết minh Việt/Anh ở bên dưới cho phép nghe lời dẫn cùng âm thanh môi trường. Lời dẫn giữ ở giữa để dễ nghe; âm lượng môi trường được điều chỉnh riêng.

Trên điện thoại, bấm **Xoay bằng điện thoại** và cấp quyền cảm biến nếu trình duyệt hỏi. Góc cầm ban đầu được đặt làm mốc; bấm **Đặt lại góc nhìn** để hiệu chỉnh lại mốc. Cảm biến cần HTTPS hoặc localhost và thiết bị hỗ trợ. Nếu bị từ chối hoặc không nhận dữ liệu sau 5 giây, dùng điều khiển thủ công. Khi chuyển trang ra nền, âm thanh tạm dừng; bấm bật lại khi quay về.

- `spatialAudio.ts`: Web Audio graph `AudioBufferSourceNode → PannerNode (HRTF) → GainNode → master → destination`. Ba nguồn âm cố định trong cùng hệ tọa độ với cảnh: lửa lò, tiếng gõ và dòng nước. Buffer được tổng hợp cục bộ, không cần API hoặc tải tệp. Các nguồn âm chỉ minh họa môi trường, không khẳng định phục dựng lịch sử.
- `SpatialAudioExperience.tsx`: điều khiển phát/tạm dừng, âm lượng, bật/tắt từng nguồn, cảm biến và góc nhìn thủ công.
- `InteractiveStructureScene.tsx`: gửi vị trí, vector nhìn và vector lên của camera mỗi khung hình cho AudioListener. Tọa độ được chuẩn hóa theo kích thước hiện vật. Khoảng cách điều khiển suy giảm âm tự nhiên; hướng nhìn điều khiển độ rõ của từng nguồn. Giá trị âm thanh được làm mượt để tránh tiếng bật khi xoay.

Không tự phát khi mở trang. Rời màn hình sẽ dừng nguồn và đóng AudioContext. Các trình duyệt thiếu AudioParam cho listener dùng `setPosition`/`setOrientation` để tương thích. Trình duyệt không hỗ trợ Web Audio sẽ hiển thị thông báo khi bấm bật âm thanh.

Tài liệu nền tảng: [MDN spatial audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics), [quyền cảm biến hướng](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static).

## Task 3 — Slide pitching

Bộ slide nằm trong `pitching_slides/`. Mở `index.html` để trình chiếu 12 slide 16:9, hoặc mở `HeritageXR_Pitching_16x9.pdf`. Nội dung và thiết kế chỉnh trong `slides.js` và `slides.css`; lời dẫn kèm nguồn nằm trong `SPEAKER_NOTES.txt`. Hai workflow có bản SVG riêng để tái sử dụng. Xem `HUONG_DAN.txt` trong thư mục này để biết phím điều khiển và cách xuất PDF sau khi chỉnh sửa.
