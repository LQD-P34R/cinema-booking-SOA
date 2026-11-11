package com.cinema.movie.dto;

import com.cinema.movie.entity.Movie;
import com.cinema.movie.entity.MovieStatus;

import java.time.LocalDate;

/** Response của các API phim, khớp với api-contract.md mục 3.1. */
public record MovieResponse(
        Long id,
        String title,
        String description,
        String genre,
        Integer durationMinutes,
        LocalDate releaseDate,
        String posterUrl,
        String trailerUrl,
        String ageRating,
        MovieStatus status
) {

    public static MovieResponse from(Movie movie) {
        return new MovieResponse(
                movie.getId(),
                movie.getTitle(),
                movie.getDescription(),
                movie.getGenre(),
                movie.getDurationMinutes(),
                movie.getReleaseDate(),
                movie.getPosterUrl(),
                movie.getTrailerUrl(),
                movie.getAgeRating(),
                movie.getStatus()
        );
    }
}