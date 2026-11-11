package com.cinema.user.security;

import com.cinema.user.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Phát hành JWT (HS256) theo api-contract.md mục 1.2.
 * Claims: sub (userId), email, role, exp.
 * Secret dùng nguyên văn dạng chuỗi UTF-8 (KHÔNG giải mã Base64) để khớp với Gateway.
 */
@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMillis;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiration-hours:24}") long expirationHours) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("jwt.secret phải có ít nhất 32 ký tự (HS256)");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMillis = expirationHours * 60 * 60 * 1000;
    }

    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMillis))
                .signWith(key, Jwts.SIG.HS256)   // ép HS256 đúng contract dù secret dài hơn 32 byte
                .compact();
    }
}
