package com.cinema.gateway.filter;

import com.cinema.gateway.exception.GatewayErrorHandler;
import com.cinema.gateway.security.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Bộ lọc chạy với MỌI request đi qua Gateway, theo api-contract.md mục 1.2:
 *
 *  1. Luôn xóa X-User-Id và X-User-Role do client tự gửi, tránh giả mạo danh tính.
 *  2. Endpoint công khai: cho đi qua không cần token.
 *  3. Endpoint còn lại: bắt buộc "Authorization: Bearer <token>" hợp lệ, sai thì trả 401.
 *  4. Token hợp lệ: gắn X-User-Id (từ claim sub) và X-User-Role (từ claim role) xuống service.
 *
 * Gateway chỉ xác thực (bạn là ai). Việc kiểm tra quyền (có phải ADMIN không)
 * do từng service tự làm dựa trên header X-User-Role.
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    public static final String USER_ID_HEADER = "X-User-Id";
    public static final String USER_ROLE_HEADER = "X-User-Role";

    private static final String BEARER_PREFIX = "Bearer ";

    // /api/auth/** (đăng ký, đăng nhập) công khai với mọi phương thức
    private static final String AUTH_PATTERN = "/api/auth/**";

    // Các đường dẫn chỉ công khai với phương thức GET. Mẫu "/x/**" cũng khớp luôn "/x".
    private static final List<String> PUBLIC_GET_PATTERNS = List.of(
            "/api/movies/**",
            "/api/cinemas/**",
            "/api/showtimes/**"    // gồm cả /seats và /seat-status
    );

    private final JwtUtil jwtUtil;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        // Preflight CORS của trình duyệt không mang token, cho qua
        // (header giả mạo vẫn bị xóa)
        if (HttpMethod.OPTIONS.equals(method) || isPublic(path, method)) {
            return chain.filter(withIdentity(exchange, null, null));
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            return GatewayErrorHandler.writeError(exchange, HttpStatus.UNAUTHORIZED,
                    "Bạn cần đăng nhập để thực hiện thao tác này");
        }

        String token = authHeader.substring(BEARER_PREFIX.length()).trim();
        Claims claims;
        try {
            claims = jwtUtil.parse(token);
        } catch (ExpiredJwtException e) {
            return GatewayErrorHandler.writeError(exchange, HttpStatus.UNAUTHORIZED,
                    "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        } catch (JwtException | IllegalArgumentException e) {
            return GatewayErrorHandler.writeError(exchange, HttpStatus.UNAUTHORIZED,
                    "Token không hợp lệ");
        }

        String userId = claims.getSubject();
        String role = claims.get("role", String.class);
        if (userId == null || userId.isBlank() || role == null || role.isBlank()) {
            return GatewayErrorHandler.writeError(exchange, HttpStatus.UNAUTHORIZED,
                    "Token thiếu thông tin người dùng");
        }

        return chain.filter(withIdentity(exchange, userId, role));
    }

    private boolean isPublic(String path, HttpMethod method) {
        if (pathMatcher.match(AUTH_PATTERN, path)) {
            return true;
        }
        if (HttpMethod.GET.equals(method)) {
            return PUBLIC_GET_PATTERNS.stream().anyMatch(pattern -> pathMatcher.match(pattern, path));
        }
        return false;
    }

    /**
     * Trả về exchange mới với hai header danh tính đã được làm sạch:
     * xóa giá trị client gửi lên, rồi đặt giá trị thật nếu có (userId, role khác null).
     */
    private ServerWebExchange withIdentity(ServerWebExchange exchange, String userId, String role) {
        ServerHttpRequest mutated = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove(USER_ID_HEADER);
                    headers.remove(USER_ROLE_HEADER);
                    if (userId != null) {
                        headers.set(USER_ID_HEADER, userId);
                        headers.set(USER_ROLE_HEADER, role);
                    }
                })
                .build();
        return exchange.mutate().request(mutated).build();
    }

    // Chạy sớm, trước các bộ lọc định tuyến
    @Override
    public int getOrder() {
        return -100;
    }
}