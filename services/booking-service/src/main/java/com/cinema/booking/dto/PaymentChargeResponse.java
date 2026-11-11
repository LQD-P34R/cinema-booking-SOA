package com.cinema.booking.dto;

import com.cinema.booking.entity.PaymentMethod;
import com.cinema.booking.entity.PaymentResult;
import java.time.LocalDateTime;

public record PaymentChargeResponse(Long paymentId, Long bookingId, PaymentResult status,
                                    PaymentMethod method, Long amount, LocalDateTime createdAt) {}
