package com.cinema.movie.dto;

import com.cinema.movie.entity.Room;

/** Response của phòng chiếu, khớp api-contract.md mục 3.2. */
public record RoomResponse(
        Long id,
        Long cinemaId,
        String name,
        Integer totalRows,
        Integer seatsPerRow
) {

    public static RoomResponse from(Room room) {
        return new RoomResponse(
                room.getId(),
                room.getCinema().getId(),
                room.getName(),
                room.getTotalRows(),
                room.getSeatsPerRow()
        );
    }
}