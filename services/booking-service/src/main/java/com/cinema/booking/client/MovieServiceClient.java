package com.cinema.booking.client;

import com.cinema.booking.dto.MovieSeatLayout;
import com.cinema.booking.dto.MovieShowtime;
import com.cinema.booking.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

@Component
public class MovieServiceClient {
    private final RestClient client;

    public MovieServiceClient(RestClient.Builder builder,
                              @Value("${cinema.movie-service-url}") String baseUrl) {
        this.client = builder.baseUrl(baseUrl).build();
    }

    public MovieShowtime getShowtime(Long id) {
        try {
            MovieShowtime response = client.get().uri("/api/showtimes/{id}", id)
                    .retrieve().body(MovieShowtime.class);
            if (response == null) throw ApiException.unavailable("Movie Service không trả dữ liệu suất chiếu");
            return response;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) throw ApiException.notFound("Suất chiếu không tồn tại");
            throw ApiException.unavailable("Movie Service tạm thời không khả dụng");
        } catch (ResourceAccessException ex) {
            throw ApiException.unavailable("Không kết nối được Movie Service");
        }
    }

    public MovieSeatLayout getSeatLayout(Long showtimeId) {
        try {
            MovieSeatLayout response = client.get().uri("/api/showtimes/{id}/seats", showtimeId)
                    .retrieve().body(MovieSeatLayout.class);
            if (response == null) throw ApiException.unavailable("Movie Service không trả sơ đồ ghế");
            return response;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404) throw ApiException.notFound("Không tìm thấy suất chiếu hoặc ghế");
            throw ApiException.unavailable("Movie Service tạm thời không khả dụng");
        } catch (ResourceAccessException ex) {
            throw ApiException.unavailable("Không kết nối được Movie Service");
        }
    }
}
