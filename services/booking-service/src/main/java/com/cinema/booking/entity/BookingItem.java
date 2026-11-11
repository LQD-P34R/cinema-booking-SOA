package com.cinema.booking.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "booking_items", uniqueConstraints =
        @UniqueConstraint(name = "uq_booking_items_booking_seat", columnNames = {"booking_id", "seat_id"}))
public class BookingItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;
    @Column(name = "seat_id", nullable = false)
    private Long seatId;
    @Column(name = "seat_label", nullable = false, length = 10)
    private String seatLabel;
    @Column(nullable = false)
    private Long price;

    protected BookingItem() {}
    public BookingItem(Booking booking, Long seatId, String seatLabel, long price) {
        this.booking = booking;
        this.seatId = seatId;
        this.seatLabel = seatLabel;
        this.price = price;
    }
    public Long getId() { return id; }
    public Long getSeatId() { return seatId; }
    public String getSeatLabel() { return seatLabel; }
    public Long getPrice() { return price; }
}
