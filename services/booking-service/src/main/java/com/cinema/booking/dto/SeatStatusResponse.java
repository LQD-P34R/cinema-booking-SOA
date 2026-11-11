package com.cinema.booking.dto;

import com.cinema.booking.entity.SeatClaimStatus;
import java.util.List;

public record SeatStatusResponse(Long showtimeId, List<SeatStatus> seats) {
    public record SeatStatus(Long seatId, SeatClaimStatus status) {}
}
