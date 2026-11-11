package com.cinema.user.service;

import com.cinema.user.dto.LoginRequest;
import com.cinema.user.dto.LoginResponse;
import com.cinema.user.dto.RegisterRequest;
import com.cinema.user.dto.UserResponse;
import com.cinema.user.entity.Role;
import com.cinema.user.entity.User;
import com.cinema.user.exception.ApiException;
import com.cinema.user.repository.UserRepository;
import com.cinema.user.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public UserResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email đã tồn tại");
        }
        User user = new User();
        user.setFullName(req.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setPhone(req.phone() == null || req.phone().isBlank() ? null : req.phone().trim());
        user.setRole(Role.CUSTOMER);   // đăng ký công khai luôn là CUSTOMER, không cho tự chọn ADMIN
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(normalize(req.email()))
                .orElseThrow(() -> ApiException.unauthorized("Sai email hoặc mật khẩu"));
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            // Cùng một thông báo cho cả hai trường hợp để không lộ email nào đã đăng ký
            throw ApiException.unauthorized("Sai email hoặc mật khẩu");
        }
        return new LoginResponse(jwtService.generateToken(user), UserResponse.from(user));
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
