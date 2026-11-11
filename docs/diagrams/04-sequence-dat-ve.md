# Sequence Diagram

Các sơ đồ dưới đây bám theo `docs/api-contract.md`. Hai service Booking và Payment do thành viên khác phụ trách, nên các bước bên trong chúng được vẽ ở mức hành vi mà contract yêu cầu.

## 1. Đăng nhập và kiểm tra JWT tại Gateway

```mermaid
sequenceDiagram
    autonumber
    actor U as Người dùng
    participant FE as Frontend
    participant GW as API Gateway
    participant US as User Service
    participant MS as Movie Service

    U->>FE: Nhập email và mật khẩu
    FE->>GW: POST /api/auth/login
    GW->>US: Chuyển tiếp (đường dẫn công khai, không cần token)
    US-->>GW: 200 kèm token JWT và thông tin người dùng
    GW-->>FE: 200 kèm token và user
    FE->>FE: Lưu token vào localStorage

    Note over FE,MS: Từ đây mọi request mang theo token
    FE->>GW: POST /api/movies kèm Authorization Bearer token
    GW->>GW: Xóa X-User-Id và X-User-Role do client gửi, kiểm tra chữ ký và hạn của JWT

    alt Token thiếu, sai hoặc hết hạn
        GW-->>FE: 401 kèm message
        FE->>FE: Xóa phiên, chuyển sang trang đăng nhập
    else Token hợp lệ
        GW->>MS: Chuyển tiếp, gắn X-User-Id và X-User-Role từ claims
        MS->>MS: Kiểm tra X-User-Role có phải ADMIN
        alt Không phải ADMIN
            MS-->>GW: 403
            GW-->>FE: 403
        else Là ADMIN
            MS-->>GW: 201 kèm phim vừa tạo
            GW-->>FE: 201
        end
    end
```

## 2. Xem sơ đồ ghế của một suất chiếu

Cấu trúc ghế và giá nằm ở Movie Service, trạng thái ghế nằm ở Booking Service. Frontend gọi song song hai nơi rồi ghép lại.

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách hàng
    participant FE as Frontend
    participant GW as API Gateway
    participant MS as Movie Service
    participant BS as Booking Service

    K->>FE: Chọn một suất chiếu
    par Cấu trúc ghế và giá
        FE->>GW: GET /api/showtimes/10/seats
        GW->>MS: Chuyển tiếp
        MS-->>GW: Danh sách ghế của phòng kèm loại ghế và giá
        GW-->>FE: 200
    and Trạng thái ghế
        FE->>GW: GET /api/showtimes/10/seat-status
        GW->>BS: Chuyển tiếp (route seat-status đứng trước route showtimes)
        BS-->>GW: Chỉ các ghế HELD và SOLD
        GW-->>FE: 200
    end
    FE->>FE: Ghép hai kết quả, ghế không có trong seat-status là AVAILABLE
    FE-->>K: Hiển thị sơ đồ ghế
    loop Mỗi 15 giây
        FE->>GW: GET /api/showtimes/10/seat-status
        GW->>BS: Chuyển tiếp
        BS-->>FE: Trạng thái mới nhất
    end
```

## 3. Đặt vé và thanh toán thành công

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách hàng
    participant FE as Frontend
    participant GW as API Gateway
    participant BS as Booking Service
    participant MS as Movie Service
    participant PS as Payment Service

    K->>FE: Chọn ghế A5 và A6, bấm Giữ ghế
    FE->>GW: POST /api/bookings gồm showtimeId và seatIds
    GW->>GW: Kiểm tra JWT, gắn X-User-Id
    GW->>BS: Chuyển tiếp
    BS->>MS: GET /api/showtimes/10 và /api/showtimes/10/seats
    MS-->>BS: Thông tin suất chiếu, danh sách ghế và giá
    BS->>BS: Kiểm tra ghế hợp lệ và còn trống, tính tổng tiền
    BS->>BS: Giữ ghế 5 phút, tạo đơn PENDING_PAYMENT
    BS-->>GW: 201 kèm bookingId, totalAmount, expiresAt
    GW-->>FE: 201
    FE-->>K: Chuyển sang trang thanh toán, bắt đầu đếm ngược

    K->>FE: Chọn phương thức, bấm Thanh toán
    FE->>GW: POST /api/bookings/1001/pay
    GW->>BS: Chuyển tiếp
    BS->>BS: Kiểm tra đơn thuộc khách này và còn hạn giữ ghế
    BS->>PS: POST /internal/payments gồm bookingId, userId, amount, method
    PS->>PS: Tạo giao dịch (chống lặp theo bookingId)
    PS-->>BS: Giao dịch SUCCESS
    BS->>BS: Đơn CONFIRMED, ghế chuyển SOLD, phát hành ticketCode
    BS-->>GW: 200 kèm status CONFIRMED, ticketCode, payment
    GW-->>FE: 200
    FE-->>K: Hiển thị vé điện tử, mã QR vẽ từ ticketCode
```

## 4. Thanh toán thất bại (hành động bù)

