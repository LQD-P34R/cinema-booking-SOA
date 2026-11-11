package com.cinema.booking.repository;

import com.cinema.booking.entity.SeatClaim;
import com.cinema.booking.entity.SeatClaimStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SeatClaimRepository extends JpaRepository<SeatClaim, Long> {
    List<SeatClaim> findByShowtimeIdOrderBySeatId(Long showtimeId);

    @Modifying
    @Query("delete from SeatClaim c where c.booking.id = :bookingId and c.status = :status")
    int deleteByBookingAndStatus(@Param("bookingId") Long bookingId,
                                 @Param("status") SeatClaimStatus status);

    @Modifying
    @Query("update SeatClaim c set c.status = :sold, c.expiresAt = null " +
            "where c.booking.id = :bookingId and c.status = :held")
    int markSold(@Param("bookingId") Long bookingId,
                 @Param("held") SeatClaimStatus held,
                 @Param("sold") SeatClaimStatus sold);
}
