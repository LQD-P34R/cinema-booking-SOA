package com.cinema.booking.service;

import com.cinema.booking.client.PaymentServiceClient;
import com.cinema.booking.dto.BookingResponse;
import com.cinema.booking.dto.PayBookingRequest;
import com.cinema.booking.dto.PaymentChargeResponse;
import org.springframework.stereotype.Service;

@Service
public class PaymentOrchestrator {
    private final BookingStateService states;
    private final PaymentServiceClient payments;

    public PaymentOrchestrator(BookingStateService states, PaymentServiceClient payments) {
        this.states = states;
        this.payments = payments;
    }

    public BookingResponse pay(Long bookingId, Long userId, String role, PayBookingRequest request) {
        // Transaction 1: khóa booking, ghi nhận yêu cầu và đặt lease ngắn.
        BookingStateService.PaymentWork work = states.beginPayment(bookingId, userId, role, request);
        if (work.alreadyConfirmed() != null) return work.alreadyConfirmed();

        // Gọi service bên ngoài KHÔNG giữ khóa database của Booking Service.
        PaymentChargeResponse response = payments.charge(work.charge());

        // Transaction 2: xác minh kết quả và chuyển HELD -> SOLD hoặc hủy.
        return states.finishPayment(work, response);
    }

    public void recover(Long bookingId) {
        states.beginRecovery(bookingId).ifPresent(work -> {
            PaymentChargeResponse response = payments.charge(work.charge());
            states.finishPayment(work, response);
        });
    }
}
