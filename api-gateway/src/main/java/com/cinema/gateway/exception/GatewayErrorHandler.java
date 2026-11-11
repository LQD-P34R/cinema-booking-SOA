package com.cinema.gateway.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.netty.channel.ConnectTimeoutException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.ConnectException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeoutException;

/**
 * Biến mọi lỗi phát sinh ở Gateway thành JSON đúng định dạng api-contract.md mục 1.3:
 * {timestamp, status, error, message, path}.
 * Order -2 để chạy trước bộ xử lý lỗi mặc định của Spring Boot (order -1).
 *
 * Các trường hợp thường gặp:
 *  - Không có route khớp (ví dụ /internal/**): 404
 *  - Service phía sau chưa chạy (connection refused): 503
 *  - Service phía sau phản hồi quá chậm: 504
 */
@Component
@Order(-2)
public class GatewayErrorHandler implements ErrorWebExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GatewayErrorHandler.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.error(ex);
        }

        String path = exchange.getRequest().getURI().getPath();
        HttpStatus status;
        String message;

        if (ex instanceof ResponseStatusException rse) {
            HttpStatus resolved = HttpStatus.resolve(rse.getStatusCode().value());
            status = (resolved != null) ? resolved : HttpStatus.INTERNAL_SERVER_ERROR;
            message = messageFor(status, path);
        } else if (hasCause(ex, ConnectTimeoutException.class) || hasCause(ex, TimeoutException.class)) {
            status = HttpStatus.GATEWAY_TIMEOUT;
            message = "Dịch vụ phản hồi quá chậm, vui lòng thử lại sau";
        } else if (hasCause(ex, ConnectException.class)) {
            log.warn("Không kết nối được service phía sau cho {}: {}", path, ex.getMessage());
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = "Dịch vụ đang tạm thời không khả dụng, vui lòng thử lại sau";
        } else {
            log.error("Lỗi không xác định tại Gateway cho {}", path, ex);
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "Lỗi hệ thống, vui lòng thử lại sau";
        }

        return writeError(exchange, status, message);
    }

    /** Ghi một response lỗi theo định dạng chung. Dùng được cả từ bộ lọc JWT. */
    public static Mono<Void> writeError(ServerWebExchange exchange, HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS).toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        body.put("path", exchange.getRequest().getURI().getPath());

        byte[] bytes;
        try {
            bytes = MAPPER.writeValueAsBytes(body);
        } catch (Exception e) {
            bytes = "{\"status\":500,\"message\":\"Lỗi hệ thống\"}".getBytes(StandardCharsets.UTF_8);
        }

        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(bytes);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    private static String messageFor(HttpStatus status, String path) {
        return switch (status) {
            case NOT_FOUND -> "Không tìm thấy đường dẫn " + path;
            case METHOD_NOT_ALLOWED -> "Phương thức không được hỗ trợ";
            default -> status.getReasonPhrase();
        };
    }

    // Lỗi kết nối thường bị bọc nhiều lớp, nên phải duyệt cả chuỗi nguyên nhân
    private static boolean hasCause(Throwable ex, Class<? extends Throwable> type) {
        Throwable current = ex;
        while (current != null) {
            if (type.isInstance(current)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}