package com.cinema.booking.dto;

import com.cinema.booking.entity.PaymentMethod;
import com.cinema.booking.entity.PaymentResult;

public record PaymentSummary(Long paymentId, PaymentResult status, PaymentMethod method, Long amount) {}
