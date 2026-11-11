package com.cinema.movie.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request cho PUT /api/rooms/{id} (ADMIN).
 * Chỉ cho đổi tên, không đổi kích thước phòng vì ghế đã được sinh ra
 * và có thể đã gắn với suất chiếu.
 */
public record RoomUpdateRequest(
        @NotBlank(message = "Tên phòng không được để trống")
        @Size(max = 100, message = "Tên phòng tối đa 100 ký tự")
        String name
) {
}