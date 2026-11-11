package com.cinema.movie.dto;

import com.cinema.movie.entity.MovieStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Request cho POST /api/movies và PUT /api/movies/{id} (ADMIN). */
public record MovieRequest(
        @NotBlank(message = "Tên phim không được để trống")
        @Size(max = 255, message = "Tên phim tối đa 255 ký tự")
        String title,

        String description,

        @Size(max = 100, message = "Thể loại tối đa 100 ký tự")
        String genre,

        @NotNull(message = "Thời lượng phim không được để trống")
        @Min(value = 1, message = "Thời lượng phim phải lớn hơn 0")
        Integer durationMinutes,

        LocalDate releaseDate,

        @Size(max = 500, message = "Link poster tối đa 500 ký tự")
        String posterUrl,

        @Size(max = 500, message = "Link trailer tối đa 500 ký tự")
        String trailerUrl,

        @Size(max = 10, message = "Độ tuổi tối đa 10 ký tự")
        String ageRating,

        // Không gửi thì Service dùng mặc định COMING_SOON
        MovieStatus status
) {
}