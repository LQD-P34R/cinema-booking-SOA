package com.cinema.movie.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request cho POST /api/cinemas/{cinemaId}/rooms (ADMIN).
 * Server tự sinh ghế theo totalRows x seatsPerRow.
 * Giới hạn 26 hàng vì tên hàng dùng chữ cái A-Z.
 */
public record RoomRequest(
        @NotBlank(message = "Tên phòng không được để trống")
        @Size(max = 100, message = "Tên phòng tối đa 100 ký tự")
        String name,

        @NotNull(message = "Số hàng ghế không được để trống")
        @Min(value = 1, message = "Số hàng ghế phải từ 1 đến 26")
        @Max(value = 26, message = "Số hàng ghế phải từ 1 đến 26")
        Integer totalRows,

        @NotNull(message = "Số ghế mỗi hàng không được để trống")
        @Min(value = 1, message = "Số ghế mỗi hàng phải từ 1 đến 30")
        @Max(value = 30, message = "Số ghế mỗi hàng phải từ 1 đến 30")
        Integer seatsPerRow
) {
}