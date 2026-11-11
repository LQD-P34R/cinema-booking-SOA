import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { PAYMENT_METHODS, formatCurrency, formatDate, formatTime } from '../utils/format.js';

// 12:05 (phút:giây) từ số mili giây còn lại
function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { status, message }
  const [method, setMethod] = useState('CARD');
  const [simulateFail, setSimulateFail] = useState(false);
  const [paying, setPaying] = useState(false);
  const [actionError, setActionError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    api
      .getBooking(bookingId)
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError({ status: err.status, message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const pending = booking?.status === 'PENDING_PAYMENT';

  // Đồng hồ chạy mỗi giây, chỉ khi đơn còn chờ thanh toán
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  const remainingMs = pending ? new Date(booking.expiresAt).getTime() - now : 0;
  const timeIsUp = pending && remainingMs <= 0;

  // Hết giờ thì hỏi lại máy chủ một lần để đồng bộ trạng thái (máy chủ sẽ đánh dấu EXPIRED)
  useEffect(() => {
    if (timeIsUp) {
      api
        .getBooking(bookingId)
        .then(setBooking)
        .catch(() => {});
    }
  }, [timeIsUp, bookingId]);

  const handlePay = async () => {
    setActionError('');
    setPaying(true);
    try {
      const result = await api.payBooking(bookingId, {
        method,
        simulateResult: simulateFail ? 'FAILED' : undefined,
      });
      if (result.status === 'CONFIRMED') {
        navigate(`/tickets/${bookingId}`, { replace: true });
        return;
      }
      // Thanh toán thất bại: máy chủ đã hủy đơn và trả ghế
      setBooking(result);
      setActionError('Thanh toán không thành công. Đơn đã bị hủy và ghế đã được trả lại.');
    } catch (err) {
      setActionError(err.message);
      if (err.status === 409) {
        // Đơn hết hạn hoặc đã đổi trạng thái: tải lại để hiện đúng tình trạng
        api
          .getBooking(bookingId)
          .then(setBooking)
          .catch(() => {});
      }
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Bạn muốn hủy đơn đặt vé này? Ghế sẽ được trả lại cho người khác.')) return;
    setActionError('');
    setPaying(true);
    try {
      setBooking(await api.cancelBooking(bookingId));
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải đơn đặt vé...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    const title =
      loadError.status === 404 ? 'Không tìm thấy đơn đặt vé' : loadError.status === 403 ? 'Bạn không có quyền xem đơn này' : 'Không tải được đơn đặt vé';
    return (
      <div className="container page text-center">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{loadError.message}</p>
        <Link to="/my-bookings" className="btn btn-primary">
          Vé của tôi
        </Link>
      </div>
    );
  }

  // Đơn đã thanh toán xong thì chuyển thẳng sang vé điện tử
  if (booking.status === 'CONFIRMED') {
    return <Navigate to={`/tickets/${bookingId}`} replace />;
  }

  const seatsAgainLink = (
    <Link to={`/booking/${booking.showtimeId}`} className="btn btn-primary">
      Chọn ghế lại
    </Link>
  );

  // Đơn không còn chờ thanh toán (hủy, hết hạn) hoặc đã hết giờ giữ ghế
  if (!pending || timeIsUp) {
    const expired = booking.status === 'EXPIRED' || timeIsUp;
    return (
      <div className="container page text-center">
        <h1 className="page-title">{expired ? 'Đã hết thời gian giữ ghế' : 'Đơn đặt vé đã bị hủy'}</h1>
        {actionError && <div className="alert alert-error">{actionError}</div>}
        <p className="page-subtitle">
          {expired
            ? 'Ghế của bạn đã được trả lại. Vui lòng chọn ghế và đặt lại.'
            : 'Ghế đã được trả lại. Bạn có thể đặt lại nếu vẫn muốn xem suất này.'}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {seatsAgainLink}
          <Link to="/my-bookings" className="btn btn-secondary">
            Vé của tôi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page-title">Thanh toán</h1>
      <p className="page-subtitle">Hoàn tất thanh toán trước khi hết thời gian giữ ghế.</p>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="booking-layout">
        <div className="stack">
          <div className="card">
            <div className="card-body text-center">
              <div className="muted">Thời gian giữ ghế còn lại</div>
              <div className={`countdown${remainingMs < 60000 ? ' urgent' : ''}`}>{formatCountdown(remainingMs)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3>Phương thức thanh toán</h3>
              <p className="muted">Đây là hệ thống thanh toán mô phỏng, không có giao dịch thật.</p>
              <div className="method-list">
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <label key={value} className={`method-option${method === value ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="method"
                      value={value}
                      checked={method === value}
                      onChange={() => setMethod(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <label className="method-option mt-2">
                <input type="checkbox" checked={simulateFail} onChange={(e) => setSimulateFail(e.target.checked)} />
                <span>
                  Giả lập thanh toán thất bại <span className="muted">(dùng khi demo)</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <aside className="card summary-card">
          <div className="card-body">
            <h3>{booking.movieTitle}</h3>
            <p className="muted">
              {booking.cinemaName}
              <br />
              {booking.roomName} • {formatTime(booking.startTime)}, {formatDate(booking.startTime)}
            </p>

            <div className="summary-line">
              <span className="muted">Ghế</span>
              <strong>{booking.seatLabels.join(', ')}</strong>
            </div>
            <div className="summary-line">
              <span className="muted">Mã đơn</span>
              <strong>#{booking.bookingId}</strong>
            </div>
            <div className="summary-line summary-total">
              <span>Tổng tiền</span>
              <span className="price">{formatCurrency(booking.totalAmount)}</span>
            </div>

            <button type="button" className="btn btn-primary btn-block mt-2" disabled={paying} onClick={handlePay}>
              {paying ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(booking.totalAmount)}`}
            </button>
            <button type="button" className="btn btn-ghost btn-block mt-1" disabled={paying} onClick={handleCancel}>
              Hủy đơn
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}