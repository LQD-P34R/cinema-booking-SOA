# API Contract: Cinema Booking SOA

Tài liệu này là **hợp đồng chung** giữa 4 service, API Gateway và Frontend. Mọi thay đổi endpoint, request hoặc response phải báo cho chủ sở hữu service và cập nhật lại file này.

## 1. Quy ước chung

| Mục | Quy ước |
|---|---|
| Frontend gọi | Chỉ qua Gateway `http://localhost:8080`, mọi đường dẫn bắt đầu bằng `/api/...` |
| Định dạng | JSON, thuộc tính `camelCase` |
| Thời gian | ISO-8601, ví dụ `2026-11-20T19:30:00` (giờ địa phương, không kèm múi giờ) |
| Tiền | Số nguyên VND, ví dụ `90000` |
| ID | Số nguyên dương (`Long`) |
| Thành công | Trả thẳng JSON object hoặc mảng, **không bọc wrapper** |
| Lỗi | Xem mục 1.3 |

### 1.1 Port và database

| Thành phần | Port | Database |
|---|---|---|
| Frontend | 3000 | - |
| API Gateway | 8080 | - |
| User Service | 8081 | `cinema_user_db` |
| Movie Service | 8082 | `cinema_movie_db` |
| Booking Service | 8083 | `cinema_booking_db` |
| Payment Service | 8084 | `cinema_payment_db` |

Trong Docker Compose, các service gọi nhau theo tên: `http://movie-service:8082`, `http://booking-service:8083`, `http://payment-service:8084`, `http://user-service:8081`.

### 1.2 Xác thực và phân quyền

- **User Service phát hành JWT** (HS256), secret dùng chung qua biến môi trường `JWT_SECRET` (tối thiểu 32 ký tự).
- Claims bắt buộc: `sub` (userId), `email`, `role` (`CUSTOMER` hoặc `ADMIN`), `exp`.
- Frontend gửi header: `Authorization: Bearer <token>`.
- **Gateway kiểm tra JWT**, nếu hợp lệ thì gắn thêm 2 header xuống service phía sau:
  - `X-User-Id: <userId>`
  - `X-User-Role: CUSTOMER | ADMIN`
- **Các service phía sau không cần parse JWT**, chỉ đọc 2 header trên. Gateway luôn xóa các header `X-User-*` do client tự gửi để tránh giả mạo.
- Endpoint nào cần ADMIN thì service tự kiểm tra `X-User-Role == ADMIN`, nếu sai trả `403`.

