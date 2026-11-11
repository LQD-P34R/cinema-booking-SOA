// Lớp gọi API duy nhất của Frontend. Mọi request đều đi qua Gateway (api-contract.md).
//
// Hai chế độ:
//  - Thật (mặc định): gọi Gateway ở VITE_API_URL (mặc định http://localhost:8080)
//  - Dữ liệu giả: đặt VITE_USE_MOCK=true trong file frontend/.env.local, mọi hàm bên dưới
//    vẫn chạy như cũ nhưng dữ liệu lấy từ mockData.js. Dùng khi các service khác chưa xong.

import { mockRequest } from './mockData.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const TOKEN_KEY = 'cinema_token';
const USER_KEY = 'cinema_user';

// ---------- Phiên đăng nhập (lưu trong localStorage) ----------

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function loadSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua, người dùng sẽ phải đăng nhập lại khi tải lại trang */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* bỏ qua */
  }
}

// ---------- Lỗi chuẩn hóa ----------

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // 0 nghĩa là không kết nối được máy chủ
  }
}

function defaultMessage(status) {
  switch (status) {
    case 400: return 'Dữ liệu gửi lên không hợp lệ';
    case 401: return 'Bạn cần đăng nhập để thực hiện thao tác này';
    case 403: return 'Bạn không có quyền thực hiện thao tác này';
    case 404: return 'Không tìm thấy dữ liệu';
    case 409: return 'Thao tác bị xung đột với dữ liệu hiện có';
    case 503: return 'Dịch vụ đang tạm thời không khả dụng, vui lòng thử lại sau';
    case 504: return 'Dịch vụ phản hồi quá chậm, vui lòng thử lại sau';
    default: return 'Đã có lỗi xảy ra, vui lòng thử lại';
  }
}

// ---------- Hàm gọi API ----------

function buildQuery(query) {
  if (!query) return {};
  const clean = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') clean[key] = value;
  }
  return clean;
}

async function realRequest(method, path, { body, query, token }) {
  const qs = new URLSearchParams(query).toString();
  const url = `${API_URL}${path}${qs ? `?${qs}` : ''}`;

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ. Vui lòng kiểm tra lại kết nối và thử lại.');
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    /* phản hồi không phải JSON: giữ data = null */
  }

  if (!res.ok) {
    throw new ApiError(res.status, data?.message || defaultMessage(res.status));
  }
  return data;
}

async function request(method, path, { body, query } = {}) {
  const token = getToken();
  const cleanQuery = buildQuery(query);

  try {
    if (USE_MOCK) {
      return await mockRequest(method, path, { body, query: cleanQuery, token });
    }
    return await realRequest(method, path, { body, query: cleanQuery, token });
  } catch (err) {
    // Lỗi từ mock có dạng {status, message}, đổi sang ApiError cho đồng nhất
    const error = err instanceof ApiError ? err : new ApiError(err.status ?? 500, err.message);

    // Token hết hạn hoặc bị từ chối: xóa phiên và báo cho AuthContext đăng xuất
    if (error.status === 401 && token && !path.startsWith('/api/auth/')) {
      clearSession();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw error;
  }
}

const get = (path, query) => request('GET', path, { query });
const post = (path, body) => request('POST', path, { body });
const put = (path, body) => request('PUT', path, { body });
const del = (path) => request('DELETE', path);

// ---------- Các endpoint theo api-contract.md ----------

export const api = {
  // User Service
  register: (data) => post('/api/auth/register', data),
  login: (data) => post('/api/auth/login', data),
  getMe: () => get('/api/users/me'),
  updateMe: (data) => put('/api/users/me', data),

  // Movie Service: phim
  getMovies: (params) => get('/api/movies', params), // keyword, genre, status
  getMovie: (id) => get(`/api/movies/${id}`),
  createMovie: (data) => post('/api/movies', data),
  updateMovie: (id, data) => put(`/api/movies/${id}`, data),
  deleteMovie: (id) => del(`/api/movies/${id}`),

  // Movie Service: rạp, phòng, ghế
  getCinemas: () => get('/api/cinemas'),
  getCinema: (id) => get(`/api/cinemas/${id}`),
  createCinema: (data) => post('/api/cinemas', data),
  updateCinema: (id, data) => put(`/api/cinemas/${id}`, data),
  deleteCinema: (id) => del(`/api/cinemas/${id}`),
  createRoom: (cinemaId, data) => post(`/api/cinemas/${cinemaId}/rooms`, data),
  updateRoom: (id, data) => put(`/api/rooms/${id}`, data),
  deleteRoom: (id) => del(`/api/rooms/${id}`),
  changeSeatType: (roomId, seatId, type) => put(`/api/rooms/${roomId}/seats/${seatId}`, { type }),

  // Movie Service: suất chiếu
  getShowtimes: (params) => get('/api/showtimes', params), // movieId, cinemaId, date
  getShowtime: (id) => get(`/api/showtimes/${id}`),
  getShowtimeSeats: (id) => get(`/api/showtimes/${id}/seats`), // cấu trúc ghế + giá (Movie Service)
  createShowtime: (data) => post('/api/showtimes', data),
  updateShowtime: (id, data) => put(`/api/showtimes/${id}`, data),
  deleteShowtime: (id) => del(`/api/showtimes/${id}`),

  // Booking Service
  getSeatStatus: (showtimeId) => get(`/api/showtimes/${showtimeId}/seat-status`), // trạng thái ghế (Booking Service)
  createBooking: (showtimeId, seatIds) => post('/api/bookings', { showtimeId, seatIds }),
  getMyBookings: () => get('/api/bookings/my'),
  getBooking: (id) => get(`/api/bookings/${id}`),
  payBooking: (id, data) => post(`/api/bookings/${id}/pay`, data), // { method, simulateResult? }
  cancelBooking: (id) => post(`/api/bookings/${id}/cancel`),
  getAllBookings: (params) => get('/api/bookings', params), // ADMIN: status, showtimeId

  // Payment Service
  getPayments: (params) => get('/api/payments', params), // ADMIN: status
  getPaymentByBooking: (bookingId) => get(`/api/payments/booking/${bookingId}`),

  /**
   * Sơ đồ ghế đầy đủ của một suất chiếu. Theo contract, Frontend phải tự ghép:
   *  - cấu trúc ghế + giá từ Movie Service (/seats)
   *  - trạng thái từ Booking Service (/seat-status), ghế không có trong danh sách là AVAILABLE
   * Trả về cùng dạng /seats nhưng mỗi ghế có thêm trường status.
   */
  async getSeatMap(showtimeId) {
    const [layout, statusInfo] = await Promise.all([
      api.getShowtimeSeats(showtimeId),
      api.getSeatStatus(showtimeId),
    ]);
    const statusBySeat = new Map((statusInfo?.seats ?? []).map((s) => [s.seatId, s.status]));
    return {
      ...layout,
      seats: layout.seats.map((seat) => ({
        ...seat,
        status: statusBySeat.get(seat.id) ?? 'AVAILABLE',
      })),
    };
  },
};