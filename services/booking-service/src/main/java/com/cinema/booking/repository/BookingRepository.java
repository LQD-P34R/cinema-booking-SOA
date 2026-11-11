package com.cinema.booking.repository;

import com.cinema.booking.entity.Booking;
import com.cinema.booking.entity.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findLockedById(@Param("id") Long id);

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Booking> findAllByOrderByCreatedAtDesc();
    List<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status);
    List<Booking> findByShowtimeIdOrderByCreatedAtDesc(Long showtimeId);
    List<Booking> findByStatusAndShowtimeIdOrderByCreatedAtDesc(BookingStatus status, Long showtimeId);

    @Query("select b.id from Booking b where b.status = :pending and b.expiresAt <= :now " +
            "and b.paymentMethod is null")
    List<Long> findDueIds(@Param("pending") BookingStatus pending, @Param("now") LocalDateTime now);

    @Query("select b.id from Booking b where b.showtimeId = :showtimeId and b.status = :pending " +
            "and b.expiresAt <= :now and b.paymentMethod is null")
    List<Long> findDueIdsForShowtime(@Param("showtimeId") Long showtimeId,
                                     @Param("pending") BookingStatus pending,
                                     @Param("now") LocalDateTime now);

    @Query("select b.id from Booking b where b.status = :pending and b.paymentMethod is not null " +
            "and (b.paymentProcessingUntil is null or b.paymentProcessingUntil <= :now)")
    List<Long> findRecoveryIds(@Param("pending") BookingStatus pending, @Param("now") LocalDateTime now);
}
