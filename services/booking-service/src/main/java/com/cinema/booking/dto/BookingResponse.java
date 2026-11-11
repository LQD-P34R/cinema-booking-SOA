package com.cinema.booking.dto;

import com.cinema.booking.entity.BookingStatus;
import java.time.LocalDateTime;
import java.util.List;

public record BookingResponse(
        Long bookingId,
        Long userId,
        BookingStatus status,
        Long totalAmount,
        LocalDateTime expiresAt,
        Long showtimeId,
        String movieTitle,
        String cinemaName,
        String roomName,
        LocalDateTime startTime,
        List<String> seatLabels,
        String ticketCode,
        LocalDateTime createdAt,
        LocalDateTime paidAt,
        PaymentSummary payment
) {}
