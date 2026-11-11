package com.cinema.movie.controller;

import com.cinema.movie.dto.MovieRequest;
import com.cinema.movie.dto.MovieResponse;
import com.cinema.movie.entity.MovieStatus;
import com.cinema.movie.security.AuthHelper;
import com.cinema.movie.service.MovieService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

    private final MovieService movieService;

    public MovieController(MovieService movieService) {
        this.movieService = movieService;
    }

    // Công khai
    @GetMapping
    public List<MovieResponse> search(@RequestParam(required = false) String keyword,
                                      @RequestParam(required = false) String genre,
                                      @RequestParam(required = false) MovieStatus status) {
        return movieService.search(keyword, genre, status);
    }

    // Công khai
    @GetMapping("/{id}")
    public MovieResponse getById(@PathVariable Long id) {
        return movieService.getById(id);
    }

    // ADMIN
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MovieResponse create(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                @Valid @RequestBody MovieRequest request) {
        AuthHelper.requireAdmin(role);
        return movieService.create(request);
    }

    // ADMIN
    @PutMapping("/{id}")
    public MovieResponse update(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                @PathVariable Long id,
                                @Valid @RequestBody MovieRequest request) {
        AuthHelper.requireAdmin(role);
        return movieService.update(id, request);
    }

    // ADMIN
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                       @PathVariable Long id) {
        AuthHelper.requireAdmin(role);
        movieService.delete(id);
    }
}