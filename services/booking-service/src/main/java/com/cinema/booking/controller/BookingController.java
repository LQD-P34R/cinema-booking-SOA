package com.cinema.booking.controller;

import com.cinema.booking.dto.BookingRequest;
import com.cinema.booking.dto.BookingResponse;
import com.cinema.booking.dto.PayBookingRequest;
import com.cinema.booking.entity.BookingStatus;
import com.cinema.booking.security.AuthHelper;
import com.cinema.booking.service.BookingFacade;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingFacade service;
    public BookingController(BookingFacade service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse create(@RequestHeader(value = AuthHelper.ID_HEADER, required = false) String id,
                                  @Valid @RequestBody BookingRequest request) {
        return service.hold(AuthHelper.requireUser(id), request);
    }

    @GetMapping("/my")
    public List<BookingResponse> mine(@RequestHeader(value = AuthHelper.ID_HEADER, required = false) String id) {
        return service.mine(AuthHelper.requireUser(id));
    }

    @GetMapping("/{id}")
    public BookingResponse get(@PathVariable Long id,
                               @RequestHeader(value = AuthHelper.ID_HEADER, required = false) String userId,
                               @RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role) {
        return service.get(id, AuthHelper.requireUser(userId), role);
    }

    @PostMapping("/{id}/pay")
    public BookingResponse pay(@PathVariable Long id,
                               @RequestHeader(value = AuthHelper.ID_HEADER, required = false) String userId,
                               @RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                               @Valid @RequestBody PayBookingRequest request) {
        return service.pay(id, AuthHelper.requireUser(userId), role, request);
    }

    @PostMapping("/{id}/cancel")
    public BookingResponse cancel(@PathVariable Long id,
                                  @RequestHeader(value = AuthHelper.ID_HEADER, required = false) String userId,
                                  @RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role) {
        return service.cancel(id, AuthHelper.requireUser(userId), role);
    }

    @GetMapping
    public List<BookingResponse> all(@RequestHeader(value = AuthHelper.ID_HEADER, required = false) String userId,
                                     @RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                     @RequestParam(required = false) BookingStatus status,
                                     @RequestParam(required = false) Long showtimeId) {
        AuthHelper.requireUser(userId);
        return service.all(role, status, showtimeId);
    }
}