Endpoint công khai (không cần token):

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/movies/**`, `GET /api/cinemas/**`, `GET /api/showtimes/**` (kể cả `/seats` và `/seat-status`)

Mọi endpoint còn lại cần token hợp lệ, nếu thiếu hoặc sai trả `401`.

### 1.3 Định dạng lỗi

```json
{
  "timestamp": "2026-11-05T10:15:30",
  "status": 409,
  "error": "Conflict",
  "message": "Ghế A5 đã được giữ hoặc đã bán",
  "path": "/api/bookings"
}
```

| HTTP | Khi nào dùng |
|---|---|
| 400 | Dữ liệu gửi lên sai hoặc thiếu |
| 401 | Chưa đăng nhập hoặc token sai/hết hạn |
| 403 | Không đủ quyền |
| 404 | Không tìm thấy tài nguyên |
| 409 | Xung đột nghiệp vụ (ghế đã bị giữ, đơn đã hết hạn, đã thanh toán...) |
| 500 | Lỗi hệ thống |

### 1.4 Các giá trị enum

| Enum | Giá trị |
|---|---|
| Role | `CUSTOMER`, `ADMIN` |
| Movie status | `NOW_SHOWING`, `COMING_SOON`, `ENDED` |
| Seat type | `STANDARD`, `VIP`, `COUPLE` |
| Seat status (Booking quản lý) | `AVAILABLE`, `HELD`, `SOLD` |
| Booking status | `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `EXPIRED` |
| Payment status | `SUCCESS`, `FAILED` |
| Payment method | `CARD`, `E_WALLET`, `BANK_TRANSFER` |

---

## 2. User Service (TV1, port 8081)

### POST /api/auth/register (công khai)

Request:

```json
{ "fullName": "Nguyen Van A", "email": "a@example.com", "password": "123456", "phone": "0900000000" }
```

Response `201`:

```json
{ "id": 1, "fullName": "Nguyen Van A", "email": "a@example.com", "phone": "0900000000", "role": "CUSTOMER" }
```

Lỗi: `409` nếu email đã tồn tại.

### POST /api/auth/login (công khai)

Request:

```json
{ "email": "a@example.com", "password": "123456" }
```

Response `200`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": 1, "fullName": "Nguyen Van A", "email": "a@example.com", "phone": "0900000000", "role": "CUSTOMER" }
}
```

Lỗi: `401` nếu sai email hoặc mật khẩu.

### GET /api/users/me

Trả về object `user` như trên của người dùng hiện tại (lấy từ `X-User-Id`).

### PUT /api/users/me

Request: `{ "fullName": "...", "phone": "..." }`. Response `200`: object `user` sau khi cập nhật.

> Tài khoản ADMIN mẫu để test: `admin@cinema.com` / `admin123` (User Service tự seed khi khởi động).

---

## 3. Movie Service (TV2/bạn, port 8082)

Movie Service **chỉ quản lý cấu trúc**: phim, rạp, phòng, ghế vật lý, suất chiếu. **Không** quản lý trạng thái giữ hoặc bán ghế.

### 3.1 Phim

#### GET /api/movies (công khai)

Query tùy chọn: `keyword` (tìm theo tên), `genre`, `status`.

Response `200`:

```json
[
  {
    "id": 1,
    "title": "Mai",
    "description": "Mô tả ngắn...",
    "genre": "Tâm lý",
    "durationMinutes": 131,
    "releaseDate": "2026-10-01",
    "posterUrl": "https://...",
    "trailerUrl": "https://...",
    "ageRating": "T16",
    "status": "NOW_SHOWING"
  }
]
```

#### GET /api/movies/{id} (công khai)

Trả về một object phim như trên. `404` nếu không có.

#### POST /api/movies (ADMIN)

Request: object phim như trên, bỏ `id`. Response `201`: object phim đã tạo.

#### PUT /api/movies/{id} (ADMIN)

Request giống POST. Response `200`: object phim sau cập nhật.

#### DELETE /api/movies/{id} (ADMIN)

Response `204`. `409` nếu phim còn suất chiếu trong tương lai.

### 3.2 Rạp và phòng chiếu

#### GET /api/cinemas (công khai)

```json
[ { "id": 1, "name": "CGV Vincom", "address": "72 Lê Thánh Tôn, Q1", "city": "TP.HCM" } ]
```

#### GET /api/cinemas/{id} (công khai)

Như trên, kèm danh sách phòng:

```json
{
  "id": 1, "name": "CGV Vincom", "address": "...", "city": "TP.HCM",
  "rooms": [ { "id": 1, "name": "Phòng 1", "totalRows": 8, "seatsPerRow": 10 } ]
}
```

#### POST/PUT/DELETE /api/cinemas[/{id}] (ADMIN)

Request: `{ "name", "address", "city" }`.

#### POST /api/cinemas/{cinemaId}/rooms (ADMIN)

Request:

```json
{ "name": "Phòng 1", "totalRows": 8, "seatsPerRow": 10 }
```

Movie Service **tự sinh ghế** theo `totalRows` x `seatsPerRow` (hàng `A`, `B`, ... và số ghế `1..n`). Mặc định `STANDARD`, hai hàng cuối là `VIP`. Response `201`: object phòng.

#### PUT /api/rooms/{id}, DELETE /api/rooms/{id} (ADMIN)

PUT nhận `{ "name" }` (không đổi kích thước sau khi đã có suất chiếu). DELETE trả `204`, `409` nếu phòng đã có suất chiếu.

#### PUT /api/rooms/{roomId}/seats/{seatId} (ADMIN)

Đổi loại ghế: `{ "type": "VIP" }`. Response `200`: object ghế.

### 3.3 Suất chiếu

#### GET /api/showtimes (công khai)

Query tùy chọn: `movieId`, `cinemaId`, `date` (dạng `2026-11-20`).

Response `200`:

```json
[
  {
    "id": 10,
    "movieId": 1,
    "movieTitle": "Mai",
    "cinemaId": 1,
    "cinemaName": "CGV Vincom",
    "roomId": 1,
    "roomName": "Phòng 1",
    "startTime": "2026-11-20T19:30:00",
    "endTime": "2026-11-20T21:41:00",
    "basePrice": 90000
  }
]
```

#### GET /api/showtimes/{id} (công khai)

Trả về một object suất chiếu như trên.

#### GET /api/showtimes/{id}/seats (công khai)

Trả về **cấu trúc ghế** của phòng chiếu và giá từng ghế **cho suất này**:

```json
{
  "showtimeId": 10,
  "roomId": 1,
  "roomName": "Phòng 1",
  "totalRows": 8,
  "seatsPerRow": 10,
  "seats": [
    { "id": 5, "row": "A", "number": 5, "label": "A5", "type": "STANDARD", "price": 90000 },
    { "id": 75, "row": "H", "number": 5, "label": "H5", "type": "VIP", "price": 117000 }
  ]
}
```

Quy tắc giá: `STANDARD` = `basePrice`, `VIP` = `basePrice x 1.3`, `COUPLE` = `basePrice x 2`. Làm tròn xuống đến hàng nghìn.

#### POST /api/showtimes (ADMIN)

Request:

```json
{ "movieId": 1, "roomId": 1, "startTime": "2026-11-20T19:30:00", "basePrice": 90000 }
```

`endTime` do server tính từ `durationMinutes` của phim cộng 15 phút dọn phòng. Response `201`: object suất chiếu. `409` nếu trùng giờ với suất khác trong cùng phòng.

#### PUT /api/showtimes/{id} (ADMIN), DELETE /api/showtimes/{id} (ADMIN)

PUT giống POST. DELETE trả `204`.

---

## 4. Booking Service (TV3, port 8083)

Booking Service là **chủ sở hữu trạng thái ghế**.

### GET /api/showtimes/{id}/seat-status (công khai)

Chỉ trả về ghế **không trống**. Ghế không có trong danh sách nghĩa là `AVAILABLE`.

```json
{
  "showtimeId": 10,
  "seats": [
    { "seatId": 5, "status": "HELD" },
    { "seatId": 6, "status": "SOLD" }
  ]
}
```

> Gateway phải định tuyến route này tới Booking Service **trước** route `/api/showtimes/**` của Movie Service.

### POST /api/bookings

Tạo đơn và **giữ ghế** trong 5 phút.

Request:

```json
{ "showtimeId": 10, "seatIds": [5, 6] }
```

Response `201`:

```json
{
  "bookingId": 1001,
  "status": "PENDING_PAYMENT",
  "totalAmount": 180000,
  "expiresAt": "2026-11-20T10:05:00",
  "showtimeId": 10,
  "movieTitle": "Mai",
  "cinemaName": "CGV Vincom",
  "roomName": "Phòng 1",
  "startTime": "2026-11-20T19:30:00",
  "seatLabels": ["A5", "A6"],
  "ticketCode": null,
  "createdAt": "2026-11-20T10:00:00"
}
```

Lỗi: `409` nếu có ghế đã `HELD` hoặc `SOLD`, `404` nếu suất chiếu hoặc ghế không tồn tại. Tối đa 8 ghế mỗi đơn.

### GET /api/bookings/my

Lịch sử đặt vé của người dùng hiện tại, mới nhất trước. Trả về mảng object booking như trên.

### GET /api/bookings/{id}

Trả về một booking. `403` nếu không phải chủ đơn (trừ ADMIN).

### POST /api/bookings/{id}/pay

Booking Service **tự gọi Payment Service** (đồng bộ) rồi trả kết quả luôn. Frontend không gọi Payment trực tiếp.

Request:

```json
{ "method": "CARD", "simulateResult": "SUCCESS" }
```

`simulateResult` là tùy chọn (`SUCCESS` hoặc `FAILED`), dùng khi demo để ép kết quả. Nếu bỏ trống thì Payment Service tự quyết định (mặc định thành công).

Response `200`:

```json
{
  "bookingId": 1001,
  "status": "CONFIRMED",
  "totalAmount": 180000,
  "ticketCode": "CB-1001-7F3A9",
  "paidAt": "2026-11-20T10:02:10",
  "payment": { "paymentId": 501, "status": "SUCCESS", "method": "CARD", "amount": 180000 }
}
```

Các trường booking khác (`movieTitle`, `seatLabels`...) vẫn có như ở mục `POST /api/bookings`. Mã QR do Frontend tự sinh từ `ticketCode`.

Nếu thanh toán thất bại: `status` của booking thành `CANCELLED`, ghế được giải phóng, `payment.status = "FAILED"`, vẫn trả HTTP `200` để Frontend hiển thị kết quả. Lỗi `409` nếu đơn đã `EXPIRED`, `CANCELLED` hoặc đã `CONFIRMED`.

**Chống thanh toán lặp:** gọi `pay` lần hai trên đơn đã `CONFIRMED` thì trả lại đúng kết quả cũ, không tạo giao dịch mới.

### POST /api/bookings/{id}/cancel

Hủy đơn đang `PENDING_PAYMENT` và giải phóng ghế. Response `200`: booking với `status = CANCELLED`.

### GET /api/bookings (ADMIN)

Query tùy chọn: `status`, `showtimeId`. Trả về mảng booking, mỗi phần tử có thêm `userId`.

### Tự động hết hạn

Booking Service có job định kỳ (mỗi 30 giây): đơn `PENDING_PAYMENT` quá `expiresAt` thì chuyển `EXPIRED` và giải phóng ghế.

---

## 5. Payment Service (TV4, port 8084)

### POST /internal/payments (chỉ Booking Service gọi)

Không đi qua Gateway. Request:

```json
{ "bookingId": 1001, "userId": 1, "amount": 180000, "method": "CARD", "simulateResult": "SUCCESS" }
```

Response `200` hoặc `201`:

```json
{ "paymentId": 501, "bookingId": 1001, "status": "SUCCESS", "method": "CARD", "amount": 180000, "createdAt": "2026-11-20T10:02:09" }
```

**Idempotency:** nếu đã có giao dịch `SUCCESS` cho `bookingId` này thì trả lại giao dịch cũ, không tạo mới.

### GET /api/payments (ADMIN)

Query tùy chọn: `status`. Trả về mảng giao dịch.

### GET /api/payments/booking/{bookingId}

Trả về giao dịch của đơn. Chỉ chủ đơn hoặc ADMIN xem được. `404` nếu chưa có.

---

## 6. Gateway: bảng định tuyến

Thứ tự khớp từ trên xuống dưới:

| Thứ tự | Đường dẫn | Chuyển tới | Cần JWT |
|---|---|---|---|
| 1 | `/api/auth/**` | user-service:8081 | Không |
| 2 | `/api/users/**` | user-service:8081 | Có |
| 3 | `/api/showtimes/*/seat-status` | booking-service:8083 | Không |
| 4 | `/api/movies/**`, `/api/cinemas/**`, `/api/rooms/**`, `/api/showtimes/**` | movie-service:8082 | Chỉ `GET` là công khai |
| 5 | `/api/bookings/**` | booking-service:8083 | Có |
| 6 | `/api/payments/**` | payment-service:8084 | Có |

Đường dẫn `/internal/**` bị Gateway chặn (trả `404`).

## 7. Luồng đặt vé (Frontend nhìn từ ngoài)

1. `GET /api/movies`, rồi `GET /api/showtimes?movieId=1`
2. `GET /api/showtimes/10/seats` (cấu trúc) cộng `GET /api/showtimes/10/seat-status` (trạng thái), Frontend ghép thành sơ đồ ghế
3. `POST /api/bookings` (giữ ghế, nhận `expiresAt`)
4. `POST /api/bookings/{id}/pay` (thanh toán, nhận `ticketCode`)
5. `GET /api/bookings/my` (xem lịch sử vé)

## 8. Việc mỗi người cần làm theo contract

| Người | Cần làm |
|---|---|
| TV1 | Phát hành JWT đúng claims, seed tài khoản ADMIN mẫu |
| TV2 (bạn) | Movie Service, Gateway, Frontend, docker-compose |
| TV3 | Gọi `GET http://movie-service:8082/api/showtimes/{id}/seats` để kiểm tra ghế và tính tiền, gọi `POST http://payment-service:8084/internal/payments` khi thanh toán |
| TV4 | Idempotency theo `bookingId`, hỗ trợ `simulateResult` |

---

## 9. Hạ tầng và cấu hình (để cả nhóm chạy được bằng Docker Compose)

### 9.1 Dockerfile

Mỗi service phải có `Dockerfile` trong thư mục của mình (`services/<tên>/Dockerfile`). Có thể sao chép mẫu của `services/movie-service/Dockerfile` rồi đổi số `EXPOSE` theo cổng của service. `docker-compose.yml` ở gốc repo sẽ build từ các Dockerfile này.

### 9.2 Biến môi trường mà mỗi service nên đọc

Hãy đọc cấu hình từ biến môi trường **kèm giá trị mặc định cho chạy trên máy**, để cùng một file `application.yml` chạy được cả trong Docker lẫn ngoài Docker. `docker-compose.yml` sẽ ghi đè các biến này.

| Biến | Mặc định (chạy local) | Dùng ở | Ý nghĩa |
|---|---|---|---|
| `DB_HOST` | `localhost` | Cả 4 service | Địa chỉ MySQL |
| `DB_PORT` | `3306` | Cả 4 service | Cổng MySQL |
| `DB_USERNAME` | `root` | Cả 4 service | Tài khoản MySQL |
| `DB_PASSWORD` | `root` | Cả 4 service | Mật khẩu MySQL |
| `JWT_SECRET` | xem dưới | User Service | Khóa ký JWT, **phải giống Gateway** |
| `MOVIE_SERVICE_URL` | `http://localhost:8082` | Booking Service | Gọi Movie Service |
| `PAYMENT_SERVICE_URL` | `http://localhost:8084` | Booking Service | Gọi Payment Service |
| `BOOKING_SERVICE_URL` | `http://localhost:8083` | Payment Service | Thông báo kết quả cho Booking Service |

Mẫu cấu hình kết nối database (thay `cinema_booking_db` bằng database của service mình):

```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:${DB_PORT:3306}/cinema_booking_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:root}
```

`JWT_SECRET` mặc định của cả hệ thống là `cinema-booking-soa-secret-key-change-me-0123456789`. User Service phải ký token bằng **đúng chuỗi này dùng nguyên văn (UTF-8), không giải mã Base64**, nếu không Gateway sẽ từ chối mọi token.

### 9.3 Thời gian và múi giờ

- Dùng `LocalDateTime` (giờ Việt Nam, không kèm múi giờ), trả JSON dạng `2026-11-20T19:30:00`.
- Cấu hình Jackson: `spring.jackson.serialization.write-dates-as-timestamps: false`.
- Docker Compose đặt `JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh` cho mọi service Java để `LocalDateTime.now()` trả giờ Việt Nam. Khi chạy ngoài Docker thì máy đã dùng giờ địa phương.
- Hạn giữ ghế (`expiresAt`) cũng theo cách này. Frontend so sánh nó với giờ của trình duyệt để đếm ngược.

### 9.4 Cổng trên máy khi chạy Docker

| Thành phần | Cổng trên máy |
|---|---|
| Frontend | 3000 |
| API Gateway | 8080 |
| User, Movie, Booking, Payment | 8081, 8082, 8083, 8084 |
| MySQL của User, Movie, Booking, Payment | 3307, 3308, 3309, 3310 (tránh đụng MySQL cài sẵn ở 3306) |

## 10. Các trường Frontend đang đọc

Frontend đã được viết sẵn theo các trường dưới đây. Response **được thêm trường**, nhưng xin **đừng đổi tên hoặc bỏ** các trường này.

| Endpoint | Trường Frontend dùng |
|---|---|
| `POST /api/auth/login` | `token`, `user.id`, `user.fullName`, `user.email`, `user.phone`, `user.role` |
| `GET /api/showtimes/{id}/seat-status` | `seats[].seatId`, `seats[].status` (`HELD` hoặc `SOLD`) |
| Mọi response đơn đặt vé (`POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/{id}`, `POST .../pay`, `POST .../cancel`, `GET /api/bookings`) | `bookingId`, `status`, `totalAmount`, `expiresAt`, `showtimeId`, `movieTitle`, `cinemaName`, `roomName`, `startTime`, `seatLabels`, `ticketCode`, `createdAt`, `paidAt` (khi đã thanh toán) |
| `GET /api/bookings` (ADMIN) | các trường trên **và `userId`** |
| `GET /api/payments` (ADMIN) | `paymentId`, `bookingId`, `status`, `method`, `amount`, `createdAt` (và `userId` nếu có) |
| `GET /api/payments/booking/{bookingId}` | `paymentId`, `status`, `method`, `amount`, `createdAt` |
| Mọi lỗi | `message` (hiển thị trực tiếp cho người dùng, nên viết bằng tiếng Việt) |

Lưu ý về ghế trong `seat-status`: ghế đang chờ thanh toán là `HELD`, ghế đã thanh toán là `SOLD`, ghế trống thì **không có** trong danh sách.

Lưu ý về `POST /api/bookings/{id}/pay`: khi thanh toán thất bại vẫn trả HTTP `200` với `status = CANCELLED`. Frontend dựa vào trường `status` chứ không dựa vào mã lỗi HTTP.