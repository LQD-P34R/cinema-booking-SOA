package com.cinema.booking.dto;

import com.cinema.booking.entity.Booking;
import com.cinema.booking.entity.BookingItem;
import org.springframework.stereotype.Component;

@Component
public class BookingMapper {
    public BookingResponse toResponse(Booking booking) {
        PaymentSummary payment = booking.getPaymentId() == null ? null :
                new PaymentSummary(booking.getPaymentId(), booking.getPaymentStatus(),
                        booking.getPaymentMethod(), booking.getPaymentAmount());
        return new BookingResponse(
                booking.getId(), booking.getUserId(), booking.getStatus(),
                booking.getTotalAmount(), booking.getExpiresAt(), booking.getShowtimeId(),
                booking.getMovieTitle(), booking.getCinemaName(), booking.getRoomName(),
                booking.getStartTime(), booking.getItems().stream().map(BookingItem::getSeatLabel).toList(),
                booking.getTicketCode(), booking.getCreatedAt(), booking.getPaidAt(), payment
        );
    }
}
