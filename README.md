# Cinema Booking SOA

Hệ thống đặt vé xem phim trực tuyến theo kiến trúc hướng dịch vụ (Service-Oriented Architecture), xây dựng bằng **Spring Boot** và **ReactJS**. Đồ án môn *Phát triển phần mềm hướng dịch vụ*.

Khách hàng xem danh sách phim, chọn suất chiếu, chọn ghế, giữ ghế, thanh toán mô phỏng và nhận vé điện tử có mã QR. Quản trị viên quản lý phim, rạp, phòng chiếu, suất chiếu, đơn đặt vé và giao dịch.

## Kiến trúc

```
                  ┌───────────────┐
   Trình duyệt ──▶│   Frontend    │  React + Vite          :3000
                  └──────┬────────┘
                         │ HTTP (JSON), chỉ gọi qua Gateway
                  ┌──────▼────────┐
                  │  API Gateway  │  Spring Cloud Gateway   :8080
                  │ kiểm tra JWT  │  gắn X-User-Id, X-User-Role
                  └──┬───┬───┬──┬─┘
        ┌────────────┘   │   │  └─────────────┐
 ┌──────▼─────┐  ┌───────▼──┐ ┌▼───────────┐ ┌▼──────────────┐
 │User Service│  │  Movie   │ │  Booking   │ │   Payment     │
 │   :8081    │  │ Service  │ │  Service   │ │   Service     │
 │ JWT, tài   │  │  :8082   │ │   :8083    │ │    :8084      │
 │ khoản      │  │ phim,rạp,│ │ đặt vé,    │ │ thanh toán    │
 │            │  │ suất chiếu│ │ giữ ghế   │ │ mô phỏng      │
 └──────┬─────┘  └────┬─────┘ └─────┬──────┘ └───────┬───────┘
        │             │             │  ▲             │
   cinema_user_db  cinema_movie_db  │  └─ gọi Movie  │
                              cinema_booking_db      │
                                    └─ gọi Payment ──┘ cinema_payment_db
```

Nguyên tắc chính:

- **Mỗi service có database MySQL riêng**, không truy cập thẳng database của service khác, chỉ gọi qua API.
- **Gateway kiểm tra JWT** rồi gắn header `X-User-Id` và `X-User-Role` xuống các service. Các service không tự đọc token, chỉ đọc header và tự kiểm tra quyền ADMIN.
- **Booking Service sở hữu trạng thái ghế** (trống, đang giữ, đã bán). Movie Service chỉ quản lý cấu trúc ghế của phòng và giá. Frontend ghép hai nguồn này thành sơ đồ ghế.
- **Frontend không gọi Payment Service trực tiếp.** Nó gọi `POST /api/bookings/{id}/pay`, Booking Service tự gọi Payment Service rồi trả kết quả.
- Chi tiết endpoint, request, response và mã lỗi nằm trong [`docs/api-contract.md`](docs/api-contract.md). **Đây là tài liệu chuẩn của cả nhóm.**

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend | ReactJS 18, Vite, React Router |
| Backend | Java 17, Spring Boot 3.3 |
| API Gateway | Spring Cloud Gateway |
| Xác thực | JWT (HS256) |
| Cơ sở dữ liệu | MySQL 8 |
| Giao tiếp | REST API, JSON |
| Tài liệu API | Swagger UI (Movie Service) |
| Triển khai | Docker, Docker Compose |

## Cấu trúc thư mục

```
cinema-booking-SOA/
├── api-gateway/              Gateway: định tuyến, kiểm tra JWT, CORS
├── services/
│   ├── user-service/         Tài khoản, đăng nhập, JWT
│   ├── movie-service/        Phim, rạp, phòng, ghế, suất chiếu
│   ├── booking-service/      Đặt vé, giữ ghế, chống đặt trùng
│   └── payment-service/      Thanh toán mô phỏng, giao dịch
├── frontend/                 Giao diện khách hàng và quản trị
├── database/                 Script SQL
├── docs/                     api-contract.md, báo cáo, sơ đồ
├── postman/                  Bộ API kiểm thử
├── docker-compose.yml        Chạy cả hệ thống
└── README.md
```

## Cổng dịch vụ

| Thành phần | Cổng | Database |
|---|---|---|
| Frontend | 3000 | - |
| API Gateway | 8080 | - |
| User Service | 8081 | `cinema_user_db` |
| Movie Service | 8082 | `cinema_movie_db` |
| Booking Service | 8083 | `cinema_booking_db` |
| Payment Service | 8084 | `cinema_payment_db` |

## Cách chạy

### Cách 1: Docker Compose (một lệnh)

Yêu cầu: Docker Desktop (cần bật ảo hóa trong BIOS nếu máy chưa bật).

```bash
docker compose up --build
```

Sau khi các container khởi động xong, mở `http://localhost:3000`. Muốn dừng: `docker compose down`. Muốn xóa luôn dữ liệu: `docker compose down -v`.

Ghi chú:

- Cổng MySQL trên máy là **3307 đến 3310** (tránh đụng MySQL cài sẵn ở 3306).
- Mỗi service phải có `Dockerfile` trong thư mục của mình.
- Đổi JWT secret: tạo file `.env` ở gốc repo (xem `.env.example`) rồi chạy lại.

### Cách 2: Chạy từng phần trên máy

