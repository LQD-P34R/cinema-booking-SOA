package com.cinema.booking.dto;

import java.util.List;

public record MovieSeatLayout(Long showtimeId, Long roomId, String roomName,
                              Integer totalRows, Integer seatsPerRow, List<Seat> seats) {
    public record Seat(Long id, String row, Integer number, String label, String type, Long price) {}
}
