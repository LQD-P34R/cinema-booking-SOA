import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import {
  MOVIE_STATUS,
  dateKeyOf,
  formatCurrency,
  formatDate,
  formatDayLabel,
  formatDuration,
  formatTime,
  statusInfo,
} from '../utils/format.js';

export default function MovieDetailPage() {
  const { id } = useParams();

  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, message }
  const [selectedDate, setSelectedDate] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Lấy thông tin phim và danh sách suất chiếu cùng lúc cho nhanh
    Promise.all([api.getMovie(id), api.getShowtimes({ movieId: id })])
      .then(([movieData, showtimeData]) => {
        if (cancelled) return;
        setMovie(movieData);
        setShowtimes(showtimeData);
      })
      .catch((err) => {
        if (!cancelled) setError({ status: err.status, message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  // Chỉ hiện suất chưa bắt đầu
  const upcoming = useMemo(() => {
    const now = new Date();
    return showtimes.filter((st) => new Date(st.startTime) > now);
  }, [showtimes]);

  const dates = useMemo(() => [...new Set(upcoming.map((st) => dateKeyOf(st.startTime)))].sort(), [upcoming]);

  // Ngày đang chọn không còn tồn tại (hoặc chưa chọn) thì lấy ngày đầu tiên
  const activeDate = dates.includes(selectedDate) ? selectedDate : dates[0];

  // Suất của ngày đang chọn, gom theo rạp
  const cinemaGroups = useMemo(() => {
    const groups = new Map();
    upcoming
      .filter((st) => dateKeyOf(st.startTime) === activeDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .forEach((st) => {
        if (!groups.has(st.cinemaId)) {
          groups.set(st.cinemaId, { cinemaId: st.cinemaId, cinemaName: st.cinemaName, items: [] });
        }
        groups.get(st.cinemaId).items.push(st);
      });
    return [...groups.values()];
  }, [upcoming, activeDate]);

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải thông tin phim...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const notFound = error.status === 404;
    return (
      <div className="container page text-center">
        <h1 className="page-title">{notFound ? 'Không tìm thấy phim' : 'Không tải được dữ liệu'}</h1>
        <p className="page-subtitle">{notFound ? 'Phim này không tồn tại hoặc đã bị xóa.' : error.message}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">
            Về danh sách phim
          </Link>
          {!notFound && (
            <button type="button" className="btn btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }

  const status = statusInfo(MOVIE_STATUS, movie.status);

  return (
    <div className="container page">
      <Link to="/" className="btn btn-ghost btn-sm mb-2">
        ← Danh sách phim
      </Link>

      <div className="movie-detail">
        <img
          className="movie-poster"
          src={movie.posterUrl || ''}
          alt={movie.title}
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />

        <div>
          <h1 className="page-title">{movie.title}</h1>
          <div className="row mb-2">
            <span className={`badge ${status.badge}`}>{status.label}</span>
            {movie.ageRating && <span className="badge badge-gold">{movie.ageRating}</span>}
          </div>

          <div className="stack mb-2">
            {movie.genre && (
              <div>
                <span className="muted">Thể loại: </span>
                {movie.genre}
              </div>
            )}
            <div>
              <span className="muted">Thời lượng: </span>
              {formatDuration(movie.durationMinutes)}
            </div>
            {movie.releaseDate && (
              <div>
                <span className="muted">Khởi chiếu: </span>
                {formatDate(movie.releaseDate)}
              </div>
            )}
          </div>

          {movie.description && <p>{movie.description}</p>}

          {movie.trailerUrl && (
            <a className="btn btn-secondary" href={movie.trailerUrl} target="_blank" rel="noreferrer">
              Xem trailer
            </a>
          )}
        </div>
      </div>

      <h2 className="section-title">Lịch chiếu</h2>

      {dates.length === 0 ? (
        <div className="empty">
          {movie.status === 'COMING_SOON'
            ? 'Phim sắp chiếu, hiện chưa mở bán vé.'
            : 'Hiện chưa có suất chiếu nào cho phim này.'}
        </div>
      ) : (
        <>
          <div className="chips mb-2">
            {dates.map((date) => (
              <button
                key={date}
                type="button"
                className={`chip${date === activeDate ? ' active' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                {formatDayLabel(date)}
              </button>
            ))}
          </div>

          {cinemaGroups.map((group) => (
            <div key={group.cinemaId} className="card showtime-group">
              <div className="card-body">
                <h3>{group.cinemaName}</h3>
                <div className="showtime-list">
                  {group.items.map((st) => (
                    <Link key={st.id} to={`/booking/${st.id}`} className="showtime-btn">
                      <strong>{formatTime(st.startTime)}</strong>
                      <small>
                        {st.roomName} • {formatCurrency(st.basePrice)}
                      </small>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <p className="muted">Giá hiển thị là giá ghế thường, ghế VIP và ghế đôi có giá cao hơn.</p>
        </>
      )}
    </div>
  );
}