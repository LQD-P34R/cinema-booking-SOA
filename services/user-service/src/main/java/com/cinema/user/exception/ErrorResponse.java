package com.cinema.user.exception;

import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;

/** Định dạng lỗi chung của cả hệ thống, khớp api-contract.md mục 1.3. */
public record ErrorResponse(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
) {

    public static ErrorResponse of(HttpStatus status, String message, String path) {
        return new ErrorResponse(LocalDateTime.now(), status.value(), status.getReasonPhrase(), message, path);
    }
}
