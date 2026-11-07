package com.cinema.movie.dto;

import com.cinema.movie.entity.Showtime;

import java.util.List;

/**
 * Response của GET /api/showtimes/{id}/seats.
 * Đây là cấu trúc ghế vật lý + giá từng ghế. Trạng thái trống/đang giữ/đã bán
 * KHÔNG nằm ở đây, Frontend lấy từ Booking Service (/seat-status) rồi ghép lại.
 * Booking Service cũng gọi endpoint này để kiểm tra ghế hợp lệ và tính tổng tiền.
 */
public record SeatLayoutResponse(
        Long showtimeId,
        Long roomId,
        String roomName,
        Integer totalRows,
        Integer seatsPerRow,
        List<SeatResponse> seats
) {

    /** Showtime phải được tải kèm room (JOIN FETCH). */
    public static SeatLayoutResponse of(Showtime showtime, List<SeatResponse> seats) {
        return new SeatLayoutResponse(
                showtime.getId(),
                showtime.getRoom().getId(),
                showtime.getRoom().getName(),
                showtime.getRoom().getTotalRows(),
                showtime.getRoom().getSeatsPerRow(),
                seats
        );
    }
}