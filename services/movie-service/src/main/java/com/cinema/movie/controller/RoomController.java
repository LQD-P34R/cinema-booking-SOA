package com.cinema.movie.controller;

import com.cinema.movie.dto.RoomRequest;
import com.cinema.movie.dto.RoomResponse;
import com.cinema.movie.dto.RoomUpdateRequest;
import com.cinema.movie.dto.SeatResponse;
import com.cinema.movie.dto.SeatTypeRequest;
import com.cinema.movie.security.AuthHelper;
import com.cinema.movie.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Phòng chiếu và ghế, theo api-contract.md mục 3.2. Toàn bộ endpoint đều yêu cầu ADMIN.
 * Không đặt @RequestMapping ở cấp class vì đường dẫn tạo phòng nằm dưới /api/cinemas/...
 * còn các thao tác khác nằm dưới /api/rooms/...
 */
@RestController
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping("/api/cinemas/{cinemaId}/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomResponse create(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                               @PathVariable Long cinemaId,
                               @Valid @RequestBody RoomRequest request) {
        AuthHelper.requireAdmin(role);
        return roomService.create(cinemaId, request);
    }

    @PutMapping("/api/rooms/{id}")
    public RoomResponse update(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                               @PathVariable Long id,
                               @Valid @RequestBody RoomUpdateRequest request) {
        AuthHelper.requireAdmin(role);
        return roomService.update(id, request);
    }

    @DeleteMapping("/api/rooms/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                       @PathVariable Long id) {
        AuthHelper.requireAdmin(role);
        roomService.delete(id);
    }

    @PutMapping("/api/rooms/{roomId}/seats/{seatId}")
    public SeatResponse changeSeatType(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role,
                                       @PathVariable Long roomId,
                                       @PathVariable Long seatId,
                                       @Valid @RequestBody SeatTypeRequest request) {
        AuthHelper.requireAdmin(role);
        return roomService.changeSeatType(roomId, seatId, request.type());
    }
}