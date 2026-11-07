package com.cinema.movie.dto;

import com.cinema.movie.entity.Seat;
import com.cinema.movie.entity.SeatType;
import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Response của một ghế, khớp api-contract.md mục 3.3 (GET /api/showtimes/{id}/seats).
 * Trong DTO dùng tên "row" và "number" cho đúng JSON contract,
 * còn entity dùng seatRow/seatNumber để tránh từ khóa của MySQL.
 */
public record SeatResponse(
        Long id,
        String row,
        Integer number,
        String label,
        SeatType type,

        // Giá theo suất chiếu. Với API đổi loại ghế (không gắn suất chiếu) thì để null và sẽ không xuất hiện trong JSON
        @JsonInclude(JsonInclude.Include.NON_NULL)
        Integer price
) {

    /** Ghế kèm giá, dùng cho sơ đồ ghế của một suất chiếu. */
    public static SeatResponse from(Seat seat, Integer price) {
        return new SeatResponse(
                seat.getId(),
                seat.getSeatRow(),
                seat.getSeatNumber(),
                seat.getLabel(),
                seat.getType(),
                price
        );
    }

    /** Ghế không kèm giá, dùng cho API admin đổi loại ghế. */
    public static SeatResponse from(Seat seat) {
        return from(seat, null);
    }
}