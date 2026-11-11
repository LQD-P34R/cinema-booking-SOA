package com.cinema.booking.client;

import com.cinema.booking.dto.PaymentChargeRequest;
import com.cinema.booking.dto.PaymentChargeResponse;
import com.cinema.booking.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

@Component
public class PaymentServiceClient {
    private final RestClient client;

    public PaymentServiceClient(RestClient.Builder builder,
                                @Value("${cinema.payment-service-url}") String baseUrl) {
        this.client = builder.baseUrl(baseUrl).build();
    }

    public PaymentChargeResponse charge(PaymentChargeRequest request) {
        try {
            PaymentChargeResponse result = client.post().uri("/internal/payments")
                    .body(request).retrieve().body(PaymentChargeResponse.class);
            if (result == null) throw ApiException.unavailable("Payment Service không trả kết quả");
            return result;
        } catch (RestClientResponseException ex) {
            // Không hủy giữ ghế nếu giao dịch chưa rõ kết quả; lần sau sẽ gọi lại theo bookingId.
            throw ApiException.unavailable("Payment Service chưa xác nhận giao dịch, hãy thử lại sau");
        } catch (ResourceAccessException ex) {
            throw ApiException.unavailable("Không kết nối được Payment Service, hãy thử lại sau");
        }
    }
}
