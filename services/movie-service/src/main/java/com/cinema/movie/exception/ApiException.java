package com.cinema.movie.exception;

import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ có kèm mã HTTP. Service chỉ cần ném lỗi, ví dụ:
 *   throw ApiException.notFound("Không tìm thấy phim " + id);
 * GlobalExceptionHandler sẽ đổi thành JSON đúng định dạng trong api-contract.md.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, message);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }
}