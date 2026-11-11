package com.cinema.booking.exception;

import org.springframework.http.HttpStatus;
import java.time.LocalDateTime;
import java.time.ZoneId;

public record ErrorResponse(LocalDateTime timestamp, int status, String error,
                            String message, String path) {
    public static ErrorResponse of(HttpStatus status, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")),
                status.value(), status.getReasonPhrase(), message, path);
    }
}
