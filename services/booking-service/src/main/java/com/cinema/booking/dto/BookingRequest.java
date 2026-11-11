package com.cinema.booking.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BookingRequest(
        @NotNull @Positive Long showtimeId,
        @NotEmpty @Size(max = 8, message = "Mỗi đơn được đặt từ 1 đến 8 ghế")
        List<@NotNull @Positive Long> seatIds
) {}
