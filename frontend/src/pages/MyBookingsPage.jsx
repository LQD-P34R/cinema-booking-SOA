import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import {
  BOOKING_STATUS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  statusInfo,
} from '../utils/format.js';

const FILTERS = [
  { key: 'ALL', label: 'Tất cả', match: () => true },
  { key: 'CONFIRMED', label: 'Đã xác nhận', match: (status) => status === 'CONFIRMED' },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán', match: (status) => status === 'PENDING_PAYMENT' },
  { key: 'CLOSED', label: 'Đã hủy / hết hạn', match: (status) => status === 'CANCELLED' || status === 'EXPIRED' },
];

// Đơn chờ thanh toán mà đã quá giờ giữ ghế thì coi như hết hạn,
// dù máy chủ chưa kịp cập nhật trạng thái (job hết hạn chạy định kỳ)
function effectiveStatus(booking) {
  if (booking.status === 'PENDING_PAYMENT' && new Date(booking.expiresAt) <= new Date()) {
    return 'EXPIRED';
  }
  return booking.status;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .getMyBookings()
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

  const handleCancel = async (booking) => {
    if (!window.confirm('Bạn muốn hủy đơn đặt vé này? Ghế sẽ được trả lại cho người khác.')) return;
    setActionError('');
    setBusyId(booking.bookingId);
    try {
      const updated = await api.cancelBooking(booking.bookingId);
      setBookings((current) => current.map((b) => (b.bookingId === updated.bookingId ? updated : b)));
    } catch (err) {
      setActionError(err.message);
      setReloadKey((k) => k + 1); // trạng thái có thể đã đổi (ví dụ vừa hết hạn), tải lại cho đúng
    } finally {
      setBusyId(null);
    }
  };

  const activeFilter = FILTERS.find((f) => f.key === filter);
  const visible = bookings.filter((b) => activeFilter.match(effectiveStatus(b)));

  return (
    <div className="container page">
      <h1 className="page-title">Vé của tôi</h1>
      <p className="page-subtitle">Lịch sử đặt vé và trạng thái thanh toán của bạn.</p>

      <div className="chips mb-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip${filter === f.key ? ' active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error row row-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải lịch sử đặt vé...</span>
        </div>
      ) : (
        !error &&
        (visible.length === 0 ? (
          <div className="empty">
            {bookings.length === 0 ? (
              <>
                Bạn chưa đặt vé nào. <Link to="/">Xem phim đang chiếu</Link>
              </>
            ) : (
              'Không có đơn nào ở mục này.'
            )}
          </div>
        ) : (
          <div className="stack">
            {visible.map((booking) => {
              const status = effectiveStatus(booking);
              const info = statusInfo(BOOKING_STATUS, status);
              const busy = busyId === booking.bookingId;

              return (
                <div key={booking.bookingId} className="card">
                  <div className="card-body">
                    <div className="row row-between">
                      <h3 style={{ margin: 0 }}>{booking.movieTitle}</h3>
                      <span className={`badge ${info.badge}`}>{info.label}</span>
                    </div>

                    <p className="muted mt-1">
                      {booking.cinemaName} • {booking.roomName}
                      <br />
                      Suất chiếu: {formatTime(booking.startTime)}, {formatDate(booking.startTime)}
                    </p>

                    <div className="summary-line">
                      <span className="muted">Ghế</span>
                      <strong>{booking.seatLabels.join(', ')}</strong>
                    </div>
                    <div className="summary-line">
                      <span className="muted">Tổng tiền</span>
                      <span className="price">{formatCurrency(booking.totalAmount)}</span>
                    </div>
                    <div className="summary-line">
                      <span className="muted">Mã đơn / Ngày đặt</span>
                      <span>
                        #{booking.bookingId} • {formatDateTime(booking.createdAt)}
                      </span>
                    </div>
                    {status === 'CONFIRMED' && booking.ticketCode && (
                      <div className="summary-line">
                        <span className="muted">Mã vé</span>
                        <strong>{booking.ticketCode}</strong>
                      </div>
                    )}

                    <div className="form-actions mt-2">
                      {status === 'CONFIRMED' && (
                        <Link to={`/tickets/${booking.bookingId}`} className="btn btn-primary btn-sm">
                          Xem vé
                        </Link>
                      )}
                      {status === 'PENDING_PAYMENT' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busy}
                            onClick={() => handleCancel(booking)}
                          >
                            {busy ? 'Đang hủy...' : 'Hủy đơn'}
                          </button>
                          <Link to={`/payment/${booking.bookingId}`} className="btn btn-primary btn-sm">
                            Thanh toán
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}