package com.cinema.booking.service;

import com.cinema.booking.entity.BookingStatus;
import com.cinema.booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class BookingExpirationService {
    private static final Logger log = LoggerFactory.getLogger(BookingExpirationService.class);
    private final BookingRepository bookings;
    private final BookingStateService states;
    private final PaymentOrchestrator payments;

    public BookingExpirationService(BookingRepository bookings, BookingStateService states,
                                    PaymentOrchestrator payments) {
        this.bookings = bookings;
        this.states = states;
        this.payments = payments;
    }

    private LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")); }

    // Chạy trước khi hiển thị/tạo đơn để ghế hết hạn được trả lại ngay, không chờ job.
    public void expireShowtime(Long showtimeId) {
        List<Long> ids = bookings.findDueIdsForShowtime(showtimeId, BookingStatus.PENDING_PAYMENT, now());
        for (Long id : ids) expireSafely(id);
    }

    @Scheduled(fixedDelayString = "${cinema.booking.expiration-scan-ms:30000}")
    public void scan() {
        for (Long id : bookings.findDueIds(BookingStatus.PENDING_PAYMENT, now())) {
            expireSafely(id);
        }
        // Thanh toán có kết quả chưa rõ KHÔNG được giải phóng ghế tùy tiện.
        // Gọi lại Payment Service bằng cùng bookingId (Payment phải idempotent).
        for (Long id : bookings.findRecoveryIds(BookingStatus.PENDING_PAYMENT, now())) {
            try {
                payments.recover(id);
            } catch (Exception ex) {
                log.warn("Chưa đối soát được giao dịch của booking {}: {}", id, ex.getMessage());
            }
        }
    }

    private void expireSafely(Long id) {
        try {
            states.expireIfDue(id);
        } catch (Exception ex) {
            log.warn("Không thể giải phóng booking {} lúc này: {}", id, ex.getMessage());
        }
    }
}
