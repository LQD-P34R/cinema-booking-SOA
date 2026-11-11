# Booking Service (TV3) - Cinema Booking SOA

Java 17 / Spring Boot 3.3.5 / MySQL 8.0. Port **8083**.

Service này thực hiện đúng các endpoint trong `../../docs/api-contract.md` (mục 4),
không truy cập trực tiếp database của Movie, User hoặc Payment Service.

## Thành phần đã triển khai

- `GET /api/showtimes/{id}/seat-status`: danh sách ghế HELD/SOLD; ghế không xuất hiện là AVAILABLE.
- `POST /api/bookings`: tạo đơn, giữ 1-8 ghế trong 5 phút; chống đặt trùng bằng transaction và UNIQUE ở MySQL.
- `GET /api/bookings/my`, `GET /api/bookings/{id}`: lịch sử và chi tiết; kiểm tra chủ đơn.
- `POST /api/bookings/{id}/cancel`: hủy đơn chưa thanh toán, trả ghế.
- `POST /api/bookings/{id}/pay`: gọi Payment Service, xác nhận vé hoặc hủy nếu FAILED.
- `GET /api/bookings?status=...&showtimeId=...`: danh sách Admin.
- Job mỗi 30 giây: hết hạn đơn chưa thanh toán; đối soát lại thanh toán không rõ kết quả.

## Khởi động bằng Docker trên Windows / VS Code

Tại **thư mục gốc** `cinema-booking-SOA`:

```powershell
docker compose up --build -d booking-service
docker compose ps
docker compose logs -f booking-service
```

Lệnh trên khởi động MySQL Booking, MySQL Movie, Movie Service và Booking Service.
Không yêu cầu TV1 hoặc TV4 đã code xong để thử **tạo/giữ/hủy vé**.

- MySQL Booking: `localhost:3309`, database `cinema_booking_db`, user/password `root/root` (chỉ demo local).
- Movie Service: `http://localhost:8082`.
- Booking Service: `http://localhost:8083`.
- Swagger: `http://localhost:8083/swagger-ui.html`.

Database do Hibernate `ddl-auto: update` tạo/cập nhật cho môi trường demo.
Nếu cần tạo thủ công bằng Workbench, dùng `../../database/cinema_booking_db.sql`.
Trường nội bộ `payment_requested_result` đã được thêm để hỗ trợ thử lại thanh toán;
với bảng cũ, Hibernate sẽ thêm cột trong môi trường demo. Nên backup dữ liệu trước khi đổi schema.

## Thử API đơn giản

1. Lấy suất chiếu hiện có:

   `GET http://localhost:8082/api/showtimes`

2. Chọn `showtimeId` tương lai từ kết quả, gọi:

   `GET http://localhost:8082/api/showtimes/{id}/seats`

3. Lấy `seatIds` thực tế, rồi thử (ví dụ ID chỉ mang tính minh họa):

   ```http
   POST http://localhost:8083/api/bookings
   X-User-Id: 1
   X-User-Role: CUSTOMER
   Content-Type: application/json

   {"showtimeId":10,"seatIds":[5,6]}
   ```

   Kết quả: HTTP 201, `status: PENDING_PAYMENT`, `expiresAt` sau 5 phút.

4. Xem trạng thái: `GET http://localhost:8083/api/showtimes/10/seat-status`.

5. Dùng user khác giữ cùng ghế phải nhận HTTP 409.

6. Hủy đơn: `POST http://localhost:8083/api/bookings/{bookingId}/cancel` với cùng `X-User-Id`.

**Lưu ý:** Ví dụ trên gọi trực tiếp port 8083 và truyền header danh tính để kiểm thử local.
Trong hệ thống hoàn chỉnh, Frontend phải gọi qua Gateway 8080 với JWT.
Không mở trực tiếp port 8083 ra Internet vì header `X-User-*` có thể bị giả mạo.

## Thanh toán và tình huống mạng lỗi

`POST /api/bookings/{id}/pay` nhận:

```json
{"method":"CARD","simulateResult":"SUCCESS"}
```

Service gọi `POST http://payment-service:8084/internal/payments` (trong Docker).
Khi TV4 chưa triển khai Payment Service, API thanh toán sẽ trả **503**, nhưng
giữ ghế và các API khác vẫn chạy. Khi TV4 sẵn sàng, chạy Payment Service và dùng lại API đó.

Payment Service **phải idempotent theo `bookingId`**. Booking Service lưu lại phương thức/kết quả yêu cầu
và thử lại nếu mất kết nối, không tự xác nhận vé khi chưa có phản hồi hợp lệ.
Với giao dịch không thể xác minh (Payment Service ngừng hoạt động), ghế có thể được giữ lâu hơn 5 phút
để tránh bán lại ghế đã thanh toán; cần khôi phục Payment Service và đối soát trước khi giải phóng.

## Chạy test

Nếu máy có Java 17 và Maven:

```powershell
cd services/booking-service
mvn test
```

Test dùng H2 độc lập, mock Movie/Payment Service. Các trường hợp: giữ nhiều ghế,
giao dịch bị trùng, quyền xem đơn, thanh toán SUCCESS/FAILED, hủy và hai request đồng thời.
Nên chạy thêm kiểm thử đồng thời trên MySQL thật trước buổi bảo vệ.
