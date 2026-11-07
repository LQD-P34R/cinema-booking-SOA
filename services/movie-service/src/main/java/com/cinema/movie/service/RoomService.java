package com.cinema.movie.service;

import com.cinema.movie.dto.RoomRequest;
import com.cinema.movie.dto.RoomResponse;
import com.cinema.movie.dto.RoomUpdateRequest;
import com.cinema.movie.dto.SeatResponse;
import com.cinema.movie.entity.Cinema;
import com.cinema.movie.entity.Room;
import com.cinema.movie.entity.Seat;
import com.cinema.movie.entity.SeatType;
import com.cinema.movie.exception.ApiException;
import com.cinema.movie.repository.CinemaRepository;
import com.cinema.movie.repository.RoomRepository;
import com.cinema.movie.repository.SeatRepository;
import com.cinema.movie.repository.ShowtimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomService {

    private final RoomRepository roomRepository;
    private final CinemaRepository cinemaRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;

    public RoomService(RoomRepository roomRepository,
                       CinemaRepository cinemaRepository,
                       SeatRepository seatRepository,
                       ShowtimeRepository showtimeRepository) {
        this.roomRepository = roomRepository;
        this.cinemaRepository = cinemaRepository;
        this.seatRepository = seatRepository;
        this.showtimeRepository = showtimeRepository;
    }

    /**
     * POST /api/cinemas/{cinemaId}/rooms: tạo phòng và tự sinh ghế totalRows x seatsPerRow.
     * Hàng đặt tên A, B, C...; số ghế 1..seatsPerRow.
     */
    @Transactional
    public RoomResponse create(Long cinemaId, RoomRequest request) {
        Cinema cinema = cinemaRepository.findById(cinemaId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy rạp với id " + cinemaId));

        Room room = new Room();
        room.setName(request.name().trim());
        room.setTotalRows(request.totalRows());
        room.setSeatsPerRow(request.seatsPerRow());
        room.setCinema(cinema);
        generateSeats(room);

        // Cascade ALL: lưu phòng sẽ lưu luôn toàn bộ ghế
        return RoomResponse.from(roomRepository.save(room));
    }

    /** PUT /api/rooms/{id}: chỉ đổi tên. */
    @Transactional
    public RoomResponse update(Long id, RoomUpdateRequest request) {
        Room room = findOrThrow(id);
        room.setName(request.name().trim());
        return RoomResponse.from(roomRepository.save(room));
    }

    /** DELETE /api/rooms/{id}: phòng đã có suất chiếu thì không được xóa. */
    @Transactional
    public void delete(Long id) {
        Room room = findOrThrow(id);
        if (showtimeRepository.existsByRoomId(id)) {
            throw ApiException.conflict("Không thể xóa phòng vì đã có suất chiếu");
        }
        roomRepository.delete(room);
    }

    /** PUT /api/rooms/{roomId}/seats/{seatId}: đổi loại ghế. */
    @Transactional
    public SeatResponse changeSeatType(Long roomId, Long seatId, SeatType type) {
        Seat seat = seatRepository.findByIdAndRoomId(seatId, roomId)
                .orElseThrow(() -> ApiException.notFound(
                        "Không tìm thấy ghế " + seatId + " trong phòng " + roomId));
        seat.setType(type);
        return SeatResponse.from(seatRepository.save(seat));
    }

    private Room findOrThrow(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phòng với id " + id));
    }

    /**
     * Sinh ghế cho phòng. Mặc định STANDARD; nếu phòng có từ 4 hàng trở lên
     * thì 2 hàng cuối (xa màn hình nhất) là VIP. Admin có thể đổi loại từng ghế sau.
     */
    private void generateSeats(Room room) {
        int rows = room.getTotalRows();
        int perRow = room.getSeatsPerRow();
        boolean hasVipRows = rows >= 4;

        for (int r = 0; r < rows; r++) {
            String rowLabel = String.valueOf((char) ('A' + r));
            SeatType type = (hasVipRows && r >= rows - 2) ? SeatType.VIP : SeatType.STANDARD;
            for (int n = 1; n <= perRow; n++) {
                Seat seat = new Seat();
                seat.setRoom(room);
                seat.setSeatRow(rowLabel);
                seat.setSeatNumber(n);
                seat.setType(type);
                room.getSeats().add(seat);
            }
        }
    }
}