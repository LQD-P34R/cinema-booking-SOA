package com.cinema.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Kiểm tra JWT do User Service phát hành (HS256), theo api-contract.md mục 1.2.
 * Claims: sub (userId), email, role (CUSTOMER hoặc ADMIN), exp.
 *
 * Secret được dùng nguyên văn dạng chuỗi (UTF-8). Nếu User Service lại giải mã secret
 * từ Base64 trước khi ký thì hai bên sẽ lệch khóa và mọi token đều bị từ chối.
 */
@Component
public class JwtUtil {

    private final SecretKey key;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("jwt.secret phải có ít nhất 32 ký tự (HS256)");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
    }

    /**
     * Kiểm tra chữ ký và hạn dùng, trả về claims nếu token hợp lệ.
     * Ném JwtException (hoặc con của nó như ExpiredJwtException) nếu token sai hoặc hết hạn.
     */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}