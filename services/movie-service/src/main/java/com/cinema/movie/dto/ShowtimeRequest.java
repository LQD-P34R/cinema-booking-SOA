package com.cinema.movie.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

/**
 * Request cho POST /api/showtimes và PUT /api/showtimes/{id} (ADMIN).
 * endTime không nhận từ client, server tự tính.
 */
public record ShowtimeRequest(
        @NotNull(message = "Phim không được để trống")
        Long movieId,

        @NotNull(message = "Phòng chiếu không được để trống")
        Long roomId,

        @NotNull(message = "Giờ bắt đầu không được để trống")
        LocalDateTime startTime,

        @NotNull(message = "Giá vé không được để trống")
        @Min(value = 1000, message = "Giá vé tối thiểu 1.000 VND")
        Integer basePrice
) {
}