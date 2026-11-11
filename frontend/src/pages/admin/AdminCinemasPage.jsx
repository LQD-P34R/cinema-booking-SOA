import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import Modal from '../../components/Modal.jsx';

// ---------- Hộp thoại thêm / sửa rạp ----------

function CinemaFormModal({ cinema, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: cinema?.name ?? '',
    address: cinema?.address ?? '',
    city: cinema?.city ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name.trim(), address: form.address.trim(), city: form.city.trim() };
    if (!payload.name || !payload.address || !payload.city) {
      setError('Vui lòng nhập đầy đủ tên rạp, địa chỉ và thành phố');
      return;
    }

    setError('');
    setSaving(true);
    try {
      if (cinema) {
        await api.updateCinema(cinema.id, payload);
      } else {
        await api.createCinema(payload);
      }
      onSaved(cinema ? 'Đã cập nhật rạp.' : 'Đã thêm rạp mới.');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={cinema ? 'Sửa rạp' : 'Thêm rạp'} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cinema-name">Tên rạp *</label>
          <input id="cinema-name" value={form.name} onChange={update('name')} required />
        </div>
        <div className="field">
          <label htmlFor="cinema-address">Địa chỉ *</label>
          <input id="cinema-address" value={form.address} onChange={update('address')} required />
        </div>
        <div className="field">
          <label htmlFor="cinema-city">Thành phố *</label>
          <input id="cinema-city" value={form.city} onChange={update('city')} required />
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

// ---------- Hộp thoại thêm phòng / đổi tên phòng ----------
// Thêm phòng: nhập số hàng và số ghế mỗi hàng, hệ thống tự sinh ghế.
// Sửa phòng: chỉ đổi được tên, vì ghế đã sinh ra và có thể đã gắn với suất chiếu.

function RoomFormModal({ cinemaId, room, onClose, onSaved }) {
  const [name, setName] = useState(room?.name ?? '');
  const [rows, setRows] = useState('8');
  const [perRow, setPerRow] = useState('10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rowsNumber = Number(rows);
  const perRowNumber = Number(perRow);
  const validSize =
    Number.isInteger(rowsNumber) && rowsNumber >= 1 && rowsNumber <= 26 && Number.isInteger(perRowNumber) && perRowNumber >= 1 && perRowNumber <= 30;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Tên phòng không được để trống');
    if (!room && !validSize) return setError('Số hàng ghế phải từ 1 đến 26 và số ghế mỗi hàng phải từ 1 đến 30');

    setError('');
    setSaving(true);
    try {
      if (room) {
        await api.updateRoom(room.id, { name: name.trim() });
      } else {
        await api.createRoom(cinemaId, { name: name.trim(), totalRows: rowsNumber, seatsPerRow: perRowNumber });
      }
      onSaved(room ? 'Đã đổi tên phòng.' : 'Đã thêm phòng và tự sinh ghế.');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={room ? 'Đổi tên phòng' : 'Thêm phòng chiếu'} onClose={onClose}>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="room-name">Tên phòng *</label>
          <input id="room-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Phòng 1" required />
        </div>

        {!room && (
          <>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="room-rows">Số hàng ghế (1-26) *</label>
                <input id="room-rows" type="number" min="1" max="26" value={rows} onChange={(e) => setRows(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="room-perrow">Số ghế mỗi hàng (1-30) *</label>
                <input id="room-perrow" type="number" min="1" max="30" value={perRow} onChange={(e) => setPerRow(e.target.value)} required />
              </div>
            </div>
            <div className="alert alert-info">
              {validSize ? (
                <>
                  Hệ thống sẽ tạo <strong>{rowsNumber * perRowNumber} ghế</strong> (hàng A đến {String.fromCharCode(64 + rowsNumber)}).
                  {rowsNumber >= 4 ? ' Hai hàng cuối là ghế VIP.' : ' Phòng dưới 4 hàng chỉ có ghế thường.'}
                </>
              ) : (
                'Nhập số hàng và số ghế hợp lệ để xem tổng số ghế.'
              )}
            </div>
          </>
        )}

        {room && <p className="field-hint">Không đổi được kích thước phòng sau khi đã tạo.</p>}

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

export default function AdminCinemasPage() {
  const [cinemas, setCinemas] = useState([]); // mỗi rạp kèm danh sách phòng
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null); // { type: 'cinema', cinema? } hoặc { type: 'room', cinemaId, room? }
  const [busyKey, setBusyKey] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    // Danh sách rạp không kèm phòng, nên lấy thêm chi tiết từng rạp
    api
      .getCinemas()
      .then((list) => Promise.all(list.map((cinema) => api.getCinema(cinema.id))))
      .then((details) => {
        if (!cancelled) setCinemas(details);
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

  const handleSaved = (message) => {
    setModal(null);
    setActionError('');
    setNotice(message);
    setReloadKey((k) => k + 1);
  };

  const runDelete = async (key, confirmText, action, successText) => {
    if (!window.confirm(confirmText)) return;
    setNotice('');
    setActionError('');
    setBusyKey(key);
    try {
      await action();
      setNotice(successText);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyKey(null);
    }
  };

  const deleteCinema = (cinema) =>
    runDelete(
      `cinema-${cinema.id}`,
      `Xóa rạp "${cinema.name}"? Tất cả phòng và ghế của rạp này cũng sẽ bị xóa.`,
      () => api.deleteCinema(cinema.id),
      `Đã xóa rạp "${cinema.name}".`,
    );

  const deleteRoom = (room) =>
    runDelete(
      `room-${room.id}`,
      `Xóa phòng "${room.name}"? Toàn bộ ghế của phòng cũng sẽ bị xóa.`,
      () => api.deleteRoom(room.id),
      `Đã xóa phòng "${room.name}".`,
    );

  return (
    <div>
      <div className="toolbar">
        <span className="muted">Tổng cộng {cinemas.length} rạp</span>
        <span className="spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setModal({ type: 'cinema' })}>
          + Thêm rạp
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
          <span>Đang tải danh sách rạp...</span>
        </div>
      ) : (
        !error &&
        (cinemas.length === 0 ? (
          <div className="empty">Chưa có rạp nào. Bấm "Thêm rạp" để bắt đầu.</div>
        ) : (
          <div className="stack">
            {cinemas.map((cinema) => (
              <div key={cinema.id} className="card">
                <div className="card-body">
                  <div className="row row-between">
                    <div>
                      <h3 style={{ margin: 0 }}>{cinema.name}</h3>
                      <div className="muted">
                        {cinema.address}, {cinema.city}
                      </div>
                    </div>
                    <div className="row">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModal({ type: 'cinema', cinema })}>
                        Sửa rạp
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyKey === `cinema-${cinema.id}`}
                        onClick={() => deleteCinema(cinema)}
                      >
                        Xóa rạp
                      </button>
                    </div>
                  </div>

                  <div className="row row-between mt-2 mb-2">
                    <strong>Phòng chiếu ({cinema.rooms.length})</strong>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setModal({ type: 'room', cinemaId: cinema.id })}
                    >
                      + Thêm phòng
                    </button>
                  </div>

                  {cinema.rooms.length === 0 ? (
                    <div className="muted">Rạp này chưa có phòng chiếu.</div>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Tên phòng</th>
                            <th>Sơ đồ ghế</th>
                            <th>Tổng số ghế</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {cinema.rooms.map((room) => (
                            <tr key={room.id}>
                              <td>{room.id}</td>
                              <td>
                                <strong>{room.name}</strong>
                              </td>
                              <td>
                                {room.totalRows} hàng × {room.seatsPerRow} ghế
                              </td>
                              <td>{room.totalRows * room.seatsPerRow}</td>
                              <td>
                                <div className="actions">
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setModal({ type: 'room', cinemaId: cinema.id, room })}
                                  >
                                    Đổi tên
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    disabled={busyKey === `room-${room.id}`}
                                    onClick={() => deleteRoom(room)}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {modal?.type === 'cinema' && (
        <CinemaFormModal cinema={modal.cinema} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal?.type === 'room' && (
        <RoomFormModal cinemaId={modal.cinemaId} room={modal.room} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}