Booking Service và Payment Service nằm ở hai database khác nhau nên không có transaction chung. Khi thanh toán thất bại, Booking Service thực hiện hành động bù là hủy đơn và giải phóng ghế.

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách hàng
    participant FE as Frontend
    participant BS as Booking Service
    participant PS as Payment Service

    K->>FE: Bấm Thanh toán (đơn đang PENDING_PAYMENT)
    FE->>BS: POST /api/bookings/1001/pay
    BS->>PS: POST /internal/payments
    PS-->>BS: Giao dịch FAILED
    BS->>BS: Hành động bù: đơn CANCELLED, giải phóng ghế
    BS-->>FE: 200 kèm status CANCELLED và payment FAILED
    Note over FE: Thanh toán thất bại vẫn trả HTTP 200, Frontend dựa vào trường status
    FE-->>K: Báo thanh toán không thành công, gợi ý Chọn ghế lại
```

## 5. Hết thời gian giữ ghế

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách hàng
    participant FE as Frontend
    participant BS as Booking Service
    participant JOB as Job định kỳ (30 giây)

    K->>FE: Mở trang thanh toán rồi không làm gì
    FE->>FE: Đồng hồ đếm ngược về 00:00, khóa nút thanh toán
    JOB->>BS: Tìm đơn PENDING_PAYMENT đã quá expiresAt
    BS->>BS: Đơn chuyển EXPIRED, giải phóng ghế
    FE->>BS: GET /api/bookings/1001 (đồng bộ trạng thái)
    BS-->>FE: status EXPIRED
    FE-->>K: Thông báo đã hết thời gian giữ ghế, nút Chọn ghế lại

    opt Khách vẫn gửi yêu cầu thanh toán muộn
        K->>FE: Bấm Thanh toán
        FE->>BS: POST /api/bookings/1001/pay
        BS-->>FE: 409 Đơn đặt vé đã hết hạn giữ ghế
    end
```

## 6. Hai khách cùng chọn một ghế (chống đặt trùng)

Việc kiểm tra ghế còn trống và giữ ghế phải thực hiện **nguyên tử** ở Booking Service (khóa hoặc ràng buộc duy nhất trong database), để dù hai request đến cùng lúc cũng chỉ một request thắng.

```mermaid
sequenceDiagram
    autonumber
    actor A as Khách A
    actor B as Khách B
    participant FEA as Frontend của A
    participant FEB as Frontend của B
    participant BS as Booking Service

    Note over A,B: Cả hai cùng thấy ghế A5 đang trống
    A->>FEA: Chọn A5, bấm Giữ ghế
    B->>FEB: Chọn A5, bấm Giữ ghế
    FEA->>BS: POST /api/bookings với ghế A5
    FEB->>BS: POST /api/bookings với ghế A5

    BS->>BS: Giữ ghế một cách nguyên tử, chỉ một yêu cầu thành công
    BS-->>FEA: 201 PENDING_PAYMENT, ghế A5 đang giữ cho A
    BS-->>FEB: 409 Ghế A5 đã được giữ hoặc đã bán

    FEB->>BS: GET /api/showtimes/10/seat-status
    BS-->>FEB: A5 là HELD
    FEB-->>B: Hiện lỗi, sơ đồ ghế cập nhật, bỏ ghế A5 khỏi lựa chọn
    FEA-->>A: Chuyển sang trang thanh toán
```

## 7. Thanh toán lặp trên đơn đã thành công

```mermaid
sequenceDiagram
    autonumber
    actor K as Khách hàng
    participant FE as Frontend
    participant BS as Booking Service
    participant PS as Payment Service

    K->>FE: Bấm Thanh toán lần nữa (mạng chậm, bấm đúp hoặc tải lại)
    FE->>BS: POST /api/bookings/1001/pay
    BS->>BS: Đơn đã CONFIRMED
    BS-->>FE: 200 trả lại kết quả cũ (cùng ticketCode)
    Note over BS,PS: Không gọi Payment Service, không tạo giao dịch mới, không xác nhận vé hai lần
```

## 8. Admin thêm suất chiếu

```mermaid
sequenceDiagram
    autonumber
    actor AD as Quản trị viên
    participant FE as Frontend
    participant GW as API Gateway
    participant MS as Movie Service
    participant DB as cinema_movie_db

    AD->>FE: Chọn phim, phòng, giờ bắt đầu, giá, bấm Lưu
    FE->>GW: POST /api/showtimes kèm token ADMIN
    GW->>MS: Chuyển tiếp với X-User-Role ADMIN
    MS->>DB: Lấy phim và phòng
    MS->>MS: Kiểm tra giờ bắt đầu ở tương lai
    MS->>MS: Tính giờ kết thúc = bắt đầu + thời lượng phim + 15 phút dọn phòng
    MS->>DB: Đếm suất trong cùng phòng bị chồng khung giờ

    alt Có suất trùng giờ
        MS-->>GW: 409 Phòng chiếu đã có suất khác trùng khung giờ này
        GW-->>FE: 409
        FE-->>AD: Hiện lỗi trong hộp thoại, giữ nguyên dữ liệu đã nhập
    else Không trùng
        MS->>DB: Lưu suất chiếu
        MS-->>GW: 201 kèm suất chiếu
        GW-->>FE: 201
        FE-->>AD: Đóng hộp thoại, làm mới bảng suất chiếu
    end
```