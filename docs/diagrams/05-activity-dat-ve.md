# Activity Diagram

## 1. Quy trình đặt vé và thanh toán

Mermaid không có kiểu Activity Diagram riêng nên sơ đồ dùng flowchart: hai làn (Khách hàng và Hệ thống) là hai khung, hình thoi là điểm rẽ nhánh, vòng tròn là điểm bắt đầu và kết thúc.

```mermaid
flowchart TD
    Start(("Bắt đầu"))
    EndOK(("Kết thúc: có vé"))
    EndFail(("Kết thúc: không có vé"))

    subgraph KH["Khách hàng"]
        K1["Chọn phim và suất chiếu"]
        K2["Chọn ghế trên sơ đồ"]
        K3{"Trong 5 phút, khách làm gì?"}
        K4["Chọn phương thức và bấm Thanh toán"]
        K5["Bấm Hủy đơn"]
        K6["Nhận vé điện tử và mã QR"]
        K7["Xem thông báo lỗi"]
    end

    subgraph HT["Hệ thống"]
        H1["Hiển thị sơ đồ ghế: trống, đang giữ, đã bán"]
        H2{"Tất cả ghế đã chọn còn trống?"}
        H3["Báo ghế đã bị giữ hoặc mua, tải lại sơ đồ ghế"]
        H4["Tạo đơn PENDING_PAYMENT, giữ ghế 5 phút"]
        H5{"Còn trong thời gian giữ ghế?"}
        H6["Tạo giao dịch thanh toán mô phỏng"]
        H7{"Thanh toán thành công?"}
        H8["Đơn CONFIRMED, ghế chuyển SOLD, phát hành mã vé"]
        H9["Đơn CANCELLED, giải phóng ghế"]
        H10["Đơn EXPIRED, giải phóng ghế tự động"]
    end

    Start --> K1 --> H1 --> K2 --> H2
    H2 -->|"Không"| H3 --> K7 --> H1
    H2 -->|"Có"| H4 --> K3

    K3 -->|"Thanh toán"| K4 --> H5
    K3 -->|"Hủy đơn"| K5 --> H9
    K3 -->|"Không làm gì"| H10

    H5 -->|"Không"| H10
    H5 -->|"Có"| H6 --> H7

    H7 -->|"Có"| H8 --> K6 --> EndOK
    H7 -->|"Không"| H9

    H9 --> EndFail
    H10 --> EndFail
```

## 2. Giải thích các điểm rẽ nhánh

| Điểm rẽ nhánh | Điều kiện | Kết quả |
|---|---|---|
| Ghế còn trống? | Mọi ghế khách chọn đều chưa bị giữ hoặc bán | Có: tạo đơn. Không: trả lỗi 409, khách chọn lại |
| Khách làm gì trong 5 phút | Thanh toán, hủy hoặc bỏ mặc | Ba nhánh khác nhau, đều kết thúc đúng một trạng thái |
| Còn thời gian giữ ghế? | `expiresAt` chưa qua | Không: đơn `EXPIRED`, thanh toán bị từ chối (409) |
| Thanh toán thành công? | Kết quả giao dịch của Payment Service | Có: vé được phát hành. Không: hành động bù, giải phóng ghế |

## 3. Quy trình quản trị: thêm suất chiếu

```mermaid
flowchart TD
    Start(("Bắt đầu"))
    EndOK(("Kết thúc: suất chiếu đã tạo"))
    EndFail(("Kết thúc: chưa tạo"))

    subgraph AD["Quản trị viên"]
        A1["Mở tab Suất chiếu, bấm Thêm suất chiếu"]
        A2["Chọn phim, phòng, giờ bắt đầu và giá"]
        A3["Xem giờ kết thúc dự kiến, bấm Lưu"]
        A4["Đọc lỗi, sửa giờ hoặc phòng"]
    end

    subgraph HT["Hệ thống"]
        H1{"Người dùng là ADMIN?"}
        H2{"Giờ bắt đầu ở tương lai?"}
        H3["Tính giờ kết thúc = bắt đầu + thời lượng phim + 15 phút dọn phòng"]
        H4{"Phòng có suất khác chồng giờ?"}
        H5["Lưu suất chiếu"]
        H6["Trả lỗi 403"]
        H7["Trả lỗi 400"]
        H8["Trả lỗi 409"]
    end

    Start --> A1 --> H1
    H1 -->|"Không"| H6 --> EndFail
    H1 -->|"Có"| A2 --> A3 --> H2
    H2 -->|"Không"| H7 --> A4
    H2 -->|"Có"| H3 --> H4
    H4 -->|"Có"| H8 --> A4
    A4 --> A2
    H4 -->|"Không"| H5 --> EndOK
```