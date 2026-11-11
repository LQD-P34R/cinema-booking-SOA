package com.cinema.booking.service;

import com.cinema.booking.client.MovieServiceClient;
import com.cinema.booking.dto.*;
import com.cinema.booking.entity.BookingStatus;
import com.cinema.booking.exception.ApiException;
import com.cinema.booking.security.AuthHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

@Service
public class BookingFacade {
    private final MovieServiceClient movies;
    private final BookingExpirationService expiration;
    private final BookingStateService states;
    private final PaymentOrchestrator payments;

    public BookingFacade(MovieServiceClient movies, BookingExpirationService expiration,
                         BookingStateService states, PaymentOrchestrator payments) {
        this.movies = movies;
        this.expiration = expiration;
        this.states = states;
        this.payments = payments;
    }

    public BookingResponse hold(Long userId, BookingRequest request) {
        if (new HashSet<>(request.seatIds()).size() != request.seatIds().size()) {
            throw ApiException.badRequest("Danh sách ghế bị trùng lặp");
        }
        MovieShowtime showtime = movies.getShowtime(request.showtimeId());
        if (showtime.startTime() == null ||
                !showtime.startTime().isAfter(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))) {
            throw ApiException.conflict("Suất chiếu đã bắt đầu hoặc không hợp lệ");
        }
        MovieSeatLayout layout = movies.getSeatLayout(request.showtimeId());
        if (!request.showtimeId().equals(showtime.id()) || showtime.roomId() == null ||
                !request.showtimeId().equals(layout.showtimeId()) ||
                !showtime.roomId().equals(layout.roomId()) || layout.seats() == null) {
            throw ApiException.unavailable("Dữ liệu suất chiếu và sơ đồ ghế không nhất quán");
        }
        Map<Long, MovieSeatLayout.Seat> available = new HashMap<>();
        for (MovieSeatLayout.Seat seat : layout.seats()) available.put(seat.id(), seat);
        List<MovieSeatLayout.Seat> selected = new ArrayList<>();
        for (Long seatId : request.seatIds()) {
            MovieSeatLayout.Seat seat = available.get(seatId);
            if (seat == null) throw ApiException.notFound("Ghế " + seatId + " không thuộc suất chiếu này");
            if (seat.price() == null || seat.price() <= 0 || seat.label() == null) {
                throw ApiException.unavailable("Giá hoặc thông tin ghế không hợp lệ");
            }
            selected.add(seat);
        }
        expiration.expireShowtime(request.showtimeId());
        return states.hold(userId, showtime, selected);
    }

    public SeatStatusResponse status(Long showtimeId) {
        movies.getShowtime(showtimeId); // trả 404 nếu suất chiếu không có
        expiration.expireShowtime(showtimeId);
        return states.seatStatus(showtimeId);
    }

    public BookingResponse get(Long id, Long userId, String role) { return states.get(id, userId, role); }
    public List<BookingResponse> mine(Long userId) { return states.mine(userId); }
    public List<BookingResponse> all(String role, BookingStatus status, Long showtimeId) {
        AuthHelper.requireAdmin(role);
        return states.all(status, showtimeId);
    }
    public BookingResponse cancel(Long id, Long userId, String role) {
        return states.cancel(id, userId, role);
    }
    public BookingResponse pay(Long id, Long userId, String role, PayBookingRequest request) {
        return payments.pay(id, userId, role, request);
    }
}
