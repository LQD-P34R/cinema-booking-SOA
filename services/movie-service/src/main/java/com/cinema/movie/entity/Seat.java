package com.cinema.movie.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Ghế vật lý của một phòng chiếu.
 * Lưu ý: entity này KHÔNG chứa trạng thái giữ/đã bán, phần đó do Booking Service quản lý.
 */
@Entity
@Table(name = "seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_seat_position", columnNames = {"room_id", "seat_row", "seat_number"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    // Tên cột là seat_row vì "row" là từ khóa của MySQL 8
    @Column(name = "seat_row", nullable = false, length = 3)
    private String seatRow;      // A, B, C...

    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;  // 1, 2, 3...

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SeatType type = SeatType.STANDARD;

    // Nhãn hiển thị, ví dụ "A5" (không lưu vào database)
    @Transient
    public String getLabel() {
        return seatRow + seatNumber;
    }
}