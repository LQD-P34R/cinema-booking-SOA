package com.cinema.booking.dto;

import com.cinema.booking.entity.PaymentMethod;
import com.cinema.booking.entity.PaymentResult;
import jakarta.validation.constraints.NotNull;

public record PayBookingRequest(
        @NotNull PaymentMethod method,
        PaymentResult simulateResult
) {}
