package com.cinema.user.config;

import com.cinema.user.entity.Role;
import com.cinema.user.entity.User;
import com.cinema.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Tự tạo tài khoản ADMIN mẫu ở lần chạy đầu tiên. Chạy lại nhiều lần không tạo trùng. */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;
    private final String adminFullName;
    private final String adminPhone;

    public DataInitializer(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           @Value("${cinema.admin.email}") String adminEmail,
                           @Value("${cinema.admin.password}") String adminPassword,
                           @Value("${cinema.admin.full-name}") String adminFullName,
                           @Value("${cinema.admin.phone}") String adminPhone) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminFullName = adminFullName;
        this.adminPhone = adminPhone;
    }

    @Override
    public void run(String... args) {
        if (userRepository.existsByEmail(adminEmail)) {
            return;
        }
        User admin = new User();
        admin.setFullName(adminFullName);
        admin.setEmail(adminEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminPassword));
        admin.setPhone(adminPhone);
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        log.info("Đã tạo tài khoản ADMIN mẫu: {}", adminEmail);
    }
}
