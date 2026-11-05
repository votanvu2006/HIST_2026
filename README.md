# HeritageXR

HeritageXR Studio là web demo bảo tàng tương tác. Người xem có thể khám phá hiện vật 3D, tìm hiểu thông tin và câu chuyện lịch sử, rồi đặt câu hỏi cho chatbot AI.

## Demo trực tuyến

| Nội dung | Đường dẫn |
|---|---|
| Website | https://hist-2026.vercel.app/ |
| Trang quản trị | https://hist-2026.vercel.app/admin |
| AI Studio | https://hist-2026.vercel.app/admin/studio |
| Kiểm tra backend | https://hist-2026-zi6p.vercel.app/api/health |

## Chức năng

- Khám phá các hiện vật 3D trong không gian trưng bày.
- Xem thông tin, câu chuyện lịch sử, nội dung chế tác và phần đố vui.
- Hỏi chatbot AI về hiện vật và xem nguồn tham khảo.
- Mở giao diện quản trị tại `/admin` và AI Studio tại `/admin/studio`.

## Công nghệ

- **Frontend:** React, TypeScript, Vite và Three.js.
- **Backend:** Python, FastAPI và Gemini.
- **Chatbot:** truy xuất thông tin từ corpus và cung cấp nguồn tham khảo.

## Chạy dự án trên máy cá nhân

### Yêu cầu

- Python
- Node.js và npm
- Gemini API key

### Cài đặt

1. Tạo file môi trường từ file mẫu:

   ```powershell
   Copy-Item backend/.env.example backend/.env
2. Mở backend/.env, điền Gemini API key vào biến GEMINI_API_KEY.
3. Chạy lệnh sau từ thư mục gốc của repository:
   .\start-demo.cmd
Launcher sẽ khởi động backend và frontend. Mở website tại:
- Frontend: http://localhost:5173
- Backend health: http://127.0.0.1:8000/api/health
Không đưa API key, file .env hoặc thư mục backend/storage lên Git.
Deploy trên Vercel
Dự án dùng hai Vercel project riêng, cùng kết nối tới repository này:
Vercel project	Root Directory	Chức năng
hist-2026	frontend	Website React
hist-2026-zi6p	backend	Backend FastAPI


Biến môi trường frontend
Trong project hist-2026, thêm biến môi trường cho Production:
VITE_API_BASE_URL=https://hist-2026-zi6p.vercel.app

Biến môi trường backend
Trong project hist-2026-zi6p, thêm các biến môi trường cho Production:
GEMINI_API_KEY=<Gemini API key>
HERITAGE_SERVERLESS=1
HERITAGE_STORAGE=/tmp/heritagexr
ALLOWED_ORIGINS=https://hist-2026.vercel.app

Đặt GEMINI_API_KEY ở dạng Secret. Không ghi giá trị API key vào README hoặc repository.
Frontend có rewrite dự phòng cho `/api/*` về backend trước rewrite SPA. Sau khi đổi domain backend, cập nhật cả `VITE_API_BASE_URL` trong Vercel frontend và đích `/api/*` trong `frontend/vercel.json`.
Cập nhật website
Production của frontend được triển khai từ nhánh main. Sau khi thay đổi code được merge vào main, Vercel sẽ tự tạo Production Deployment mới.

File frontend/vercel.json cấu hình rewrite để các đường dẫn giao diện như /admin và /admin/studio được chuyển về ứng dụng React.
API chính
Endpoint	Chức năng
GET /api/health	Kiểm tra trạng thái backend
POST /api/chat	Gửi câu hỏi về hiện vật
POST /api/transcribe	Chuyển âm thanh thành văn bản
POST /api/admin/chat	Chat quản trị, yêu cầu Bearer token
GET /api/admin/corpus	Xem thông tin corpus, yêu cầu Bearer token
GET /api/admin/metrics	Xem số liệu chatbot, yêu cầu Bearer token


Tài liệu Swagger tại /docs hiện được tắt trên backend deployment.

Hội thoại hướng dẫn viên, cách truyền lịch sử qua các worker serverless và các lệnh kiểm tra được ghi trong [docs/chatbot-dialogue-fix.md](docs/chatbot-dialogue-fix.md). Có thể đặt `GEMINI_FALLBACK_MODEL` để chọn model dự phòng khi model chính gặp lỗi tạm thời; mặc định là `gemini-3.1-flash-lite`.
