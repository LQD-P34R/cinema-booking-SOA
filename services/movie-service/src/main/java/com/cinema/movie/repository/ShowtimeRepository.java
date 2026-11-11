package com.cinema.movie.repository;

import com.cinema.movie.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    /**
     * Lọc suất chiếu theo phim, rạp và khoảng thời gian [from, to).
     * Tham số null thì bỏ qua điều kiện. Để lọc theo ngày, Service truyền
     * from = 00:00 của ngày đó và to = 00:00 của ngày hôm sau.
     * JOIN FETCH để lấy sẵn phim, phòng, rạp, tránh lỗi lazy khi chuyển sang DTO.
     */
    @Query("""
            SELECT s FROM Showtime s
            JOIN FETCH s.movie m
            JOIN FETCH s.room r
            JOIN FETCH r.cinema c
            WHERE (:movieId IS NULL OR m.id = :movieId)
              AND (:cinemaId IS NULL OR c.id = :cinemaId)
              AND (:from IS NULL OR s.startTime >= :from)
              AND (:to IS NULL OR s.startTime < :to)
            ORDER BY s.startTime ASC
            """)
    List<Showtime> search(@Param("movieId") Long movieId,
                          @Param("cinemaId") Long cinemaId,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to);

    // Lấy một suất chiếu kèm phim, phòng, rạp
    @Query("""
            SELECT s FROM Showtime s
            JOIN FETCH s.movie
            JOIN FETCH s.room r
            JOIN FETCH r.cinema
            WHERE s.id = :id
            """)
    Optional<Showtime> findDetailById(@Param("id") Long id);

    /**
     * Đếm số suất chiếu trong cùng phòng bị chồng giờ với khoảng [start, end).
     * Hai khoảng chồng nhau khi: s.start < end VÀ s.end > start.
     * excludeId dùng khi sửa suất chiếu (bỏ qua chính nó), truyền null khi tạo mới.
     * Kết quả > 0 nghĩa là trùng giờ, Service trả lỗi 409.
     */
    @Query("""
            SELECT COUNT(s) FROM Showtime s
            WHERE s.room.id = :roomId
              AND s.startTime < :end
              AND s.endTime > :start
              AND (:excludeId IS NULL OR s.id <> :excludeId)
            """)
    long countOverlapping(@Param("roomId") Long roomId,
                          @Param("start") LocalDateTime start,
                          @Param("end") LocalDateTime end,
                          @Param("excludeId") Long excludeId);

    // Dùng để chặn xóa phòng đã có suất chiếu
    boolean existsByRoomId(Long roomId);

    // Dùng để chặn xóa phim còn suất chiếu trong tương lai
    boolean existsByMovieIdAndStartTimeAfter(Long movieId, LocalDateTime time);
}