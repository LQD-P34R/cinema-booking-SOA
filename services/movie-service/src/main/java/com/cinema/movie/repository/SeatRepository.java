package com.cinema.movie.repository;

import com.cinema.movie.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SeatRepository extends JpaRepository<Seat, Long> {

    // Danh sách ghế của phòng, sắp xếp theo hàng rồi theo số ghế (A1, A2, ..., B1, ...)
    List<Seat> findByRoomIdOrderBySeatRowAscSeatNumberAsc(Long roomId);

    // Dùng khi đổi loại ghế: đảm bảo ghế thuộc đúng phòng
    Optional<Seat> findByIdAndRoomId(Long id, Long roomId);
}