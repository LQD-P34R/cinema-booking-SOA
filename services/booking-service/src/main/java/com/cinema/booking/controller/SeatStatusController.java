package com.cinema.booking.controller;

import com.cinema.booking.dto.SeatStatusResponse;
import com.cinema.booking.service.BookingFacade;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SeatStatusController {
    private final BookingFacade service;
    public SeatStatusController(BookingFacade service) { this.service = service; }

    @GetMapping("/api/showtimes/{id}/seat-status")
    public SeatStatusResponse status(@PathVariable Long id) {
        return service.status(id);
    }
}
