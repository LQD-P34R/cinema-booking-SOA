# Class Diagram của Movie Service

Các sơ đồ được vẽ theo mã nguồn trong `services/movie-service/src/main/java/com/cinema/movie/`. Mã chia 3 tầng: Controller nhận request, Service xử lý nghiệp vụ, Repository truy cập database.

## 1. Mô hình thực thể (package `entity`)

```mermaid
classDiagram
    class Movie {
        -Long id
        -String title
        -String description
        -String genre
        -Integer durationMinutes
        -LocalDate releaseDate
        -String posterUrl
        -String trailerUrl
        -String ageRating
        -MovieStatus status
    }

    class Cinema {
        -Long id
        -String name
        -String address
        -String city
        -List~Room~ rooms
    }

    class Room {
        -Long id
        -String name
        -Integer totalRows
        -Integer seatsPerRow
        -Cinema cinema
        -List~Seat~ seats
    }

    class Seat {
        -Long id
        -String seatRow
        -Integer seatNumber
        -SeatType type
        -Room room
        +getLabel() String
    }

    class Showtime {
        -Long id
        -Movie movie
        -Room room
        -LocalDateTime startTime
        -LocalDateTime endTime
        -Integer basePrice
    }

    class MovieStatus {
        <<enumeration>>
        NOW_SHOWING
        COMING_SOON
        ENDED
    }

    class SeatType {
        <<enumeration>>
        STANDARD
        VIP
        COUPLE
    }

    Cinema "1" *-- "0..*" Room : có
    Room "1" *-- "0..*" Seat : gồm
    Movie "1" --> "0..*" Showtime : được chiếu
    Room "1" --> "0..*" Showtime : tổ chức
    Movie --> MovieStatus
    Seat --> SeatType
```

Quan hệ thành phần (hình thoi đặc) thể hiện xóa rạp thì xóa các phòng, xóa phòng thì xóa các ghế (`cascade` và `orphanRemoval`).

## 2. Tầng Controller và Service

```mermaid
classDiagram
    class MovieController {
        <<RestController>>
        +search(keyword, genre, status) List~MovieResponse~
        +getById(id) MovieResponse
        +create(role, request) MovieResponse
        +update(role, id, request) MovieResponse
        +delete(role, id) void
    }

    class CinemaController {
        <<RestController>>
        +list() List~CinemaResponse~
        +getDetail(id) CinemaResponse
        +create(role, request) CinemaResponse
        +update(role, id, request) CinemaResponse
        +delete(role, id) void
    }

    class RoomController {
        <<RestController>>
        +create(role, cinemaId, request) RoomResponse
        +update(role, id, request) RoomResponse
        +delete(role, id) void
        +changeSeatType(role, roomId, seatId, request) SeatResponse
    }

    class ShowtimeController {
        <<RestController>>
        +search(movieId, cinemaId, date) List~ShowtimeResponse~
        +getById(id) ShowtimeResponse
        +getSeats(id) SeatLayoutResponse
        +create(role, request) ShowtimeResponse
        +update(role, id, request) ShowtimeResponse
        +delete(role, id) void
    }

    class MovieService {
        <<Service>>
        +search(keyword, genre, status) List~MovieResponse~
        +getById(id) MovieResponse
        +create(request) MovieResponse
        +update(id, request) MovieResponse
        +delete(id) void
    }

    class CinemaService {
        <<Service>>
        +list() List~CinemaResponse~
        +getDetail(id) CinemaResponse
        +create(request) CinemaResponse
        +update(id, request) CinemaResponse
        +delete(id) void
    }

    class RoomService {
        <<Service>>
        +create(cinemaId, request) RoomResponse
        +update(id, request) RoomResponse
        +delete(id) void
        +changeSeatType(roomId, seatId, type) SeatResponse
        -generateSeats(room) void
    }

    class ShowtimeService {
        <<Service>>
        +search(movieId, cinemaId, date) List~ShowtimeResponse~
        +getById(id) ShowtimeResponse
        +getSeatLayout(id) SeatLayoutResponse
        +create(request) ShowtimeResponse
        +update(id, request) ShowtimeResponse
        +delete(id) void
        -calculateEndTime(movie, startTime) LocalDateTime
        -validateNoOverlap(roomId, start, end, excludeId) void
    }

    class SeatPricingService {
        <<Service>>
        +priceFor(type, basePrice) int
    }

    class AuthHelper {
        <<utility>>
        +requireAdmin(role)$ void
    }

    class GlobalExceptionHandler {
        <<ControllerAdvice>>
    }

    class ApiException {
        -HttpStatus status
        +notFound(message)$ ApiException
        +conflict(message)$ ApiException
        +badRequest(message)$ ApiException
        +forbidden(message)$ ApiException
    }

    MovieController ..> MovieService
    CinemaController ..> CinemaService
    RoomController ..> RoomService
    ShowtimeController ..> ShowtimeService

    MovieController ..> AuthHelper : kiểm tra ADMIN
    CinemaController ..> AuthHelper
    RoomController ..> AuthHelper
    ShowtimeController ..> AuthHelper

    ShowtimeService ..> SeatPricingService : tính giá ghế
    MovieService ..> ApiException : ném lỗi
    CinemaService ..> ApiException
    RoomService ..> ApiException
    ShowtimeService ..> ApiException
    GlobalExceptionHandler ..> ApiException : đổi thành JSON lỗi
```

