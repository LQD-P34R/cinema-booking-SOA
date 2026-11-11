package com.cinema.booking.dto;

import com.cinema.booking.entity.PaymentMethod;
import com.cinema.booking.entity.PaymentResult;

public record PaymentChargeRequest(Long bookingId, Long userId, Long amount,
                                   PaymentMethod method, PaymentResult simulateResult) {}
