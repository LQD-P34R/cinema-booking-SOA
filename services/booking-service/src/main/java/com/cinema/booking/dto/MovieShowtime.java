package com.cinema.booking.dto;

import java.time.LocalDateTime;

public record MovieShowtime(Long id, Long movieId, String movieTitle, Long cinemaId,
                            String cinemaName, Long roomId, String roomName,
                            LocalDateTime startTime, LocalDateTime endTime, Integer basePrice) {}
