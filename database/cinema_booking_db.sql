-- Cinema Booking SOA - Booking Service (MySQL 8.0 / InnoDB)
-- 3 bang: bookings, booking_items, seat_claims
-- Co the chay bang MySQL Workbench: File > Open SQL Script > Execute.
-- KHONG su dung DROP TABLE / DROP DATABASE de bao ve du lieu da co.
-- LUU Y: CREATE TABLE IF NOT EXISTS KHONG sua mot bang da ton tai.
-- Neu da tao bookings tu truoc, hay kiem tra SHOW CREATE TABLE bookings;
-- va bo sung cac cot con thieu thay vi nghi script se tu cap nhat bang cu.

CREATE DATABASE IF NOT EXISTS cinema_booking_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE cinema_booking_db;

-- ================================================================
-- 1. BOOKINGS: thong tin don dat ve, trang thai va snapshot suat chieu
-- ================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id              BIGINT NOT NULL AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    showtime_id     BIGINT NOT NULL,

    -- Snapshot thong tin Movie Service tai thoi diem dat (giu lich su on dinh)
    movie_title     VARCHAR(255) NOT NULL,
    cinema_name     VARCHAR(255) NOT NULL,
    room_name       VARCHAR(100) NOT NULL,
    start_time      DATETIME(3) NOT NULL,

    total_amount    BIGINT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at      DATETIME(3) NOT NULL,
    paid_at         DATETIME(3) NULL,
    ticket_code     VARCHAR(50) NULL,

    -- Du lieu thanh toan duoc cache de tra lai ket qua khi goi pay lan 2
    payment_id          BIGINT NULL,
    payment_status      VARCHAR(10) NULL,
    payment_method      VARCHAR(30) NULL,
    payment_amount      BIGINT NULL,
    payment_created_at  DATETIME(3) NULL,
    payment_requested_result VARCHAR(10) NULL,

    -- Thoi han xu ly noi bo, dung khi payment dang duoc goi (tranh job het han)
    payment_processing_until DATETIME(3) NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_bookings_ticket_code (ticket_code),
    KEY idx_bookings_user_created (user_id, created_at),
    KEY idx_bookings_status_expires (status, expires_at),
    KEY idx_bookings_showtime (showtime_id),
    CONSTRAINT chk_bookings_amount CHECK (total_amount >= 0),
    CONSTRAINT chk_bookings_status CHECK (
        status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')
    ),
    CONSTRAINT chk_bookings_payment_status CHECK (
        payment_status IS NULL OR payment_status IN ('SUCCESS', 'FAILED')
    ),
    CONSTRAINT chk_bookings_payment_requested_result CHECK (
        payment_requested_result IS NULL OR payment_requested_result IN ('SUCCESS', 'FAILED')
    )
) ENGINE=InnoDB;

-- ================================================================
-- 2. BOOKING_ITEMS: tung ghe va gia duoc chot trong mot don
-- ================================================================
CREATE TABLE IF NOT EXISTS booking_items (
    id           BIGINT NOT NULL AUTO_INCREMENT,
    booking_id   BIGINT NOT NULL,
    seat_id      BIGINT NOT NULL,
    seat_label   VARCHAR(10) NOT NULL,
    price        BIGINT NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_booking_items_booking_seat (booking_id, seat_id),
    KEY idx_booking_items_seat (seat_id),
    CONSTRAINT fk_booking_items_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_booking_items_price CHECK (price >= 0)
) ENGINE=InnoDB;

-- ================================================================
-- 3. SEAT_CLAIMS: quyen giu (HELD) hoac da ban (SOLD) theo suat chieu
-- ================================================================
CREATE TABLE IF NOT EXISTS seat_claims (
    id           BIGINT NOT NULL AUTO_INCREMENT,
    booking_id   BIGINT NOT NULL,
    showtime_id  BIGINT NOT NULL,
    seat_id      BIGINT NOT NULL,
    status       VARCHAR(10) NOT NULL DEFAULT 'HELD',
    expires_at   DATETIME(3) NULL,

    PRIMARY KEY (id),
    -- Rang buoc quan trong nhat de khong ban trung mot ghe trong mot suat
    UNIQUE KEY uq_seat_claims_showtime_seat (showtime_id, seat_id),
    KEY idx_seat_claims_booking (booking_id),
    KEY idx_seat_claims_status_expires (status, expires_at),
    CONSTRAINT fk_seat_claims_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_seat_claims_status CHECK (status IN ('HELD', 'SOLD')),
    CONSTRAINT chk_seat_claims_held_expiry CHECK (
        status <> 'HELD' OR expires_at IS NOT NULL
    )
) ENGINE=InnoDB;

-- ================================================================
-- KIEM TRA SAU KHI CHAY
-- ================================================================
SHOW TABLES;
SHOW CREATE TABLE bookings;
SHOW CREATE TABLE booking_items;
SHOW CREATE TABLE seat_claims;

-- GHI CHU NGHIEP VU:
-- 1) user_id la ID do User Service quan ly; showtime_id va seat_id thuoc
--    Movie Service. KHONG tao foreign key sang database cua service khac.
-- 2) Khi tao booking, ghi bookings + booking_items + seat_claims trong CUNG
--    mot transaction. Neu bat ky seat_claim nao trung UNIQUE -> rollback don.
-- 3) Khi huy/het han: xoa seat_claims dang HELD va cap nhat trang thai don.
--    Khi thanh toan thanh cong: doi seat_claims sang SOLD, khong xoa.
-- 4) Job het han phai tranh don dang xu ly thanh toan. Payment Service phai
--    idempotent theo booking_id de khong thu tien trung khi retry.
