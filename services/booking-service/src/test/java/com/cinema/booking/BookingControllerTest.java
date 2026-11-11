package com.cinema.booking;

import com.cinema.booking.client.MovieServiceClient;
import com.cinema.booking.client.PaymentServiceClient;
import com.cinema.booking.dto.MovieSeatLayout;
import com.cinema.booking.dto.MovieShowtime;
import com.cinema.booking.repository.BookingRepository;
import com.cinema.booking.repository.SeatClaimRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookingControllerTest {
    @Autowired MockMvc mvc;
    @Autowired BookingRepository bookings;
    @Autowired SeatClaimRepository claims;
    @MockBean MovieServiceClient movies;
    @MockBean PaymentServiceClient payments;

    @BeforeEach
    void prepare() {
        claims.deleteAll();
        bookings.deleteAll();
        reset(movies, payments);
        when(movies.getShowtime(10L)).thenReturn(new MovieShowtime(10L, 1L,
                "Phim demo", 1L, "Rạp demo", 1L, "Phòng 1",
                LocalDateTime.now().plusDays(7), LocalDateTime.now().plusDays(7).plusHours(2), 90000));
        when(movies.getSeatLayout(10L)).thenReturn(new MovieSeatLayout(10L, 1L, "Phòng 1", 2, 2,
                List.of(new MovieSeatLayout.Seat(5L, "A", 5, "A5", "STANDARD", 90000L))));
    }

    @Test
    void postBookingReturnsContractFields() throws Exception {
        mvc.perform(post("/api/bookings")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"showtimeId\":10,\"seatIds\":[5]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.totalAmount").value(90000))
                .andExpect(jsonPath("$.seatLabels[0]").value("A5"));
    }

    @Test
    void missingIdentityReturns401() throws Exception {
        mvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"showtimeId\":10,\"seatIds\":[5]}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidRequestReturns400() throws Exception {
        mvc.perform(post("/api/bookings")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"showtimeId\":10,\"seatIds\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adminEndpointRequiresAdmin() throws Exception {
        mvc.perform(get("/api/bookings").header("X-User-Id", "1")
                        .header("X-User-Role", "CUSTOMER"))
                .andExpect(status().isForbidden());
    }
}
