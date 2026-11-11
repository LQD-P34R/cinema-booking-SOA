package com.cinema.movie.controller;

import com.cinema.movie.dto.SeatLayoutResponse;
import com.cinema.movie.dto.ShowtimeRequest;
import com.cinema.movie.dto.ShowtimeResponse;
import com.cinema.movie.security.AuthHelper;
import com.cinema.movie.service.ShowtimeService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/showtimes")
public class ShowtimeController {

    private final ShowtimeService showtimeService;

    public ShowtimeController(ShowtimeService showtimeService) {
        this.showtimeService = showtimeService;
    }

    // Công khai. date có dạng 2026-11-20
    @GetMapping
    public List<ShowtimeResponse> search(@RequestParam(required = false) Long movieId,
                                         @RequestParam(required = false) Long cinemaId,
                                         @RequestParam(required = false)
                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return showtimeService.search(movieId, cinemaId, date);
    }

    // Công khai
    @GetMapping("/{id}")
    public ShowtimeResponse getById(@PathVariable Long id) {
        return showtimeService.getById(id);
    }

    // Công khai. Cấu trúc ghế + giá từng ghế (Booking Service cũng gọi endpoint này)
    @GetMapping("/{id}/seats")
    public SeatLayoutResponse getSeats(@PathVariable Long id) {
        return showtimeService.getSeatLayout(id);
    }

    // ADMIN
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShowtimeResponse create(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                   @Valid @RequestBody ShowtimeRequest request) {
        AuthHelper.requireAdmin(role);
        return showtimeService.create(request);
    }

    // ADMIN
    @PutMapping("/{id}")
    public ShowtimeResponse update(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                   @PathVariable Long id,
                                   @Valid @RequestBody ShowtimeRequest request) {
        AuthHelper.requireAdmin(role);
        return showtimeService.update(id, request);
    }

    // ADMIN
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                       @PathVariable Long id) {
        AuthHelper.requireAdmin(role);
        showtimeService.delete(id);
    }
}