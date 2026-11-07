package com.cinema.movie.dto;

import com.cinema.movie.entity.SeatType;
import jakarta.validation.constraints.NotNull;

/** Request cho PUT /api/rooms/{roomId}/seats/{seatId} (ADMIN): đổi loại ghế. */
public record SeatTypeRequest(
        @NotNull(message = "Loại ghế không được để trống")
        SeatType type
) {
}