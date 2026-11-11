import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import { MOVIE_STATUS, formatDate, formatDuration, statusInfo } from '../../utils/format.js';

const AGE_RATINGS = ['P', 'K', 'T13', 'T16', 'T18'];

const EMPTY_FORM = {
  title: '',
  genre: '',
  durationMinutes: '',
  releaseDate: '',
  ageRating: '',
  status: 'COMING_SOON',
  posterUrl: '',
  trailerUrl: '',
  description: '',
};

const toForm = (movie) => ({
  title: movie.title ?? '',
  genre: movie.genre ?? '',
  durationMinutes: String(movie.durationMinutes ?? ''),
  releaseDate: movie.releaseDate ?? '',
  ageRating: movie.ageRating ?? '',
  status: movie.status ?? 'COMING_SOON',
  posterUrl: movie.posterUrl ?? '',
  trailerUrl: movie.trailerUrl ?? '',
  description: movie.description ?? '',
});

// Chuỗi trống gửi lên là null để máy chủ coi như "không có"
const orNull = (value) => (value.trim() ? value.trim() : null);

function MovieFormModal({ movie, onClose, onSaved }) {
  const [form, setForm] = useState(movie ? toForm(movie) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const duration = Number(form.durationMinutes);
    if (!form.title.trim()) return setError('Tên phim không được để trống');
    if (!Number.isInteger(duration) || duration < 1) return setError('Thời lượng phải là số phút lớn hơn 0');

    const payload = {
      title: form.title.trim(),
      genre: orNull(form.genre),
      durationMinutes: duration,
      releaseDate: form.releaseDate || null,
      ageRating: orNull(form.ageRating),
      status: form.status,
      posterUrl: orNull(form.posterUrl),
      trailerUrl: orNull(form.trailerUrl),
      description: orNull(form.description),
    };

    setError('');
    setSaving(true);
    try {
      if (movie) {
        await api.updateMovie(movie.id, payload);
      } else {
        await api.createMovie(payload);
      }
      onSaved(movie ? 'Đã cập nhật phim.' : 'Đã thêm phim mới.');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={movie ? 'Sửa phim' : 'Thêm phim'} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">Tên phim *</label>
          <input id="title" value={form.title} onChange={update('title')} required />
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="genre">Thể loại</label>
            <input id="genre" value={form.genre} onChange={update('genre')} placeholder="Hành động, Tâm lý..." />
          </div>
          <div className="field">
            <label htmlFor="durationMinutes">Thời lượng (phút) *</label>
            <input
              id="durationMinutes"
              type="number"
              min="1"
              value={form.durationMinutes}
              onChange={update('durationMinutes')}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="releaseDate">Ngày khởi chiếu</label>
            <input id="releaseDate" type="date" value={form.releaseDate} onChange={update('releaseDate')} />
          </div>
          <div className="field">
            <label htmlFor="ageRating">Độ tuổi</label>
            <select id="ageRating" value={form.ageRating} onChange={update('ageRating')}>
              <option value="">Chưa phân loại</option>
              {AGE_RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="status">Trạng thái</label>
          <select id="status" value={form.status} onChange={update('status')}>
            {Object.entries(MOVIE_STATUS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="posterUrl">Link poster</label>
          <input id="posterUrl" value={form.posterUrl} onChange={update('posterUrl')} placeholder="https://..." />
        </div>
        <div className="field">
          <label htmlFor="trailerUrl">Link trailer</label>
          <input id="trailerUrl" value={form.trailerUrl} onChange={update('trailerUrl')} placeholder="https://..." />
        </div>
        <div className="field">
          <label htmlFor="description">Mô tả</label>
          <textarea id="description" value={form.description} onChange={update('description')} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState(null); // null: đóng, 'new': thêm mới, hoặc đối tượng phim để sửa
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .getMovies()
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
  }, [reloadKey]);

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return movies
      .filter((m) => statusFilter === 'ALL' || m.status === statusFilter)
      .filter((m) => !keyword || m.title.toLowerCase().includes(keyword));
  }, [movies, search, statusFilter]);

  const handleSaved = (message) => {
    setEditing(null);
    setActionError('');
    setNotice(message);
    setReloadKey((k) => k + 1);
  };

  const handleDelete = async (movie) => {
    if (!window.confirm(`Xóa phim "${movie.title}"?`)) return;
    setNotice('');
    setActionError('');
    setBusyId(movie.id);
    try {
      await api.deleteMovie(movie.id);
      setNotice(`Đã xóa phim "${movie.title}".`);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(
        err.status === 409
          ? `${err.message}. Nếu phim đã có suất chiếu, hãy đổi trạng thái sang "Ngừng chiếu" thay vì xóa.`
          : err.message,
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <div className="chips">
          <button
            type="button"
            className={`chip${statusFilter === 'ALL' ? ' active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả
          </button>
          {Object.entries(MOVIE_STATUS).map(([value, info]) => (
            <button
              key={value}
              type="button"
              className={`chip${statusFilter === value ? ' active' : ''}`}
              onClick={() => setStatusFilter(value)}
            >
              {info.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Tìm theo tên phim..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + Thêm phim
        </button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {actionError && <div className="alert alert-error">{actionError}</div>}
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
        (visible.length === 0 ? (
          <div className="empty">Không có phim nào phù hợp.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên phim</th>
                  <th>Thể loại</th>
                  <th>Thời lượng</th>
                  <th>Khởi chiếu</th>
                  <th>Độ tuổi</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((movie) => {
                  const status = statusInfo(MOVIE_STATUS, movie.status);
                  return (
                    <tr key={movie.id}>
                      <td>{movie.id}</td>
                      <td>
                        <strong>{movie.title}</strong>
                      </td>
                      <td>{movie.genre || '—'}</td>
                      <td>{formatDuration(movie.durationMinutes)}</td>
                      <td>{movie.releaseDate ? formatDate(movie.releaseDate) : '—'}</td>
                      <td>{movie.ageRating || '—'}</td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td>
                        <div className="actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(movie)}>
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busyId === movie.id}
                            onClick={() => handleDelete(movie)}
                          >
                            Xóa
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

      {editing && (
        <MovieFormModal
          movie={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}