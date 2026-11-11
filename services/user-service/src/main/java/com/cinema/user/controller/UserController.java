package com.cinema.user.controller;

import com.cinema.user.dto.UpdateProfileRequest;
import com.cinema.user.dto.UserResponse;
import com.cinema.user.exception.ApiException;
import com.cinema.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse me(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        return userService.getById(parseUserId(userId));
    }

    @PutMapping("/me")
    public UserResponse updateMe(@RequestHeader(value = "X-User-Id", required = false) String userId,
                                 @Valid @RequestBody UpdateProfileRequest req) {
        return userService.updateProfile(parseUserId(userId), req);
    }

    // Gateway đã kiểm tra JWT và gắn X-User-Id. Thiếu header nghĩa là request không đi qua Gateway.
    private Long parseUserId(String header) {
        if (header == null || header.isBlank()) {
            throw ApiException.unauthorized("Thiếu thông tin người dùng (X-User-Id)");
        }
        try {
            return Long.parseLong(header.trim());
        } catch (NumberFormatException e) {
            throw ApiException.unauthorized("X-User-Id không hợp lệ");
        }
    }
}
