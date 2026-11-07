package com.cinema.movie.service;

import com.cinema.movie.dto.CinemaRequest;
import com.cinema.movie.dto.CinemaResponse;
import com.cinema.movie.entity.Cinema;
import com.cinema.movie.entity.Room;
import com.cinema.movie.exception.ApiException;
import com.cinema.movie.repository.CinemaRepository;
import com.cinema.movie.repository.ShowtimeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CinemaService {

    private final CinemaRepository cinemaRepository;
    private final ShowtimeRepository showtimeRepository;

    public CinemaService(CinemaRepository cinemaRepository, ShowtimeRepository showtimeRepository) {
        this.cinemaRepository = cinemaRepository;
        this.showtimeRepository = showtimeRepository;
    }

    /** GET /api/cinemas: danh sách gọn, không kèm phòng. */
    public List<CinemaResponse> list() {
        return cinemaRepository.findAll().stream()
                .map(CinemaResponse::summary)
                .toList();
    }

    /** GET /api/cinemas/{id}: chi tiết kèm danh sách phòng. */
    public CinemaResponse getDetail(Long id) {
        return CinemaResponse.detail(findOrThrow(id));
    }

    @Transactional
    public CinemaResponse create(CinemaRequest request) {
        Cinema cinema = new Cinema();
        apply(cinema, request);
        return CinemaResponse.summary(cinemaRepository.save(cinema));
    }

    @Transactional
    public CinemaResponse update(Long id, CinemaRequest request) {
        Cinema cinema = findOrThrow(id);
        apply(cinema, request);
        return CinemaResponse.summary(cinemaRepository.save(cinema));
    }

    /** Xóa rạp sẽ xóa luôn phòng và ghế, nên phải chặn nếu có phòng đã có suất chiếu. */
    @Transactional
    public void delete(Long id) {
        Cinema cinema = findOrThrow(id);
        for (Room room : cinema.getRooms()) {
            if (showtimeRepository.existsByRoomId(room.getId())) {
                throw ApiException.conflict(
                        "Không thể xóa rạp vì phòng \"" + room.getName() + "\" đã có suất chiếu");
            }
        }
        cinemaRepository.delete(cinema);
    }

    private Cinema findOrThrow(Long id) {
        return cinemaRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy rạp với id " + id));
    }

    private void apply(Cinema cinema, CinemaRequest r) {
        cinema.setName(r.name().trim());
        cinema.setAddress(r.address().trim());
        cinema.setCity(r.city().trim());
    }
}