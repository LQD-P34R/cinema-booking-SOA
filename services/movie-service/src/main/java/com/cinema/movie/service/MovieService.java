package com.cinema.movie.service;

import com.cinema.movie.dto.MovieRequest;
import com.cinema.movie.dto.MovieResponse;
import com.cinema.movie.entity.Movie;
import com.cinema.movie.entity.MovieStatus;
import com.cinema.movie.exception.ApiException;
import com.cinema.movie.repository.MovieRepository;
import com.cinema.movie.repository.ShowtimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MovieService {

    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;

    public MovieService(MovieRepository movieRepository, ShowtimeRepository showtimeRepository) {
        this.movieRepository = movieRepository;
        this.showtimeRepository = showtimeRepository;
    }

    /** GET /api/movies: tham số trống hoặc chỉ có khoảng trắng được coi như không lọc. */
    public List<MovieResponse> search(String keyword, String genre, MovieStatus status) {
        return movieRepository.search(blankToNull(keyword), blankToNull(genre), status)
                .stream()
                .map(MovieResponse::from)
                .toList();
    }

    public MovieResponse getById(Long id) {
        return MovieResponse.from(findOrThrow(id));
    }

    @Transactional
    public MovieResponse create(MovieRequest request) {
        Movie movie = new Movie();
        apply(movie, request);
        if (movie.getStatus() == null) {
            movie.setStatus(MovieStatus.COMING_SOON);
        }
        return MovieResponse.from(movieRepository.save(movie));
    }

    @Transactional
    public MovieResponse update(Long id, MovieRequest request) {
        Movie movie = findOrThrow(id);
        apply(movie, request);
        return MovieResponse.from(movieRepository.save(movie));
    }

    @Transactional
    public void delete(Long id) {
        Movie movie = findOrThrow(id);
        if (showtimeRepository.existsByMovieIdAndStartTimeAfter(id, LocalDateTime.now())) {
            throw ApiException.conflict("Không thể xóa phim vì còn suất chiếu trong tương lai");
        }
        // Nếu phim còn suất chiếu cũ (đã chiếu), database sẽ từ chối do khóa ngoại và
        // GlobalExceptionHandler trả 409. Khi đó nên chuyển trạng thái phim sang ENDED thay vì xóa.
        movieRepository.delete(movie);
        movieRepository.flush();
    }

    private Movie findOrThrow(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phim với id " + id));
    }

    // Chép dữ liệu từ request sang entity. status null thì giữ nguyên giá trị hiện có.
    private void apply(Movie movie, MovieRequest r) {
        movie.setTitle(r.title().trim());
        movie.setDescription(r.description());
        movie.setGenre(r.genre());
        movie.setDurationMinutes(r.durationMinutes());
        movie.setReleaseDate(r.releaseDate());
        movie.setPosterUrl(r.posterUrl());
        movie.setTrailerUrl(r.trailerUrl());
        movie.setAgeRating(r.ageRating());
        if (r.status() != null) {
            movie.setStatus(r.status());
        }
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}