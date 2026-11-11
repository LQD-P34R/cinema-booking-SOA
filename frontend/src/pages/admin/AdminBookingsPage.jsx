import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import {
  BOOKING_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  statusInfo,
} from '../../utils/format.js';

// Đơn chờ thanh toán đã quá giờ giữ ghế thì coi là hết hạn, dù máy chủ chưa kịp cập nhật
function effectiveStatus(booking) {
  if (booking.status === 'PENDING_PAYMENT' && new Date(booking.expiresAt) <= new Date()) {
    return 'EXPIRED';
  }
  return booking.status;
}

function Line({ label, children }) {
  return (
    <div className="summary-line">
      <span className="muted">{label}</span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="muted">{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}

// ---------- Chi tiết một đơn, kèm giao dịch thanh toán (nếu có) ----------

function BookingDetailModal({ booking, onClose }) {
  const [payment, setPayment] = useState(null);
  const [paymentState, setPaymentState] = useState('loading'); // loading | ready | none | error

  useEffect(() => {
    let cancelled = false;
    setPaymentState('loading');
    api
      .getPaymentByBooking(booking.bookingId)
      .then((data) => {
        if (cancelled) return;
        setPayment(data);
        setPaymentState('ready');
      })
      .catch((err) => {
        if (!cancelled) setPaymentState(err.status === 404 ? 'none' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [booking.bookingId]);

  const status = statusInfo(BOOKING_STATUS, effectiveStatus(booking));

  return (
    <Modal title={`Đơn đặt vé #${booking.bookingId}`} onClose={onClose}>
      <Line label="Trạng thái">
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </Line>
      <Line label="Mã khách hàng">{booking.userId ?? '—'}</Line>
      <Line label="Phim">
        <strong>{booking.movieTitle}</strong>
      </Line>
      <Line label="Rạp / Phòng">
        {booking.cinemaName} • {booking.roomName}
      </Line>
      <Line label="Suất chiếu">{formatDateTime(booking.startTime)}</Line>
      <Line label="Ghế">
        <strong>{booking.seatLabels.join(', ')}</strong>
      </Line>
      <Line label="Tổng tiền">
        <span className="price">{formatCurrency(booking.totalAmount)}</span>
      </Line>
      <Line label="Ngày đặt">{formatDateTime(booking.createdAt)}</Line>
      {booking.status === 'PENDING_PAYMENT' && <Line label="Hạn giữ ghế">{formatDateTime(booking.expiresAt)}</Line>}
      {booking.paidAt && <Line label="Thanh toán lúc">{formatDateTime(booking.paidAt)}</Line>}
      {booking.ticketCode && (
        <Line label="Mã vé">
          <strong>{booking.ticketCode}</strong>
        </Line>
      )}

      <h4 className="mt-2">Giao dịch thanh toán</h4>
      {paymentState === 'loading' && <div className="muted">Đang tải...</div>}
      {paymentState === 'none' && <div className="muted">Đơn này chưa có giao dịch thanh toán.</div>}
      {paymentState === 'error' && <div className="alert alert-error">Không tải được giao dịch thanh toán.</div>}
      {paymentState === 'ready' && payment && (
        <>
          <Line label="Mã giao dịch">#{payment.paymentId}</Line>
          <Line label="Phương thức">{PAYMENT_METHODS[payment.method] ?? payment.method}</Line>
          <Line label="Kết quả">
            <span className={`badge ${statusInfo(PAYMENT_STATUS, payment.status).badge}`}>
              {statusInfo(PAYMENT_STATUS, payment.status).label}
            </span>
          </Line>
          <Line label="Số tiền">{formatCurrency(payment.amount)}</Line>
          {payment.createdAt && <Line label="Thời gian">{formatDateTime(payment.createdAt)}</Line>}
        </>
      )}

      <div className="form-actions mt-2">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
    </Modal>
  );
}

// ---------- Trang chính ----------

const STATUS_FILTERS = [{ key: 'ALL', label: 'Tất cả' }, ...Object.entries(BOOKING_STATUS).map(([key, info]) => ({ key, label: info.label }))];

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .getAllBookings()
      .then((data) => {
        if (!cancelled) setBookings(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Thống kê trên toàn bộ đơn, không phụ thuộc bộ lọc đang chọn
  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'CONFIRMED');
    return {
      total: bookings.length,
      confirmed: confirmed.length,
      pending: bookings.filter((b) => effectiveStatus(b) === 'PENDING_PAYMENT').length,
      revenue: confirmed.reduce((sum, b) => sum + b.totalAmount, 0),
    };
  }, [bookings]);

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return bookings
      .filter((b) => statusFilter === 'ALL' || effectiveStatus(b) === statusFilter)
      .filter(
        (b) =>
          !keyword ||
          [b.bookingId, b.ticketCode, b.movieTitle, b.userId, b.cinemaName].join(' ').toLowerCase().includes(keyword),
      );
  }, [bookings, statusFilter, search]);

  return (
    <div>
      <div
        className="mb-2"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}
      >
        <StatCard label="Tổng số đơn" value={stats.total} />
        <StatCard label="Đã xác nhận" value={stats.confirmed} />
        <StatCard label="Đang chờ thanh toán" value={stats.pending} />
        <StatCard label="Doanh thu (đơn đã xác nhận)" value={formatCurrency(stats.revenue)} />
      </div>

      <div className="toolbar">
        <div className="chips">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip${statusFilter === f.key ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Tìm mã đơn, mã vé, phim, khách..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="spacer" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
          Làm mới
        </button>
      </div>

      {error && (
        <div className="alert alert-error row row-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải danh sách đơn đặt vé...</span>
        </div>
      ) : (
        !error &&
        (visible.length === 0 ? (
          <div className="empty">Không có đơn đặt vé nào phù hợp.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách</th>
                  <th>Phim</th>
                  <th>Suất chiếu</th>
                  <th>Ghế</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Ngày đặt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => {
                  const status = statusInfo(BOOKING_STATUS, effectiveStatus(booking));
                  return (
                    <tr key={booking.bookingId}>
                      <td>
                        <strong>#{booking.bookingId}</strong>
                      </td>
                      <td>{booking.userId ?? '—'}</td>
                      <td>{booking.movieTitle}</td>
                      <td>
                        {formatTime(booking.startTime)}, {formatDate(booking.startTime)}
                        <div className="muted">
                          {booking.cinemaName} • {booking.roomName}
                        </div>
                      </td>
                      <td>{booking.seatLabels.join(', ')}</td>
                      <td className="price">{formatCurrency(booking.totalAmount)}</td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td>{formatDateTime(booking.createdAt)}</td>
                      <td>
                        <div className="actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetail(booking)}>
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}

      {detail && <BookingDetailModal booking={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}