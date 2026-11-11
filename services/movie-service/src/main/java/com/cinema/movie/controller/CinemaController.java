package com.cinema.movie.controller;

import com.cinema.movie.dto.CinemaRequest;
import com.cinema.movie.dto.CinemaResponse;
import com.cinema.movie.security.AuthHelper;
import com.cinema.movie.service.CinemaService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinemas")
public class CinemaController {

    private final CinemaService cinemaService;

    public CinemaController(CinemaService cinemaService) {
        this.cinemaService = cinemaService;
    }

    // Công khai: danh sách gọn, không kèm phòng
    @GetMapping
    public List<CinemaResponse> list() {
        return cinemaService.list();
    }

    // Công khai: chi tiết kèm danh sách phòng
    @GetMapping("/{id}")
    public CinemaResponse getDetail(@PathVariable Long id) {
        return cinemaService.getDetail(id);
    }

    // ADMIN
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CinemaResponse create(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                 @Valid @RequestBody CinemaRequest request) {
        AuthHelper.requireAdmin(role);
        return cinemaService.create(request);
    }

    // ADMIN
    @PutMapping("/{id}")
    public CinemaResponse update(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                 @PathVariable Long id,
                                 @Valid @RequestBody CinemaRequest request) {
        AuthHelper.requireAdmin(role);
        return cinemaService.update(id, request);
    }

    // ADMIN
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                       @PathVariable Long id) {
        AuthHelper.requireAdmin(role);
        cinemaService.delete(id);
    }
}