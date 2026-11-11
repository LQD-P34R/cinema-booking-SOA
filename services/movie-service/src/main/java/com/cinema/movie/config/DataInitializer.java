package com.cinema.movie.config;

import com.cinema.movie.dto.CinemaRequest;
import com.cinema.movie.dto.MovieRequest;
import com.cinema.movie.dto.RoomRequest;
import com.cinema.movie.dto.ShowtimeRequest;
import com.cinema.movie.entity.MovieStatus;
import com.cinema.movie.repository.MovieRepository;
import com.cinema.movie.service.CinemaService;
import com.cinema.movie.service.MovieService;
import com.cinema.movie.service.RoomService;
import com.cinema.movie.service.ShowtimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Nạp dữ liệu mẫu để demo ngay khi chạy lần đầu: 6 phim (4 đang chiếu, 2 sắp chiếu),
 * 2 rạp, mỗi rạp 2 phòng, và suất chiếu cho 7 ngày tới.
 * Chỉ chạy khi bảng phim còn trống, nên restart không bị nạp trùng.
 * Muốn tắt: đặt biến môi trường CINEMA_SEED_ENABLED=false.
 *
 * Dữ liệu đi qua các Service nên ghế được tự sinh và giờ kết thúc được tự tính như bình thường.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final MovieRepository movieRepository;
    private final MovieService movieService;
    private final CinemaService cinemaService;
    private final RoomService roomService;
    private final ShowtimeService showtimeService;
    private final boolean seedEnabled;

    public DataInitializer(MovieRepository movieRepository,
                           MovieService movieService,
                           CinemaService cinemaService,
                           RoomService roomService,
                           ShowtimeService showtimeService,
                           @Value("${CINEMA_SEED_ENABLED:true}") boolean seedEnabled) {
        this.movieRepository = movieRepository;
        this.movieService = movieService;
        this.cinemaService = cinemaService;
        this.roomService = roomService;
        this.showtimeService = showtimeService;
        this.seedEnabled = seedEnabled;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled || movieRepository.count() > 0) {
            return;
        }
        log.info("Đang nạp dữ liệu mẫu cho Movie Service...");
        List<Long> nowShowingIds = seedMovies();
        List<Long> roomIds = seedCinemasAndRooms();
        seedShowtimes(nowShowingIds, roomIds);
        log.info("Nạp dữ liệu mẫu xong: {} phim đang chiếu, {} phòng", nowShowingIds.size(), roomIds.size());
    }

    /** Trả về id của 4 phim đang chiếu (dùng để xếp suất chiếu). */
    private List<Long> seedMovies() {
        List<Long> nowShowing = new ArrayList<>();

        nowShowing.add(createMovie("Hành Trình Về Phương Nam", "Phiêu lưu", 131, "T13",
                "Một nhóm bạn trẻ vượt qua miền sông nước để tìm lại ngôi nhà cũ của gia đình.",
                MovieStatus.NOW_SHOWING, 30));
        nowShowing.add(createMovie("Mùa Hè Của Ngoại", "Tâm lý", 120, "P",
                "Câu chuyện ấm áp về tình bà cháu trong một mùa hè ở miền quê.",
                MovieStatus.NOW_SHOWING, 20));
        nowShowing.add(createMovie("Điệp Vụ Bóng Đêm", "Hành động", 105, "T16",
                "Một đặc vụ nghỉ hưu bị kéo trở lại cuộc chơi sau một đêm biến cố.",
                MovieStatus.NOW_SHOWING, 15));
        nowShowing.add(createMovie("Thành Phố Không Ngủ", "Hình sự", 148, "T18",
                "Cuộc truy lùng kẻ giấu mặt len lỏi qua những con hẻm của đô thị về đêm.",
                MovieStatus.NOW_SHOWING, 10));

        createMovie("Vũ Điệu Cuối Cùng", "Tình cảm", 112, "T13",
                "Hai vũ công trẻ gặp lại nhau sau mười năm trước đêm diễn lớn.",
                MovieStatus.COMING_SOON, -14);
        createMovie("Rừng Thì Thầm", "Kinh dị", 98, "T18",
                "Đoàn khảo sát rừng nguyên sinh nghe thấy tiếng gọi không thuộc về con người.",
                MovieStatus.COMING_SOON, -30);

        return nowShowing;
    }

    /** daysAgo dương: phim đã ra mắt cách đây bấy nhiêu ngày; âm: sẽ ra mắt sau bấy nhiêu ngày. */
    private Long createMovie(String title, String genre, int duration, String ageRating,
                             String description, MovieStatus status, int daysAgo) {
        String poster = "https://placehold.co/300x450/png?text=" + title.replace(" ", "+");
        MovieRequest request = new MovieRequest(
                title, description, genre, duration,
                LocalDate.now().minusDays(daysAgo),
                poster, null, ageRating, status);
        return movieService.create(request).id();
    }

    /** 2 rạp, mỗi rạp 2 phòng (phòng lớn 8x10 và phòng nhỏ 6x8). Trả về id 4 phòng. */
    private List<Long> seedCinemasAndRooms() {
        List<Long> roomIds = new ArrayList<>();

        Long cinema1 = cinemaService.create(
                new CinemaRequest("Cinema Sao Việt - Quận 1", "12 Lê Lợi, Quận 1", "TP.HCM")).id();
        Long cinema2 = cinemaService.create(
                new CinemaRequest("Cinema Sao Việt - Thủ Đức", "45 Võ Văn Ngân, TP. Thủ Đức", "TP.HCM")).id();

        for (Long cinemaId : List.of(cinema1, cinema2)) {
            roomIds.add(roomService.create(cinemaId, new RoomRequest("Phòng 1", 8, 10)).id());
            roomIds.add(roomService.create(cinemaId, new RoomRequest("Phòng 2", 6, 8)).id());
        }
        return roomIds;
    }

    /**
     * Mỗi phòng chiếu 2 phim mỗi ngày: phim A lúc 10:00 và 13:30, phim B lúc 17:00 và 20:30.
     * Phòng j chiếu phim j (phim A) và phim j+1 (phim B), nên mỗi phim xuất hiện ở nhiều rạp.
     * Phim dài nhất 148 phút + 15 phút dọn phòng vẫn không chồng lên suất kế tiếp.
     */
    private void seedShowtimes(List<Long> movieIds, List<Long> roomIds) {
        LocalTime[] slots = {LocalTime.of(10, 0), LocalTime.of(13, 30), LocalTime.of(17, 0), LocalTime.of(20, 30)};
        int[] prices = {70000, 80000, 90000, 100000};
        LocalDateTime now = LocalDateTime.now();

        for (int day = 0; day < 7; day++) {
            LocalDate date = LocalDate.now().plusDays(day);
            for (int j = 0; j < roomIds.size(); j++) {
                Long movieA = movieIds.get(j % movieIds.size());
                Long movieB = movieIds.get((j + 1) % movieIds.size());

                for (int s = 0; s < slots.length; s++) {
                    LocalDateTime start = date.atTime(slots[s]);
                    if (!start.isAfter(now)) {
                        continue; // bỏ qua suất đã qua của hôm nay
                    }
                    Long movieId = (s < 2) ? movieA : movieB;
                    try {
                        showtimeService.create(new ShowtimeRequest(movieId, roomIds.get(j), start, prices[s]));
                    } catch (Exception e) {
                        log.warn("Bỏ qua suất chiếu {} phòng {}: {}", start, roomIds.get(j), e.getMessage());
                    }
                }
            }
        }
    }
}