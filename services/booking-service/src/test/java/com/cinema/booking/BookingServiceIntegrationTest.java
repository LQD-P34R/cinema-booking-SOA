package com.cinema.booking;

import com.cinema.booking.client.MovieServiceClient;
import com.cinema.booking.client.PaymentServiceClient;
import com.cinema.booking.dto.*;
import com.cinema.booking.entity.BookingStatus;
import com.cinema.booking.entity.PaymentMethod;
import com.cinema.booking.entity.PaymentResult;
import com.cinema.booking.exception.ApiException;
import com.cinema.booking.repository.BookingRepository;
import com.cinema.booking.repository.SeatClaimRepository;
import com.cinema.booking.service.BookingFacade;
import com.cinema.booking.service.BookingStateService;
import com.cinema.booking.service.PaymentOrchestrator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class BookingServiceIntegrationTest {
    @Autowired BookingFacade facade;
    @Autowired BookingRepository bookings;
    @Autowired SeatClaimRepository claims;
    @Autowired BookingStateService state;
    @Autowired PaymentOrchestrator paymentOrchestrator;
    @Autowired JdbcTemplate jdbc;
    @MockBean MovieServiceClient movies;
    @MockBean PaymentServiceClient payments;

    @BeforeEach
    void prepare() {
        claims.deleteAll();
        bookings.deleteAll();
        reset(movies, payments);
        MovieShowtime showtime = new MovieShowtime(10L, 1L, "Phim thử nghiệm", 1L,
                "Rạp thử nghiệm", 1L, "Phòng 1", LocalDateTime.now().plusDays(7),
                LocalDateTime.now().plusDays(7).plusHours(2), 90000);
        MovieSeatLayout layout = new MovieSeatLayout(10L, 1L, "Phòng 1", 2, 2,
                List.of(new MovieSeatLayout.Seat(5L, "A", 5, "A5", "STANDARD", 90000L),
                        new MovieSeatLayout.Seat(6L, "A", 6, "A6", "STANDARD", 90000L)));
        when(movies.getShowtime(10L)).thenReturn(showtime);
        when(movies.getSeatLayout(10L)).thenReturn(layout);
    }

    @Test
    void holdsMultipleSeatsAndExposesTheirState() {
        BookingResponse booking = facade.hold(1L, new BookingRequest(10L, List.of(5L, 6L)));
        assertEquals(BookingStatus.PENDING_PAYMENT, booking.status());
        assertEquals(180000L, booking.totalAmount());
        assertEquals(List.of("A5", "A6"), booking.seatLabels());
        assertEquals(2, facade.status(10L).seats().size());
        assertEquals(1, facade.mine(1L).size());
        assertEquals(0, facade.mine(2L).size());
    }

    @Test
    void aSeatCannotBeHeldTwice() {
        facade.hold(1L, new BookingRequest(10L, List.of(5L)));
        assertThrows(DataIntegrityViolationException.class,
                () -> facade.hold(2L, new BookingRequest(10L, List.of(5L, 6L))));
        assertEquals(1L, bookings.count()); // toàn bộ đơn thứ hai rollback
        assertEquals(1L, claims.count());
    }

    @Test
    void validatesSeatsAndOwnership() {
        assertThrows(ApiException.class,
                () -> facade.hold(1L, new BookingRequest(10L, List.of(5L, 5L))));
        assertThrows(ApiException.class,
                () -> facade.hold(1L, new BookingRequest(10L, List.of(999L))));
        BookingResponse booking = facade.hold(1L, new BookingRequest(10L, List.of(5L)));
        assertThrows(ApiException.class, () -> facade.get(booking.bookingId(), 2L, "CUSTOMER"));
        assertEquals(booking.bookingId(), facade.get(booking.bookingId(), 2L, "ADMIN").bookingId());
        assertThrows(ApiException.class, () -> facade.all("CUSTOMER", null, null));
    }

    @Test
    void successfulPaymentIsIdempotentAndKeepsSeatSold() {
        BookingResponse held = facade.hold(1L, new BookingRequest(10L, List.of(5L)));
        when(payments.charge(any())).thenAnswer(inv -> {
            PaymentChargeRequest r = inv.getArgument(0);
            return new PaymentChargeResponse(501L, r.bookingId(), PaymentResult.SUCCESS,
                    r.method(), r.amount(), LocalDateTime.now());
        });
        PayBookingRequest request = new PayBookingRequest(PaymentMethod.CARD, PaymentResult.SUCCESS);
        BookingResponse paid = facade.pay(held.bookingId(), 1L, "CUSTOMER", request);
        assertEquals(BookingStatus.CONFIRMED, paid.status());
        assertNotNull(paid.ticketCode());
        assertEquals(PaymentResult.SUCCESS, paid.payment().status());
        assertEquals("SOLD", facade.status(10L).seats().get(0).status().name());
        BookingResponse repeated = facade.pay(held.bookingId(), 1L, "CUSTOMER", request);
        assertEquals(paid.ticketCode(), repeated.ticketCode());
        verify(payments, times(1)).charge(any());
    }

    @Test
    void failedPaymentReleasesSeat() {
        BookingResponse held = facade.hold(1L, new BookingRequest(10L, List.of(5L)));
        when(payments.charge(any())).thenAnswer(inv -> {
            PaymentChargeRequest r = inv.getArgument(0);
            return new PaymentChargeResponse(502L, r.bookingId(), PaymentResult.FAILED,
                    r.method(), r.amount(), LocalDateTime.now());
        });
        BookingResponse failed = facade.pay(held.bookingId(), 1L, "CUSTOMER",
                new PayBookingRequest(PaymentMethod.E_WALLET, PaymentResult.FAILED));
        assertEquals(BookingStatus.CANCELLED, failed.status());
        assertEquals(0, claims.count());
        assertEquals(BookingStatus.PENDING_PAYMENT,
                facade.hold(2L, new BookingRequest(10L, List.of(5L))).status());
    }

    @Test
    void cancellingPendingOrderReleasesSeat() {
        BookingResponse booking = facade.hold(1L, new BookingRequest(10L, List.of(5L)));
        assertEquals(BookingStatus.CANCELLED,
                facade.cancel(booking.bookingId(), 1L, "CUSTOMER").status());
        assertEquals(0, claims.count());
        assertThrows(ApiException.class, () -> facade.cancel(booking.bookingId(), 1L, "CUSTOMER"));
    }

    @Test
    void expiredUnpaidOrderReleasesAllSeats() {
        BookingResponse booking = facade.hold(1L, new BookingRequest(10L, List.of(5L, 6L)));
        jdbc.update("update bookings set expires_at = ? where id = ?",
                java.sql.Timestamp.valueOf(LocalDateTime.now().minusMinutes(1)), booking.bookingId());
        state.expireIfDue(booking.bookingId());
        assertEquals(BookingStatus.EXPIRED, facade.get(booking.bookingId(), 1L, "CUSTOMER").status());
        assertEquals(0L, claims.count());
    }

    @Test
    void uncertainPaymentKeepsSeatUntilReconciliation() {
        BookingResponse booking = facade.hold(1L, new BookingRequest(10L, List.of(5L)));
        when(payments.charge(any())).thenThrow(ApiException.unavailable("Mất kết nối"));
        PayBookingRequest request = new PayBookingRequest(PaymentMethod.CARD, PaymentResult.SUCCESS);
        assertThrows(ApiException.class, () -> facade.pay(booking.bookingId(), 1L, "CUSTOMER", request));
        assertEquals(1L, claims.count());
        assertEquals(BookingStatus.PENDING_PAYMENT,
                facade.get(booking.bookingId(), 1L, "CUSTOMER").status());

        jdbc.update("update bookings set payment_processing_until = ? where id = ?",
                java.sql.Timestamp.valueOf(LocalDateTime.now().minusMinutes(1)), booking.bookingId());
        when(payments.charge(any())).thenAnswer(inv -> {
            PaymentChargeRequest r = inv.getArgument(0);
            return new PaymentChargeResponse(503L, r.bookingId(), PaymentResult.SUCCESS,
                    r.method(), r.amount(), LocalDateTime.now());
        });
        paymentOrchestrator.recover(booking.bookingId());
        assertEquals(BookingStatus.CONFIRMED,
                facade.get(booking.bookingId(), 1L, "CUSTOMER").status());
    }

    @Test
    void twoConcurrentHoldsCannotBothSucceed() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch start = new CountDownLatch(1);
            Future<Boolean> a = pool.submit(() -> tryHold(1L, start));
            Future<Boolean> b = pool.submit(() -> tryHold(2L, start));
            start.countDown();
            int success = (a.get(10, TimeUnit.SECONDS) ? 1 : 0) +
                    (b.get(10, TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, success);
            assertEquals(1L, claims.count());
        } finally {
            pool.shutdownNow();
        }
    }

    private boolean tryHold(long userId, CountDownLatch start) {
        try {
            start.await();
            facade.hold(userId, new BookingRequest(10L, List.of(5L)));
            return true;
        } catch (Exception ex) {
            return false;
        }
    }
}
