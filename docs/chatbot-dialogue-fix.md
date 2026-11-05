# Hội thoại hướng dẫn viên — 05/11/2026

Bản `2026.11.05-dialogue.5` chuyển câu trả lời lịch sử sang luồng sinh hội thoại có đầy đủ ngữ cảnh. Bộ câu trả lời kiểm duyệt chỉ còn dùng khi API không trả lời được, với dữ kiện có xung đột đã rà soát, hoặc khi cần giữ một giới hạn dữ kiện đã xác nhận.

## Nguyên nhân

- Trước đây một từ khớp ý định sẽ trả ngay đoạn soạn sẵn. Câu hỏi sâu về hợp kim vì thế có thể bị thay bằng câu trả lời chất liệu.
- Frontend chỉ gửi câu hỏi mới. Backend giữ lịch sử trong RAM và chỉ đọc vài lượt, nên các worker serverless khác nhau không có cùng ngữ cảnh.
- Tiến trình local chạy trong môi trường hạn chế mạng khiến nhánh gọi Gemini lỗi trong khi các câu tra cứu tĩnh vẫn chạy. Kiểm tra các câu tra cứu không chứng minh AI thực sự đang hội thoại.
- Việc buộc model tự sao chép một đoạn nguồn nguyên văn có thể làm câu trả lời đúng bị loại vì đoạn trích chép sai.

## Cách xử lý

- `ChatAssistant.tsx` lưu hội thoại riêng cho từng hiện vật trong sessionStorage, gửi tối đa 8 cặp hỏi/đáp thành công theo mỗi yêu cầu. Đóng/mở bảng chat hoặc tải lại trang vẫn giữ mạch hỏi đáp trong cùng tab.
- `schemas.py` kiểm tra giới hạn lịch sử và từ chối lịch sử của hiện vật khác. `history: []` bắt đầu cuộc hội thoại mới; các client cũ không gửi trường này vẫn dùng bộ nhớ tạm của backend.
- `EvidenceSelector` gửi lịch sử thành các lượt user/assistant thật cho Gemini. Tư liệu và giới hạn dữ kiện nằm trong thông điệp hệ thống. Lịch sử, kể cả câu AI trước đó, không được coi là bằng chứng.
- `tour_prompt.py` mô tả cách tiếp nối câu hỏi, đổi chủ đề, giải thích dễ hiểu và hỏi lại khi chưa rõ. Gợi ý phân loại theo từ khóa không được áp đặt lên ý của du khách.
- Model chọn ID tư liệu; backend lấy đoạn gốc từ corpus để hiển thị nguồn, kiểm tra đúng hiện vật, số liệu và các xung đột đã biết.
- Câu hỏi ngắn, rõ ý về số đo đang có các hồ sơ mâu thuẫn (như chiều cao Thạp Đào Thịnh) dùng bản tổng hợp đã rà soát để luôn nêu đủ từng số và không bịa cách giải thích.
- Câu hỏi số đo có danh từ chỉ một đối tượng ngoài phạm vi (ví dụ “voi cao bao nhiêu?”) bị chặn trước bước sinh câu trả lời, để không lấy nhầm số đo của hiện vật đang chọn.
- Nguồn bổ sung về hợp kim được đánh dấu `type_background`. Không suy từ kỹ thuật chung thành kết quả phân tích riêng của một mẫu hiện vật; kiểm tra cuối chặn khẳng định độ tinh khiết chưa có căn cứ.
- Lỗi tạm thời có số lượt thử và thời gian giới hạn. Khi cần, luồng thử Gemini dự phòng với cùng lịch sử và tư liệu, rồi mới dùng câu trả lời đã kiểm duyệt cho những truy vấn đủ rõ. Model mặc định dự phòng: `gemini-3.1-flash-lite`, tùy chỉnh qua `GEMINI_FALLBACK_MODEL`.

## Kiểm tra

- `python -m pytest -q`: kiểm tra phạm vi, tính hợp lệ của dữ kiện, lưu/truyền lịch sử, cold start, câu hỏi làm rõ và đường dự phòng.
- `python scripts/check_tour_dialogues.py --url http://127.0.0.1:5275`: đối đáp thật với Gemini. Mỗi lượt dùng session ID mới để kiểm tra lịch sử do client gửi. Câu tra cứu dự phòng không được tính là model đã trả lời; kết quả lưu ở `docs/tour-dialogues-live.json`.
- `python scripts/browser_check_main.py --url http://127.0.0.1:5275`: kiểm tra giao diện, nguồn, mobile, khôi phục sau reload và nội dung lịch sử thực sự gửi trên mạng.
- `npm run build` trong frontend: kiểm tra TypeScript và production build.

Các kịch bản hội thoại kiểm tra hỏi sâu từ công dụng sang chất liệu/hợp kim, giải thích hình tượng trên nắp thạp, yêu cầu nói dễ hiểu, chủ nhân chưa xác định của dao găm, đồng ý lời mời kể tiếp và chủ đề ngoài phạm vi. Kết quả này không chứng minh mọi cách diễn đạt có thể có đều đúng.
