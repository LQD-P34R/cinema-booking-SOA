# Bàn giao thành viên 3 - Booking Service

Đã bổ sung mã nguồn đầy đủ tại `services/booking-service/`,
schema MySQL tại `database/cinema_booking_db.sql` và tài liệu tại `docs/07-booking-service.md`.

Các file chung được thay đổi: `docker-compose.yml` (cho phép chạy Booking mà không bắt buộc
khởi động Payment Service, vì TV4 chưa có mã nguồn).

## Cách chạy nhanh trên Windows / VS Code

1. Mở **Docker Desktop**, chờ Engine chạy.
2. Mở Terminal tại thư mục gốc dự án đã giải nén.
3. Chạy:

   ```powershell
   docker compose up --build -d booking-service
   docker compose ps
   docker compose logs --tail=80 booking-service
   ```

4. Truy cập `http://localhost:8083/swagger-ui.html`.
5. Lấy `showtimeId` và `seatIds` thật từ Movie Service tại cổng 8082,
   rồi gọi các API Booking theo `docs/api-contract.md`.

**Đừng chạy toàn bộ `docker compose up --build` khi User Service/Payment Service
vẫn chỉ có `.gitkeep`: hai module đó vẫn chưa tồn tại Dockerfile.**

## Trạng thái tích hợp

- Đặt/giữ/hủy/xem đơn: có thể kiểm thử với Movie Service và MySQL.
- Thanh toán: code Booking đã gọi đúng `POST /internal/payments` theo contract,
  nhưng cần TV4 hoàn thiện Payment Service để thử end-to-end.
- Frontend/Gateway: cần User Service JWT hoạt động để chạy luồng đăng nhập thật.

## Kiểm thử và giới hạn xác minh

- Có test JUnit/H2 tại `services/booking-service/src/test`.
- Chạy ở môi trường có Maven: `cd services/booking-service && mvn test`.
- Mã nguồn đã được kiểm tra cú pháp Java 17; chưa chạy thực tế Maven/Docker trên máy người dùng.
- Khi ghép vào một repo đã được các thành viên chỉnh sửa thêm, hãy đối chiếu
  `docker-compose.yml` trước khi chép đè để tránh mất thay đổi mới của người khác.
