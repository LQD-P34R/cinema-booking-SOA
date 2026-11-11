package com.cinema.booking.security;

import com.cinema.booking.exception.ApiException;

public final class AuthHelper {
    public static final String ID_HEADER = "X-User-Id";
    public static final String ROLE_HEADER = "X-User-Role";
    private AuthHelper() {}

    public static Long requireUser(String id) {
        if (id == null || id.isBlank()) throw ApiException.unauthorized("Bạn cần đăng nhập");
        try {
            long parsed = Long.parseLong(id);
            if (parsed <= 0) throw new NumberFormatException();
            return parsed;
        } catch (NumberFormatException ex) {
            throw ApiException.unauthorized("Thông tin người dùng không hợp lệ");
        }
    }
    public static void requireAdmin(String role) {
        if (!"ADMIN".equals(role)) throw ApiException.forbidden("Bạn cần quyền ADMIN");
    }
    public static void requireOwnerOrAdmin(Long ownerId, Long currentUser, String role) {
        if (!ownerId.equals(currentUser) && !"ADMIN".equals(role)) {
            throw ApiException.forbidden("Bạn không có quyền xem hoặc thay đổi đơn này");
        }
    }
}
