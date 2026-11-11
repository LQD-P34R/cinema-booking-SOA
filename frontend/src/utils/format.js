// Hàm định dạng và nhãn tiếng Việt dùng chung cho mọi trang.
//
// Thời gian từ API có dạng "2026-11-20T19:30:00" (giờ địa phương, không kèm múi giờ).
// Các hàm bên dưới cắt chuỗi thay vì đổi qua Date, nhờ vậy giờ hiển thị luôn đúng
// như dữ liệu, không bị lệch múi giờ của trình duyệt.

const pad = (n) => String(n).padStart(2, '0');

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

/** 90000 -> "90.000 đ" */
export const formatCurrency = (amount) => `${Number(amount ?? 0).toLocaleString('vi-VN')} đ`;

/** 131 -> "131 phút" */
export const formatDuration = (minutes) => `${minutes} phút`;

/** "2026-11-20T19:30:00" -> "2026-11-20" */
export const dateKeyOf = (iso) => iso.slice(0, 10);

/** "2026-11-20T19:30:00" -> "19:30" */
export const formatTime = (iso) => iso.slice(11, 16);

/** "2026-11-20T19:30:00" hoặc "2026-11-20" -> "20/11/2026" */
export const formatDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

/** "2026-11-20T19:30:00" -> "19:30, 20/11/2026" */
export const formatDateTime = (iso) => (iso ? `${formatTime(iso)}, ${formatDate(iso)}` : '');

/** Ngày hôm nay dạng "2026-11-20" theo giờ địa phương */
export const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** "2026-11-20" -> "Thứ 6, 20/11" (hoặc "Hôm nay, 20/11") */
export function formatDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay();
  const prefix = key === todayKey() ? 'Hôm nay' : WEEKDAYS[weekday];
  return `${prefix}, ${pad(d)}/${pad(m)}`;
}

// ---------- Nhãn trạng thái (badge là tên class trong styles.css) ----------

export const MOVIE_STATUS = {
  NOW_SHOWING: { label: 'Đang chiếu', badge: 'badge-green' },
  COMING_SOON: { label: 'Sắp chiếu', badge: 'badge-blue' },
  ENDED: { label: 'Ngừng chiếu', badge: 'badge-gray' },
};

export const BOOKING_STATUS = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', badge: 'badge-gold' },
  CONFIRMED: { label: 'Đã xác nhận', badge: 'badge-green' },
  CANCELLED: { label: 'Đã hủy', badge: 'badge-red' },
  EXPIRED: { label: 'Hết hạn giữ ghế', badge: 'badge-gray' },
};

export const PAYMENT_STATUS = {
  SUCCESS: { label: 'Thành công', badge: 'badge-green' },
  FAILED: { label: 'Thất bại', badge: 'badge-red' },
};

export const PAYMENT_METHODS = {
  CARD: 'Thẻ ngân hàng',
  E_WALLET: 'Ví điện tử',
  BANK_TRANSFER: 'Chuyển khoản',
};

export const SEAT_TYPES = {
  STANDARD: 'Ghế thường',
  VIP: 'Ghế VIP',
  COUPLE: 'Ghế đôi',
};

/** Tra nhãn an toàn: giá trị lạ thì hiện nguyên mã thay vì lỗi */
export const statusInfo = (map, key) => map[key] ?? { label: key, badge: 'badge-gray' };