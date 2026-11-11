package com.cinema.user.dto;

public record LoginResponse(String token, UserResponse user) {
}
