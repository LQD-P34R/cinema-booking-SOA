package com.cinema.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request cho POST /api/cinemas và PUT /api/cinemas/{id} (ADMIN). */
public record CinemaRequest(
        @NotBlank(message = "Tên rạp không được để trống")
        @Size(max = 255, message = "Tên rạp tối đa 255 ký tự")
        String name,

        @NotBlank(message = "Địa chỉ không được để trống")
        @Size(max = 500, message = "Địa chỉ tối đa 500 ký tự")
        String address,

        @NotBlank(message = "Thành phố không được để trống")
        @Size(max = 100, message = "Thành phố tối đa 100 ký tự")
        String city
) {
}