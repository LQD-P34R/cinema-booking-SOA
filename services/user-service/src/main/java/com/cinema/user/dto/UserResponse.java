package com.cinema.user.dto;

import com.cinema.user.entity.User;

/** Object "user" theo api-contract.md. Tuyệt đối không có passwordHash. */
public record UserResponse(Long id, String fullName, String email, String phone, String role) {

    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getRole().name());
    }
}
