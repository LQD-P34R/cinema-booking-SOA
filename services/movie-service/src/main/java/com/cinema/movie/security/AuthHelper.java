package com.cinema.movie.security;

import com.cinema.movie.exception.ApiException;

/**
 * Tiện ích kiểm tra quyền dựa trên header do API Gateway gắn xuống (xem api-contract.md mục 1.2).
 * Service không tự parse JWT, chỉ đọc header X-User-Role.
 *
 * Cách dùng trong Controller:
 *   @PostMapping
 *   public ... create(@RequestHeader(value = AuthHelper.ROLE_HEADER, required = false) String role, ...) {
 *       AuthHelper.requireAdmin(role);
 *       ...
 *   }
 */
public final class AuthHelper {

    public static final String ROLE_HEADER = "X-User-Role";
    public static final String ADMIN = "ADMIN";

    private AuthHelper() {
    }

    /** Ném 403 nếu người gọi không phải ADMIN. */
    public static void requireAdmin(String role) {
        if (!ADMIN.equalsIgnoreCase(role)) {
            throw ApiException.forbidden("Bạn không có quyền thực hiện thao tác này");
        }
    }
}