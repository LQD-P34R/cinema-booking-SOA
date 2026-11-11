package com.cinema.movie.service;

import com.cinema.movie.entity.SeatType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Tính giá ghế theo loại, đúng quy tắc trong api-contract.md:
 * STANDARD = giá gốc, VIP = giá gốc x 1.3, COUPLE = giá gốc x 2, làm tròn xuống đến hàng nghìn.
 * Hệ số đọc từ application.yml (mục cinema.seat-price).
 *
 * Dùng BigDecimal thay vì double để tránh sai số, ví dụ 90000 x 1.3
 * không được thành 116999.99999 rồi bị làm tròn xuống 116000.
 */
@Service
public class SeatPricingService {

    private final BigDecimal vipMultiplier;
    private final BigDecimal coupleMultiplier;
    private final BigDecimal roundTo;

    public SeatPricingService(
            @Value("${cinema.seat-price.vip-multiplier:1.3}") double vipMultiplier,
            @Value("${cinema.seat-price.couple-multiplier:2.0}") double coupleMultiplier,
            @Value("${cinema.seat-price.round-to:1000}") int roundTo) {
        this.vipMultiplier = BigDecimal.valueOf(vipMultiplier);
        this.coupleMultiplier = BigDecimal.valueOf(coupleMultiplier);
        this.roundTo = BigDecimal.valueOf(roundTo);
    }

    public int priceFor(SeatType type, int basePrice) {
        BigDecimal raw = BigDecimal.valueOf(basePrice);
        BigDecimal price = switch (type) {
            case STANDARD -> raw;
            case VIP -> raw.multiply(vipMultiplier);
            case COUPLE -> raw.multiply(coupleMultiplier);
        };
        // Làm tròn xuống bội số của roundTo
        return price.divide(roundTo, 0, RoundingMode.DOWN)
                .multiply(roundTo)
                .intValueExact();
    }
}