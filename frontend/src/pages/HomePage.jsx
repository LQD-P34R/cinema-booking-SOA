import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

const TABS = [
  { status: 'NOW_SHOWING', label: 'Đang chiếu' },
  { status: 'COMING_SOON', label: 'Sắp chiếu' },
];

function MovieCard({ movie }) {
  return (
    <Link to={`/movies/${movie.id}`} className="movie-card">
      <img
        className="movie-poster"
        src={movie.posterUrl || ''}
        alt={movie.title}
        loading="lazy"
        // Ảnh lỗi thì ẩn đi, nền xám của khung poster vẫn còn nên bố cục không bị vỡ
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />
      <div className="movie-info">
        <div className="movie-title">{movie.title}</div>
        <div className="movie-meta">
          {[movie.genre, `${movie.durationMinutes} phút`].filter(Boolean).join(' • ')}
        </div>
        {movie.ageRating && (
          <div className="mt-1">
            <span className="badge badge-gold">{movie.ageRating}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [status, setStatus] = useState('NOW_SHOWING');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Đợi người dùng ngừng gõ 300ms rồi mới tìm, tránh gọi API sau mỗi phím
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    let cancelled = false; // bỏ qua kết quả của lần gọi cũ nếu người dùng đã đổi tab hoặc từ khóa
    setLoading(true);
    setError('');

    api
      .getMovies({ status, keyword })
      .then((data) => {
        if (!cancelled) setMovies(data);
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
  }, [status, keyword, reloadKey]);

  return (
    <div className="container page">
      <section className="hero">
        <h1>Đặt vé xem phim trực tuyến</h1>
        <p className="page-subtitle">Chọn phim, chọn suất chiếu, chọn ghế và nhận vé điện tử ngay.</p>
      </section>

      <div className="toolbar">
        <div className="chips">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              type="button"
              className={`chip${status === tab.status ? ' active' : ''}`}
              onClick={() => setStatus(tab.status)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Tìm phim theo tên..."
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
        />
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
          <span>Đang tải danh sách phim...</span>
        </div>
      ) : (
        !error &&
        (movies.length === 0 ? (
          <div className="empty">
            {keyword ? `Không tìm thấy phim nào khớp với "${keyword}".` : 'Hiện chưa có phim nào trong mục này.'}
          </div>
        ) : (
          <div className="movie-grid">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}