## 3. Tầng Service và Repository

```mermaid
classDiagram
    class MovieService
    class CinemaService
    class RoomService
    class ShowtimeService

    class MovieRepository {
        <<JpaRepository>>
        +search(keyword, genre, status) List~Movie~
    }

    class CinemaRepository {
        <<JpaRepository>>
    }

    class RoomRepository {
        <<JpaRepository>>
        +findByCinemaId(cinemaId) List~Room~
    }

    class SeatRepository {
        <<JpaRepository>>
        +findByRoomIdOrderBySeatRowAscSeatNumberAsc(roomId) List~Seat~
        +findByIdAndRoomId(id, roomId) Optional~Seat~
    }

    class ShowtimeRepository {
        <<JpaRepository>>
        +search(movieId, cinemaId, from, to) List~Showtime~
        +findDetailById(id) Optional~Showtime~
        +countOverlapping(roomId, start, end, excludeId) long
        +existsByRoomId(roomId) boolean
        +existsByMovieIdAndStartTimeAfter(movieId, time) boolean
    }

    MovieService ..> MovieRepository
    MovieService ..> ShowtimeRepository : chặn xóa phim còn suất tương lai

    CinemaService ..> CinemaRepository
    CinemaService ..> ShowtimeRepository : chặn xóa rạp có suất chiếu

    RoomService ..> RoomRepository
    RoomService ..> CinemaRepository
    RoomService ..> SeatRepository
    RoomService ..> ShowtimeRepository : chặn xóa phòng có suất chiếu

    ShowtimeService ..> ShowtimeRepository : lọc và kiểm tra trùng giờ
    ShowtimeService ..> MovieRepository
    ShowtimeService ..> RoomRepository
    ShowtimeService ..> SeatRepository
```

## 4. DTO (package `dto`)

DTO tách dữ liệu trao đổi qua API khỏi entity, để đặt tên trường theo `api-contract.md` và kiểm tra dữ liệu đầu vào. Tất cả là `record` của Java 17.

| DTO | Loại | Dùng cho | Ghi chú |
|---|---|---|---|
| `MovieRequest` | Request | Thêm, sửa phim | Kiểm tra tên không trống, thời lượng lớn hơn 0 |
| `MovieResponse` | Response | Mọi API phim | Có `from(Movie)` |
| `CinemaRequest` | Request | Thêm, sửa rạp | Tên, địa chỉ, thành phố bắt buộc |
| `CinemaResponse` | Response | Danh sách và chi tiết rạp | `summary()` không kèm phòng, `detail()` kèm phòng |
| `RoomRequest` | Request | Thêm phòng | 1 đến 26 hàng, 1 đến 30 ghế mỗi hàng |
| `RoomUpdateRequest` | Request | Đổi tên phòng | Chỉ có tên |
| `RoomResponse` | Response | Phòng | Có thêm `cinemaId` |
| `ShowtimeRequest` | Request | Thêm, sửa suất chiếu | Không có `endTime`, server tự tính |
| `ShowtimeResponse` | Response | Suất chiếu | Kèm tên phim, rạp, phòng |
| `SeatResponse` | Response | Một ghế | Đổi `seatRow` thành `row`, `seatNumber` thành `number`, `price` chỉ có khi gắn với suất chiếu |
| `SeatLayoutResponse` | Response | `GET /api/showtimes/{id}/seats` | Booking Service cũng gọi |
| `SeatTypeRequest` | Request | Đổi loại ghế | Chỉ có `type` |

## 5. Các lớp hỗ trợ

| Lớp | Package | Vai trò |
|---|---|---|
| `GlobalExceptionHandler` | `exception` | Đổi mọi lỗi thành JSON `timestamp, status, error, message, path` |
| `ApiException` | `exception` | Lỗi nghiệp vụ mang mã HTTP, Service chỉ cần `throw ApiException.notFound(...)` |
| `ErrorResponse` | `exception` | Cấu trúc JSON của lỗi |
| `AuthHelper` | `security` | Đọc header `X-User-Role` do Gateway gắn, ném 403 nếu không phải ADMIN |
| `DataInitializer` | `config` | Nạp dữ liệu mẫu (phim, rạp, phòng, suất chiếu 7 ngày) ở lần chạy đầu |