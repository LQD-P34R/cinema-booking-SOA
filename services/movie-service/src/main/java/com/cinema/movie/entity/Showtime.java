package com.cinema.movie.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "showtimes", indexes = {
        @Index(name = "idx_showtimes_start_time", columnList = "start_time"),
        @Index(name = "idx_showtimes_room_time", columnList = "room_id, start_time, end_time")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    // Server tự tính: startTime + thời lượng phim + thời gian dọn phòng
    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    // Giá ghế STANDARD (VND). Ghế VIP/COUPLE được nhân hệ số khi trả về API
    @Column(name = "base_price", nullable = false)
    private Integer basePrice;
}