Yêu cầu: **JDK 17**, **Maven 3.9+**, **MySQL 8** (cổng 3306, user `root`, mật khẩu `root`), **Node.js 18+**.

**Movie Service** (không cần tạo database trước, tự tạo `cinema_movie_db` và nạp dữ liệu mẫu ở lần chạy đầu):

```bash
cd services/movie-service
mvn spring-boot:run
```

Kiểm tra: `http://localhost:8082/api/movies`, tài liệu API: `http://localhost:8082/swagger-ui.html`.

**API Gateway:**

```bash
cd api-gateway
mvn spring-boot:run
```

Kiểm tra: `http://localhost:8080/api/movies` (đi qua Gateway tới Movie Service).

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:3000`.

Với User, Booking, Payment Service: chạy theo hướng dẫn của người phụ trách mỗi service, nhớ dùng đúng cổng ở bảng trên.

### Chạy Frontend khi chưa có đủ các service (dữ liệu giả)

Frontend có chế độ dữ liệu giả mô phỏng đúng `api-contract.md`, dùng khi các service khác chưa xong. Tạo file `frontend/.env.local`:

```
VITE_USE_MOCK=true
```

rồi chạy lại `npm run dev`. Muốn dùng API thật thì xóa dòng đó. Địa chỉ Gateway mặc định là `http://localhost:8080`, đổi bằng biến `VITE_API_URL`.

### Tài khoản thử

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin@cinema.com` | `admin123` |
| Khách hàng (chỉ có ở chế độ dữ liệu giả) | `user@cinema.com` | `123456` |

Với API thật, tài khoản admin do User Service tạo sẵn khi khởi động, khách hàng tự đăng ký trên giao diện.

## Biến môi trường

| Biến | Dùng ở | Mặc định | Ý nghĩa |
|---|---|---|---|
| `DB_HOST`, `DB_PORT` | Các service | `localhost`, `3306` | Địa chỉ MySQL |
| `DB_USERNAME`, `DB_PASSWORD` | Các service | `root`, `root` | Tài khoản MySQL |
| `JWT_SECRET` | Gateway, User Service | xem `application.yml` | Khóa ký JWT, **hai nơi phải giống nhau**, tối thiểu 32 ký tự |
| `USER_SERVICE_URL`, `MOVIE_SERVICE_URL`, `BOOKING_SERVICE_URL`, `PAYMENT_SERVICE_URL` | Gateway | `http://localhost:808x` | Địa chỉ các service |
| `CINEMA_SEED_ENABLED` | Movie Service | `true` | Tắt nạp dữ liệu mẫu bằng `false` |
| `VITE_API_URL` | Frontend (lúc build) | `http://localhost:8080` | Địa chỉ Gateway mà trình duyệt dùng |
| `VITE_USE_MOCK` | Frontend (lúc build) | `false` | Bật dữ liệu giả |

## Phân công

| Thành viên | Phụ trách |
|---|---|
| TV1 | User Service |
| TV2 | Movie Service, API Gateway, Frontend, `docker-compose.yml`, tài liệu |
| TV3 | Booking Service |
| TV4 | Payment Service |

## Quy trình làm việc với Git

- Nhánh `main` chỉ chứa bản ổn định, nhánh `develop` để tích hợp.
- Mỗi người làm trên nhánh riêng `feature/<tên>`, tạo Pull Request vào `develop`.
- Không push trực tiếp vào `main`.
- Mỗi người chỉ sửa thư mục mình phụ trách. Cần đổi API thì báo chủ sở hữu service và cập nhật `docs/api-contract.md`.

## Hạn chế đã biết

- **Xóa hoặc đổi giờ suất chiếu đã có người đặt vé:** Movie Service không biết suất nào đã có vé (dữ liệu ở Booking Service) nên vẫn cho phép admin thao tác. Cách xử lý đầy đủ là Movie Service hỏi Booking Service trước khi xóa.
- **Thanh toán chỉ là mô phỏng**, không tích hợp cổng thanh toán thật.
- **Chưa có chức năng đổi loại từng ghế trên giao diện:** mặc định hai hàng cuối của phòng từ 4 hàng trở lên là ghế VIP.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân và cách xử lý |
|---|---|
| `mvn` hoặc `java` không nhận lệnh | Chưa cài hoặc chưa thêm vào `Path`. Đóng hẳn VS Code, mở lại sau khi cài |
| Spring báo `@ComponentScan of the default package` | File Java không nằm đúng thư mục theo dòng `package`, ví dụ `MovieServiceApplication.java` phải nằm trong `src/main/java/com/cinema/movie/` |
| `/api/movies` trả 404, log ghi `Found 0 JPA repository interfaces` | Các file entity, repository, controller chưa nằm đúng thư mục. Xóa thư mục `target/` và chạy lại |
| Cổng 8082 hoặc 8080 đã bị chiếm | Tắt tiến trình cũ: `netstat -ano \| findstr :8082` rồi `taskkill /PID <mã> /F` |
| Mọi request qua Gateway trả 401 | `JWT_SECRET` của Gateway và User Service khác nhau |
| F5 ở trang con báo 404 khi chạy Docker | Thiếu `frontend/nginx.conf` hoặc chưa build lại Frontend |
| Docker báo `Virtualization support not detected` | Bật Intel VT-x hoặc AMD SVM trong BIOS |