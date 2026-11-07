import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import SeatMap from '../components/SeatMap.jsx';
import { SEAT_TYPES, formatCurrency, formatDate, formatTime } from '../utils/format.js';

const MAX_SEATS = 8; // giới hạn mỗi đơn, khớp api-contract.md
const REFRESH_MS = 15000; // cứ 15 giây làm mới trạng thái ghế để thấy ghế người khác vừa giữ

export default function BookingPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();

  const [showtime, setShowtime] = useState(null);
  const [movie, setMovie] = useState(null);
  const [seatMap, setSeatMap] = useState(null);
  const [selected, setSelected] = useState([]); // mảng id ghế đang chọn
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { status, message }
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tải suất chiếu và sơ đồ ghế (cấu trúc từ Movie Service ghép với trạng thái từ Booking Service)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([api.getShowtime(showtimeId), api.getSeatMap(showtimeId)])
      .then(async ([showtimeData, seatMapData]) => {
        if (cancelled) return;
        setShowtime(showtimeData);
        setSeatMap(seatMapData);
        try {
          const movieData = await api.getMovie(showtimeData.movieId);
          if (!cancelled) setMovie(movieData);
        } catch {
          /* không có thông tin phim thì vẫn đặt vé được, chỉ thiếu poster */
        }
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
  }, [showtimeId]);

  const refreshSeats = useCallback(async () => {
    const fresh = await api.getSeatMap(showtimeId);
    setSeatMap(fresh);
    return fresh;
  }, [showtimeId]);

  // Làm mới định kỳ, bỏ qua lỗi tạm thời (mất mạng...) để không làm phiền người dùng
  useEffect(() => {
    if (!seatMap || submitting) return undefined;
    const timer = setInterval(() => {
      refreshSeats().catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [seatMap, submitting, refreshSeats]);

  // Ghế đang chọn mà vừa bị người khác giữ hoặc mua thì bỏ khỏi danh sách chọn và báo cho người dùng
  useEffect(() => {
    if (!seatMap) return;
    const availableIds = new Set(seatMap.seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id));
    const lost = selected.filter((id) => !availableIds.has(id));
    if (lost.length > 0) {
      const labels = lost.map((id) => seatMap.seats.find((s) => s.id === id)?.label ?? id).join(', ');
      setSelected((current) => current.filter((id) => availableIds.has(id)));
      setNotice(`Ghế ${labels} vừa có người khác giữ hoặc mua, vui lòng chọn ghế khác.`);
    }
  }, [seatMap, selected]);

  const selectedSeats = useMemo(
    () => (seatMap ? seatMap.seats.filter((s) => selected.includes(s.id)) : []),
    [seatMap, selected],
  );
  const total = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);

  const started = showtime ? new Date(showtime.startTime) <= new Date() : false;

  const handleToggle = (seat) => {
    setNotice('');
    setActionError('');
    if (seat.status !== 'AVAILABLE') return;

    if (selected.includes(seat.id)) {
      setSelected((current) => current.filter((id) => id !== seat.id));
    } else if (selected.length >= MAX_SEATS) {
      setNotice(`Mỗi đơn chỉ được đặt tối đa ${MAX_SEATS} ghế.`);
    } else {
      setSelected((current) => [...current, seat.id]);
    }
  };

  const handleHold = async () => {
    setActionError('');
    setNotice('');
    setSubmitting(true);
    try {
      const booking = await api.createBooking(showtime.id, selected);
      navigate(`/payment/${booking.bookingId}`);
    } catch (err) {
      setActionError(err.message);
      if (err.status === 409 || err.status === 404) {
        // Có người nhanh tay hơn: tải lại sơ đồ để thấy ghế nào đã bị giữ
        try {
          await refreshSeats();
        } catch {
          /* bỏ qua */
        }
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải sơ đồ ghế...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    const notFound = loadError.status === 404;
    return (
      <div className="container page text-center">
        <h1 className="page-title">{notFound ? 'Không tìm thấy suất chiếu' : 'Không tải được sơ đồ ghế'}</h1>
        <p className="page-subtitle">{notFound ? 'Suất chiếu này không tồn tại hoặc đã bị xóa.' : loadError.message}</p>
        <Link to="/" className="btn btn-primary">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <Link to={`/movies/${showtime.movieId}`} className="btn btn-ghost btn-sm mb-2">
        ← Chọn suất chiếu khác
      </Link>
      <h1 className="page-title">Chọn ghế</h1>
      <p className="page-subtitle">
        {showtime.movieTitle} • {showtime.cinemaName} • {showtime.roomName} • {formatTime(showtime.startTime)},{' '}
        {formatDate(showtime.startTime)}
      </p>

      {started && <div className="alert alert-error">Suất chiếu này đã bắt đầu, không thể đặt vé.</div>}
      {notice && <div className="alert alert-warning">{notice}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}

      <div className="booking-layout">
        <div className="card">
          <div className="card-body">
            <SeatMap seats={seatMap.seats} selectedIds={selected} onToggle={handleToggle} />
          </div>
        </div>

        <aside className="card summary-card">
          <div className="card-body">
            {movie?.posterUrl && (
              <img
                className="movie-poster mb-2"
                style={{ maxWidth: 120, borderRadius: 8 }}
                src={movie.posterUrl}
                alt={movie.title}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <h3>{showtime.movieTitle}</h3>
            <p className="muted">
              {showtime.cinemaName}
              <br />
              {showtime.roomName} • {formatTime(showtime.startTime)}, {formatDate(showtime.startTime)}
            </p>

            <h4>Ghế đã chọn ({selectedSeats.length}/{MAX_SEATS})</h4>
            {selectedSeats.length === 0 ? (
              <p className="muted">Bấm vào ghế trống trên sơ đồ để chọn.</p>
            ) : (
              <div>
                {selectedSeats.map((seat) => (
                  <div key={seat.id} className="summary-line">
                    <span>
                      <strong>{seat.label}</strong> <span className="muted">{SEAT_TYPES[seat.type] ?? seat.type}</span>
                    </span>
                    <span className="price">{formatCurrency(seat.price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="summary-line summary-total">
              <span>Tổng tiền</span>
              <span className="price">{formatCurrency(total)}</span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block mt-2"
              disabled={selected.length === 0 || submitting || started}
              onClick={handleHold}
            >
              {submitting ? 'Đang giữ ghế...' : 'Giữ ghế và thanh toán'}
            </button>
            <p className="field-hint mt-1">Ghế được giữ trong 5 phút để bạn hoàn tất thanh toán.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}