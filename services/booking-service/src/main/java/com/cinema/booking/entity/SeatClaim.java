package com.cinema.booking.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "seat_claims", uniqueConstraints =
        @UniqueConstraint(name = "uq_seat_claims_showtime_seat", columnNames = {"showtime_id", "seat_id"}),
        indexes = @Index(name = "idx_seat_claims_status_expires", columnList = "status,expires_at"))
public class SeatClaim {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;
    @Column(name = "showtime_id", nullable = false)
    private Long showtimeId;
    @Column(name = "seat_id", nullable = false)
    private Long seatId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SeatClaimStatus status = SeatClaimStatus.HELD;
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    protected SeatClaim() {}
    public SeatClaim(Booking booking, Long showtimeId, Long seatId, LocalDateTime expiresAt) {
        this.booking = booking;
        this.showtimeId = showtimeId;
        this.seatId = seatId;
        this.expiresAt = expiresAt;
    }
    public Long getId() { return id; }
    public Long getSeatId() { return seatId; }
    public SeatClaimStatus getStatus() { return status; }
}
