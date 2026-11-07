package com.cinema.movie.service;

import com.cinema.movie.dto.SeatLayoutResponse;
import com.cinema.movie.dto.SeatResponse;
import com.cinema.movie.dto.ShowtimeRequest;
import com.cinema.movie.dto.ShowtimeResponse;
import com.cinema.movie.entity.Movie;
import com.cinema.movie.entity.Room;
import com.cinema.movie.entity.Seat;
import com.cinema.movie.entity.Showtime;
import com.cinema.movie.exception.ApiException;
import com.cinema.movie.repository.MovieRepository;
import com.cinema.movie.repository.RoomRepository;
import com.cinema.movie.repository.SeatRepository;
import com.cinema.movie.repository.ShowtimeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final SeatPricingService seatPricingService;
    private final int cleaningMinutes;

    public ShowtimeService(ShowtimeRepository showtimeRepository,
                           MovieRepository movieRepository,
                           RoomRepository roomRepository,
                           SeatRepository seatRepository,
                           SeatPricingService seatPricingService,
                           @Value("${cinema.showtime.cleaning-minutes:15}") int cleaningMinutes) {
        this.showtimeRepository = showtimeRepository;
        this.movieRepository = movieRepository;
        this.roomRepository = roomRepository;
        this.seatRepository = seatRepository;
        this.seatPricingService = seatPricingService;
        this.cleaningMinutes = cleaningMinutes;
    }

    /** GET /api/showtimes: lọc theo phim, rạp và ngày (tất cả đều tùy chọn). */
    public List<ShowtimeResponse> search(Long movieId, Long cinemaId, LocalDate date) {
        LocalDateTime from = (date != null) ? date.atStartOfDay() : null;
        LocalDateTime to = (date != null) ? date.plusDays(1).atStartOfDay() : null;
        return showtimeRepository.search(movieId, cinemaId, from, to).stream()
                .map(ShowtimeResponse::from)
                .toList();
    }

    /** GET /api/showtimes/{id} */
    public ShowtimeResponse getById(Long id) {
        return ShowtimeResponse.from(findDetailOrThrow(id));
    }

    /**
     * GET /api/showtimes/{id}/seats: cấu trúc ghế của phòng + giá từng ghế theo suất chiếu.
     * Booking Service cũng gọi endpoint này để kiểm tra ghế và tính tổng tiền.
     */
    public SeatLayoutResponse getSeatLayout(Long id) {
        Showtime showtime = findDetailOrThrow(id);
        int basePrice = showtime.getBasePrice();

        List<Seat> seats = seatRepository
                .findByRoomIdOrderBySeatRowAscSeatNumberAsc(showtime.getRoom().getId());

        List<SeatResponse> seatResponses = seats.stream()
                .map(seat -> SeatResponse.from(seat, seatPricingService.priceFor(seat.getType(), basePrice)))
                .toList();

        return SeatLayoutResponse.of(showtime, seatResponses);
    }

    /** POST /api/showtimes (ADMIN) */
    @Transactional
    public ShowtimeResponse create(ShowtimeRequest request) {
        Movie movie = findMovieOrThrow(request.movieId());
        Room room = findRoomOrThrow(request.roomId());
        LocalDateTime endTime = calculateEndTime(movie, request.startTime());

        validateStartTime(request.startTime());
        validateNoOverlap(room.getId(), request.startTime(), endTime, null);

        Showtime showtime = new Showtime();
        showtime.setMovie(movie);
        showtime.setRoom(room);
        showtime.setStartTime(request.startTime());
        showtime.setEndTime(endTime);
        showtime.setBasePrice(request.basePrice());

        return ShowtimeResponse.from(showtimeRepository.save(showtime));
    }

    /** PUT /api/showtimes/{id} (ADMIN) */
    @Transactional
    public ShowtimeResponse update(Long id, ShowtimeRequest request) {
        Showtime showtime = findDetailOrThrow(id);
        Movie movie = findMovieOrThrow(request.movieId());
        Room room = findRoomOrThrow(request.roomId());
        LocalDateTime endTime = calculateEndTime(movie, request.startTime());

        validateStartTime(request.startTime());
        // Truyền id của chính nó để không bị tính là trùng với bản cũ của mình
        validateNoOverlap(room.getId(), request.startTime(), endTime, id);

        showtime.setMovie(movie);
        showtime.setRoom(room);
        showtime.setStartTime(request.startTime());
        showtime.setEndTime(endTime);
        showtime.setBasePrice(request.basePrice());

        return ShowtimeResponse.from(showtimeRepository.save(showtime));
    }

    /** DELETE /api/showtimes/{id} (ADMIN) */
    @Transactional
    public void delete(Long id) {
        Showtime showtime = findDetailOrThrow(id);
        showtimeRepository.delete(showtime);
    }

    // ---------- Hàm hỗ trợ ----------

    /** endTime = giờ bắt đầu + thời lượng phim + thời gian dọn phòng. */
    private LocalDateTime calculateEndTime(Movie movie, LocalDateTime startTime) {
        return startTime.plusMinutes(movie.getDurationMinutes() + cleaningMinutes);
    }

    private void validateStartTime(LocalDateTime startTime) {
        if (!startTime.isAfter(LocalDateTime.now())) {
            throw ApiException.badRequest("Giờ bắt đầu phải ở trong tương lai");
        }
    }

    private void validateNoOverlap(Long roomId, LocalDateTime start, LocalDateTime end, Long excludeId) {
        if (showtimeRepository.countOverlapping(roomId, start, end, excludeId) > 0) {
            throw ApiException.conflict("Phòng chiếu đã có suất khác trùng khung giờ này");
        }
    }

    private Showtime findDetailOrThrow(Long id) {
        return showtimeRepository.findDetailById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy suất chiếu với id " + id));
    }

    private Movie findMovieOrThrow(Long id) {
        return movieRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phim với id " + id));
    }

    private Room findRoomOrThrow(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phòng với id " + id));
    }
}