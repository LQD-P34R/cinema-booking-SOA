package com.cinema.movie.dto;

import com.cinema.movie.entity.Showtime;

import java.time.LocalDateTime;

/**
 * Response của suất chiếu, khớp api-contract.md mục 3.3.
 * Showtime phải được tải kèm movie, room, cinema (JOIN FETCH) trước khi gọi from().
 */
public record ShowtimeResponse(
        Long id,
        Long movieId,
        String movieTitle,
        Long cinemaId,
        String cinemaName,
        Long roomId,
        String roomName,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Integer basePrice
) {

    public static ShowtimeResponse from(Showtime s) {
        return new ShowtimeResponse(
                s.getId(),
                s.getMovie().getId(),
                s.getMovie().getTitle(),
                s.getRoom().getCinema().getId(),
                s.getRoom().getCinema().getName(),
                s.getRoom().getId(),
                s.getRoom().getName(),
                s.getStartTime(),
                s.getEndTime(),
                s.getBasePrice()
        );
    }
}