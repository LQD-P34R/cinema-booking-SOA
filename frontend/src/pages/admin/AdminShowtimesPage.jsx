import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';
import { formatCurrency, formatDate, formatTime } from '../../utils/format.js';

// Thời gian dọn phòng cộng thêm vào giờ kết thúc, phải khớp cinema.showtime.cleaning-minutes của Movie Service
const CLEANING_MINUTES = 15;

const pad = (n) => String(n).padStart(2, '0');

// Giá trị cho <input type="datetime-local">: "2026-11-20T19:30"
const toInputValue = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const tomorrowAtTen = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toInputValue(d);
};

// Giờ kết thúc dự kiến, hiển thị dạng "21:56, 20/11/2026"
function previewEnd(startValue, durationMinutes) {
  const d = new Date(startValue);
  if (Number.isNaN(d.getTime())) return '';
  d.setMinutes(d.getMinutes() + durationMinutes + CLEANING_MINUTES);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ---------- Hộp thoại thêm / sửa suất chiếu ----------

function ShowtimeFormModal({ showtime, movies, cinemas, onClose, onSaved }) {
  const [form, setForm] = useState({
    movieId: showtime ? String(showtime.movieId) : '',
    roomId: showtime ? String(showtime.roomId) : '',
    startTime: showtime ? showtime.startTime.slice(0, 16) : tomorrowAtTen(),
    basePrice: showtime ? String(showtime.basePrice) : '80000',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  const roomGroups = cinemas.filter((cinema) => cinema.rooms.length > 0);
  const selectedMovie = movies.find((m) => String(m.id) === form.movieId);
  const endText = selectedMovie && form.startTime ? previewEnd(form.startTime, selectedMovie.durationMinutes) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();

    const price = Number(form.basePrice);
    if (!form.movieId) return setError('Vui lòng chọn phim');
    if (!form.roomId) return setError('Vui lòng chọn phòng chiếu');
    if (!form.startTime) return setError('Vui lòng chọn giờ bắt đầu');
    if (new Date(form.startTime) <= new Date()) return setError('Giờ bắt đầu phải ở trong tương lai');
    if (!Number.isInteger(price) || price < 1000) return setError('Giá vé tối thiểu 1.000 VND');

    const payload = {
      movieId: Number(form.movieId),
      roomId: Number(form.roomId),
      startTime: form.startTime.length === 16 ? `${form.startTime}:00` : form.startTime,
      basePrice: price,
    };

    setError('');
    setSaving(true);
    try {
      if (showtime) {
        await api.updateShowtime(showtime.id, payload);
      } else {
        await api.createShowtime(payload);
      }
      onSaved(showtime ? 'Đã cập nhật suất chiếu.' : 'Đã thêm suất chiếu mới.');
    } catch (err) {
      setError(err.message); // ví dụ lỗi 409 khi trùng giờ với suất khác trong cùng phòng
      setSaving(false);
    }
  };

  return (
    <Modal title={showtime ? 'Sửa suất chiếu' : 'Thêm suất chiếu'} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      {roomGroups.length === 0 && (
        <div className="alert alert-warning">Chưa có phòng chiếu nào. Hãy tạo phòng ở tab "Rạp & phòng" trước.</div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="st-movie">Phim *</label>
          <select id="st-movie" value={form.movieId} onChange={update('movieId')} required>
            <option value="">-- Chọn phim --</option>
            {movies
              .filter((m) => m.status !== 'ENDED' || String(m.id) === form.movieId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.durationMinutes} phút)
                </option>
              ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="st-room">Phòng chiếu *</label>
          <select id="st-room" value={form.roomId} onChange={update('roomId')} required>
            <option value="">-- Chọn phòng --</option>
            {roomGroups.map((cinema) => (
              <optgroup key={cinema.id} label={cinema.name}>
                {cinema.rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.totalRows * room.seatsPerRow} ghế)
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="st-start">Giờ bắt đầu *</label>
            <input id="st-start" type="datetime-local" value={form.startTime} onChange={update('startTime')} required />
          </div>
          <div className="field">
            <label htmlFor="st-price">Giá ghế thường (VND) *</label>
            <input
              id="st-price"
              type="number"
              min="1000"
              step="1000"
              value={form.basePrice}
              onChange={update('basePrice')}
              required
            />
          </div>
        </div>

        <div className="alert alert-info">
          {endText ? (
            <>
              Giờ kết thúc dự kiến: <strong>{endText}</strong> (đã gồm {CLEANING_MINUTES} phút dọn phòng). Ghế VIP giá gấp 1,3
              lần, ghế đôi gấp 2 lần.
            </>
          ) : (
            'Chọn phim và giờ bắt đầu để xem giờ kết thúc dự kiến.'
          )}
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

// ---------- Trang chính ----------

export default function AdminShowtimesPage() {
  // Dữ liệu tham chiếu cho bộ lọc và form
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]); // mỗi rạp kèm danh sách phòng

  const [showtimes, setShowtimes] = useState([]);
  const [filters, setFilters] = useState({ movieId: '', cinemaId: '', date: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // null: đóng, 'new': thêm mới, hoặc đối tượng suất chiếu để sửa
  const [busyId, setBusyId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Phim và rạp chỉ cần tải một lần
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getMovies(),
      api.getCinemas().then((list) => Promise.all(list.map((cinema) => api.getCinema(cinema.id)))),
    ])
      .then(([movieList, cinemaList]) => {
        if (cancelled) return;
        setMovies(movieList);
        setCinemas(cinemaList);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Suất chiếu tải lại mỗi khi đổi bộ lọc hoặc sau khi thêm, sửa, xóa
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .getShowtimes(filters)
      .then((data) => {
        if (!cancelled) setShowtimes(data);
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
  }, [filters, reloadKey]);

  const setFilter = (field) => (e) => setFilters((current) => ({ ...current, [field]: e.target.value }));
  const hasFilter = Boolean(filters.movieId || filters.cinemaId || filters.date);

  const now = new Date();
  const upcomingCount = useMemo(() => showtimes.filter((s) => new Date(s.startTime) > new Date()).length, [showtimes]);

  const handleSaved = (message) => {
    setEditing(null);
    setActionError('');
    setNotice(message);
    setReloadKey((k) => k + 1);
  };

  const handleDelete = async (showtime) => {
    const label = `${showtime.movieTitle} (${formatTime(showtime.startTime)}, ${formatDate(showtime.startTime)})`;
    if (!window.confirm(`Xóa suất chiếu ${label}?\nLưu ý: nếu đã có người đặt vé cho suất này, các vé đó sẽ không còn suất chiếu tương ứng.`)) return;
    setNotice('');
    setActionError('');
    setBusyId(showtime.id);
    try {
      await api.deleteShowtime(showtime.id);
      setNotice('Đã xóa suất chiếu.');
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="toolbar">
        <select style={{ maxWidth: 220 }} value={filters.movieId} onChange={setFilter('movieId')} aria-label="Lọc theo phim">
          <option value="">Tất cả phim</option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <select style={{ maxWidth: 220 }} value={filters.cinemaId} onChange={setFilter('cinemaId')} aria-label="Lọc theo rạp">
          <option value="">Tất cả rạp</option>
          {cinemas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input style={{ maxWidth: 170 }} type="date" value={filters.date} onChange={setFilter('date')} aria-label="Lọc theo ngày" />
        {hasFilter && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilters({ movieId: '', cinemaId: '', date: '' })}>
            Xóa bộ lọc
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + Thêm suất chiếu
        </button>
      </div>

      {!loading && !error && (
        <p className="muted">
          {showtimes.length} suất chiếu, trong đó {upcomingCount} suất sắp tới.
        </p>
      )}

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
          <span>Đang tải danh sách suất chiếu...</span>
        </div>
      ) : (
        !error &&
        (showtimes.length === 0 ? (
          <div className="empty">Không có suất chiếu nào phù hợp.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Phim</th>
                  <th>Rạp / Phòng</th>
                  <th>Ngày</th>
                  <th>Giờ chiếu</th>
                  <th>Giá gốc</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {showtimes.map((st) => {
                  const past = new Date(st.startTime) <= now;
                  return (
                    <tr key={st.id} style={past ? { opacity: 0.55 } : undefined}>
                      <td>{st.id}</td>
                      <td>
                        <strong>{st.movieTitle}</strong>
                        {past && (
                          <span className="badge badge-gray" style={{ marginLeft: 8 }}>
                            Đã chiếu
                          </span>
                        )}
                      </td>
                      <td>
                        {st.cinemaName}
                        <div className="muted">{st.roomName}</div>
                      </td>
                      <td>{formatDate(st.startTime)}</td>
                      <td>
                        {formatTime(st.startTime)} - {formatTime(st.endTime)}
                      </td>
                      <td className="price">{formatCurrency(st.basePrice)}</td>
                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={past}
                            title={past ? 'Suất đã chiếu, không thể sửa' : undefined}
                            onClick={() => setEditing(st)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busyId === st.id}
                            onClick={() => handleDelete(st)}
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
        <ShowtimeFormModal
          showtime={editing === 'new' ? null : editing}
          movies={movies}
          cinemas={cinemas}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}