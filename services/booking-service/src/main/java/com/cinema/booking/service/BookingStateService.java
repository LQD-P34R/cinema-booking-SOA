package com.cinema.booking.service;

import com.cinema.booking.dto.*;
import com.cinema.booking.entity.*;
import com.cinema.booking.exception.ApiException;
import com.cinema.booking.repository.BookingRepository;
import com.cinema.booking.repository.SeatClaimRepository;
import com.cinema.booking.security.AuthHelper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class BookingStateService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final BookingRepository bookings;
    private final SeatClaimRepository claims;
    private final BookingMapper mapper;
    private final long holdMinutes;
    private final long paymentLeaseSeconds;

    public BookingStateService(BookingRepository bookings, SeatClaimRepository claims,
                               BookingMapper mapper,
                               @Value("${cinema.booking.hold-minutes:5}") long holdMinutes,
                               @Value("${cinema.booking.payment-lease-seconds:30}") long paymentLeaseSeconds) {
        this.bookings = bookings;
        this.claims = claims;
        this.mapper = mapper;
        this.holdMinutes = holdMinutes;
        this.paymentLeaseSeconds = paymentLeaseSeconds;
    }

    private LocalDateTime now() {
        return LocalDateTime.now(VIETNAM).truncatedTo(ChronoUnit.MILLIS);
    }

    @Transactional
    public BookingResponse hold(Long userId, MovieShowtime showtime, List<MovieSeatLayout.Seat> seats) {
        LocalDateTime createdAt = now();
        if (!showtime.startTime().isAfter(createdAt)) {
            throw ApiException.conflict("Suất chiếu đã bắt đầu, không thể đặt vé");
        }
        long amount = 0;
        for (MovieSeatLayout.Seat seat : seats) amount = Math.addExact(amount, seat.price());
        LocalDateTime expiresAt = createdAt.plusMinutes(holdMinutes);
        Booking booking = new Booking(userId, showtime.id(), showtime.movieTitle(),
                showtime.cinemaName(), showtime.roomName(), showtime.startTime(),
                amount, createdAt, expiresAt);
        for (MovieSeatLayout.Seat seat : seats) {
            booking.addItem(seat.id(), seat.label(), seat.price());
        }
        bookings.saveAndFlush(booking);

        // Thứ tự tăng dần giúp giảm deadlock khi hai đơn chọn các ghế giao nhau.
        // UNIQUE(showtime_id, seat_id) trong MySQL là lớp bảo vệ cuối cùng.
        for (MovieSeatLayout.Seat seat : seats.stream()
                .sorted((a, b) -> Long.compare(a.id(), b.id())).toList()) {
            claims.saveAndFlush(new SeatClaim(booking, showtime.id(), seat.id(), expiresAt));
        }
        return mapper.toResponse(booking);
    }

    @Transactional(readOnly = true)
    public BookingResponse get(Long id, Long userId, String role) {
        Booking booking = find(id);
        AuthHelper.requireOwnerOrAdmin(booking.getUserId(), userId, role);
        return mapper.toResponse(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> mine(Long userId) {
        return bookings.findByUserIdOrderByCreatedAtDesc(userId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> all(BookingStatus status, Long showtimeId) {
        List<Booking> result = status != null && showtimeId != null ?
                bookings.findByStatusAndShowtimeIdOrderByCreatedAtDesc(status, showtimeId) :
                status != null ? bookings.findByStatusOrderByCreatedAtDesc(status) :
                showtimeId != null ? bookings.findByShowtimeIdOrderByCreatedAtDesc(showtimeId) :
                bookings.findAllByOrderByCreatedAtDesc();
        return result.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SeatStatusResponse seatStatus(Long showtimeId) {
        return new SeatStatusResponse(showtimeId,
                claims.findByShowtimeIdOrderBySeatId(showtimeId).stream()
                        .map(c -> new SeatStatusResponse.SeatStatus(c.getSeatId(), c.getStatus())).toList());
    }

    @Transactional
    public BookingResponse cancel(Long id, Long userId, String role) {
        Booking booking = findLocked(id);
        AuthHelper.requireOwnerOrAdmin(booking.getUserId(), userId, role);
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw ApiException.conflict("Chỉ có thể hủy đơn đang chờ thanh toán");
        }
        if (booking.getPaymentMethod() != null) {
            throw ApiException.conflict("Đơn đã bắt đầu thanh toán; cần xác minh kết quả trước khi hủy");
        }
        booking.setStatus(BookingStatus.CANCELLED);
        claims.deleteByBookingAndStatus(id, SeatClaimStatus.HELD);
        return mapper.toResponse(booking);
    }

    /** Khóa row bookings trong cùng transaction với kiểm tra thời hạn. */
    @Transactional
    public void expireIfDue(Long id) {
        Booking booking = bookings.findLockedById(id).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.PENDING_PAYMENT) return;
        if (booking.getPaymentMethod() != null || booking.getExpiresAt().isAfter(now())) return;
        claims.deleteByBookingAndStatus(id, SeatClaimStatus.HELD);
        booking.setStatus(BookingStatus.EXPIRED);
    }

    public record PaymentWork(PaymentChargeRequest charge, LocalDateTime leaseUntil,
                              BookingResponse alreadyConfirmed) {}

    @Transactional
    public PaymentWork beginPayment(Long id, Long userId, String role, PayBookingRequest request) {
        Booking booking = findLocked(id);
        AuthHelper.requireOwnerOrAdmin(booking.getUserId(), userId, role);
        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            return new PaymentWork(null, null, mapper.toResponse(booking));
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw ApiException.conflict("Đơn đã hủy hoặc hết hạn, không thể thanh toán");
        }
        PaymentResult wanted = request.simulateResult() == null ? PaymentResult.SUCCESS : request.simulateResult();
        if (booking.getPaymentMethod() != null &&
                (booking.getPaymentMethod() != request.method() || booking.getPaymentRequestedResult() != wanted)) {
            throw ApiException.conflict("Đơn đã có một yêu cầu thanh toán với thông tin khác");
        }
        if (booking.getPaymentMethod() == null && !booking.getExpiresAt().isAfter(now())) {
            throw ApiException.conflict("Đơn đã hết thời gian giữ ghế");
        }
        return reservePaymentLease(booking, request.method(), wanted);
    }

    @Transactional
    public Optional<PaymentWork> beginRecovery(Long id) {
        Booking booking = bookings.findLockedById(id).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.PENDING_PAYMENT ||
                booking.getPaymentMethod() == null) return Optional.empty();
        if (booking.getPaymentProcessingUntil() != null && booking.getPaymentProcessingUntil().isAfter(now())) {
            return Optional.empty();
        }
        return Optional.of(reservePaymentLease(booking,
                booking.getPaymentMethod(), booking.getPaymentRequestedResult()));
    }

    private PaymentWork reservePaymentLease(Booking booking, PaymentMethod method, PaymentResult wanted) {
        LocalDateTime current = now();
        if (booking.getPaymentProcessingUntil() != null && booking.getPaymentProcessingUntil().isAfter(current)) {
            throw ApiException.conflict("Đơn đang được xử lý thanh toán, vui lòng chờ ít giây");
        }
        LocalDateTime until = current.plusSeconds(paymentLeaseSeconds);
        booking.setPaymentMethod(method);
        booking.setPaymentRequestedResult(wanted);
        booking.setPaymentProcessingUntil(until);
        return new PaymentWork(new PaymentChargeRequest(booking.getId(), booking.getUserId(),
                booking.getTotalAmount(), method, wanted), until, null);
    }

    @Transactional
    public BookingResponse finishPayment(PaymentWork work, PaymentChargeResponse remote) {
        PaymentChargeRequest sent = work.charge();
        Booking booking = findLocked(sent.bookingId());
        if (booking.getStatus() == BookingStatus.CONFIRMED) return mapper.toResponse(booking);
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT ||
                !work.leaseUntil().equals(booking.getPaymentProcessingUntil())) {
            throw ApiException.conflict("Kết quả thanh toán không còn thuộc lần xử lý hiện tại");
        }
        if (remote == null || remote.paymentId() == null || remote.status() == null ||
                !sent.bookingId().equals(remote.bookingId()) ||
                !sent.amount().equals(remote.amount()) || sent.method() != remote.method()) {
            // Không xác nhận đơn dựa trên phản hồi sai hoặc thiếu dữ liệu.
            throw ApiException.unavailable("Payment Service trả thông tin không nhất quán");
        }
        booking.setPaymentId(remote.paymentId());
        booking.setPaymentStatus(remote.status());
        booking.setPaymentAmount(remote.amount());
        booking.setPaymentMethod(remote.method());
        booking.setPaymentCreatedAt(remote.createdAt());
        booking.setPaymentProcessingUntil(null);

        if (remote.status() == PaymentResult.SUCCESS) {
            int changed = claims.markSold(booking.getId(), SeatClaimStatus.HELD, SeatClaimStatus.SOLD);
            if (changed != booking.getItems().size()) {
                throw ApiException.conflict("Ghế giữ không còn đầy đủ; cần đối soát thanh toán");
            }
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setPaidAt(now());
            booking.setTicketCode("CB-" + booking.getId() + "-" + String.format("%05X", RANDOM.nextInt(0x100000)));
        } else {
            claims.deleteByBookingAndStatus(booking.getId(), SeatClaimStatus.HELD);
            booking.setStatus(BookingStatus.CANCELLED);
        }
        return mapper.toResponse(booking);
    }

    private Booking find(Long id) {
        return bookings.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn đặt vé"));
    }
    private Booking findLocked(Long id) {
        return bookings.findLockedById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn đặt vé"));
    }
}
