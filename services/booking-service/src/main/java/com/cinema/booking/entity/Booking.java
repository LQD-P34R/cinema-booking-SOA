package com.cinema.booking.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_bookings_user_created", columnList = "user_id,created_at"),
        @Index(name = "idx_bookings_status_expires", columnList = "status,expires_at"),
        @Index(name = "idx_bookings_showtime", columnList = "showtime_id")
})
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "showtime_id", nullable = false)
    private Long showtimeId;
    @Column(name = "movie_title", nullable = false, length = 255)
    private String movieTitle;
    @Column(name = "cinema_name", nullable = false, length = 255)
    private String cinemaName;
    @Column(name = "room_name", nullable = false, length = 100)
    private String roomName;
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;
    @Column(name = "total_amount", nullable = false)
    private Long totalAmount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BookingStatus status = BookingStatus.PENDING_PAYMENT;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "paid_at")
    private LocalDateTime paidAt;
    @Column(name = "ticket_code", unique = true, length = 50)
    private String ticketCode;

    @Column(name = "payment_id")
    private Long paymentId;
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", length = 10)
    private PaymentResult paymentStatus;
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;
    @Column(name = "payment_amount")
    private Long paymentAmount;
    @Column(name = "payment_created_at")
    private LocalDateTime paymentCreatedAt;
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_requested_result", length = 10)
    private PaymentResult paymentRequestedResult;
    @Column(name = "payment_processing_until")
    private LocalDateTime paymentProcessingUntil;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<BookingItem> items = new ArrayList<>();

    protected Booking() {}

    public Booking(Long userId, Long showtimeId, String movieTitle, String cinemaName,
                   String roomName, LocalDateTime startTime, Long totalAmount,
                   LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.userId = userId;
        this.showtimeId = showtimeId;
        this.movieTitle = movieTitle;
        this.cinemaName = cinemaName;
        this.roomName = roomName;
        this.startTime = startTime;
        this.totalAmount = totalAmount;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public void addItem(Long seatId, String label, long price) {
        items.add(new BookingItem(this, seatId, label, price));
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getShowtimeId() { return showtimeId; }
    public String getMovieTitle() { return movieTitle; }
    public String getCinemaName() { return cinemaName; }
    public String getRoomName() { return roomName; }
    public LocalDateTime getStartTime() { return startTime; }
    public Long getTotalAmount() { return totalAmount; }
    public BookingStatus getStatus() { return status; }
    public void setStatus(BookingStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
    public String getTicketCode() { return ticketCode; }
    public void setTicketCode(String ticketCode) { this.ticketCode = ticketCode; }
    public Long getPaymentId() { return paymentId; }
    public void setPaymentId(Long paymentId) { this.paymentId = paymentId; }
    public PaymentResult getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentResult paymentStatus) { this.paymentStatus = paymentStatus; }
    public PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public Long getPaymentAmount() { return paymentAmount; }
    public void setPaymentAmount(Long paymentAmount) { this.paymentAmount = paymentAmount; }
    public LocalDateTime getPaymentCreatedAt() { return paymentCreatedAt; }
    public void setPaymentCreatedAt(LocalDateTime paymentCreatedAt) { this.paymentCreatedAt = paymentCreatedAt; }
    public PaymentResult getPaymentRequestedResult() { return paymentRequestedResult; }
    public void setPaymentRequestedResult(PaymentResult paymentRequestedResult) { this.paymentRequestedResult = paymentRequestedResult; }
    public LocalDateTime getPaymentProcessingUntil() { return paymentProcessingUntil; }
    public void setPaymentProcessingUntil(LocalDateTime until) { this.paymentProcessingUntil = until; }
    public List<BookingItem> getItems() { return items; }
}
