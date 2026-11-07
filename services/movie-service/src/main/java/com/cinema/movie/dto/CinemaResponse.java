package com.cinema.movie.dto;

import com.cinema.movie.entity.Cinema;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Response của rạp chiếu.
 * - Danh sách (GET /api/cinemas): dùng summary(), không có trường rooms.
 * - Chi tiết (GET /api/cinemas/{id}): dùng detail(), kèm danh sách phòng.
 */
public record CinemaResponse(
        Long id,
        String name,
        String address,
        String city,

        // null thì không xuất hiện trong JSON
        @JsonInclude(JsonInclude.Include.NON_NULL)
        List<RoomResponse> rooms
) {

    /** Dạng gọn, không đụng tới danh sách phòng (tránh lazy loading). */
    public static CinemaResponse summary(Cinema cinema) {
        return new CinemaResponse(
                cinema.getId(),
                cinema.getName(),
                cinema.getAddress(),
                cinema.getCity(),
                null
        );
    }

    /** Dạng đầy đủ, phải gọi trong @Transactional vì có đọc cinema.getRooms(). */
    public static CinemaResponse detail(Cinema cinema) {
        List<RoomResponse> rooms = cinema.getRooms().stream()
                .map(RoomResponse::from)
                .toList();
        return new CinemaResponse(
                cinema.getId(),
                cinema.getName(),
                cinema.getAddress(),
                cinema.getCity(),
                rooms
        );
    }
}