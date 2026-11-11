import { useMemo } from 'react';
import { SEAT_TYPES, formatCurrency } from '../utils/format.js';

/**
 * Sơ đồ ghế của một suất chiếu.
 * Props:
 *  - seats: danh sách ghế từ api.getSeatMap(), mỗi ghế có { id, row, number, label, type, price, status }
 *    status là AVAILABLE (trống), HELD (đang có người giữ) hoặc SOLD (đã bán)
 *  - selectedIds: mảng id các ghế đang được chọn
 *  - onToggle(seat): được gọi khi bấm vào một ghế còn trống
 */
export default function SeatMap({ seats, selectedIds, onToggle }) {
  // Gom ghế theo hàng (A, B, C...), trong mỗi hàng xếp theo số ghế
  const rows = useMemo(() => {
    const byRow = new Map();
    seats.forEach((seat) => {
      if (!byRow.has(seat.row)) byRow.set(seat.row, []);
      byRow.get(seat.row).push(seat);
    });
    return [...byRow.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([row, items]) => [row, [...items].sort((a, b) => a.number - b.number)]);
  }, [seats]);

  const selected = new Set(selectedIds);

  const seatClass = (seat) => {
    const classes = ['seat'];
    if (seat.type === 'VIP') classes.push('vip');
    if (seat.type === 'COUPLE') classes.push('couple');
    if (selected.has(seat.id)) classes.push('selected');
    if (seat.status === 'HELD') classes.push('held');
    if (seat.status === 'SOLD') classes.push('sold');
    return classes.join(' ');
  };

  const seatTitle = (seat) => {
    const state = { HELD: 'đang có người giữ', SOLD: 'đã bán' }[seat.status];
    return `${seat.label} - ${SEAT_TYPES[seat.type] ?? seat.type} - ${formatCurrency(seat.price)}${state ? ` (${state})` : ''}`;
  };

  return (
    <div>
      <div className="seat-scroll">
        <div className="seat-screen">MÀN HÌNH</div>

        <div className="seat-map">
          {rows.map(([row, items]) => (
            <div key={row} className="seat-row">
              <span className="seat-row-label">{row}</span>
              {items.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  className={seatClass(seat)}
                  title={seatTitle(seat)}
                  aria-label={seatTitle(seat)}
                  aria-pressed={selected.has(seat.id)}
                  disabled={seat.status !== 'AVAILABLE'}
                  onClick={() => onToggle(seat)}
                >
                  {seat.number}
                </button>
              ))}
              <span className="seat-row-label">{row}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="seat" /> Ghế thường
        </span>
        <span className="legend-item">
          <span className="seat vip" /> Ghế VIP
        </span>
        <span className="legend-item">
          <span className="seat couple" /> Ghế đôi
        </span>
        <span className="legend-item">
          <span className="seat selected" /> Đang chọn
        </span>
        <span className="legend-item">
          <span className="seat held" /> Đang được giữ
        </span>
        <span className="legend-item">
          <span className="seat sold" /> Đã bán
        </span>
      </div>
    </div>
  );
}