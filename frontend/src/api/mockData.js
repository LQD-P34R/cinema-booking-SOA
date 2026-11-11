// Dữ liệu giả + bộ định tuyến giả lập Gateway, chỉ dùng khi VITE_USE_MOCK=true.
// Mô phỏng đúng api-contract.md (đường dẫn, request, response, mã lỗi) nên khi chuyển sang
// API thật, Frontend không phải sửa gì. Dữ liệu được lưu trong localStorage để tải lại trang không mất.
//
// Tài khoản thử:  admin@cinema.com / admin123 (ADMIN)   |   user@cinema.com / 123456 (CUSTOMER)

const DB_KEY = 'cinema_mock_db_v1';
const HOLD_MINUTES = 5;
const CLEANING_MINUTES = 15;
const SLOTS = [[10, 0], [13, 30], [17, 0], [20, 30]];
const SLOT_PRICES = [70000, 80000, 90000, 100000];

// ---------- Tiện ích thời gian (giờ địa phương, định dạng ISO không múi giờ) ----------

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const dateKey = (d) => fmt(d).slice(0, 10);
const addMinutes = (d, m) => new Date(d.getTime() + m * 60000);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

// ---------- Tạo dữ liệu ban đầu ----------

function seedMovies() {
  const make = (id, title, genre, duration, ageRating, description, status, daysAgo) => {
    const release = new Date();
    release.setDate(release.getDate() - daysAgo);
    return {
      id, title, description, genre,
      durationMinutes: duration,
      releaseDate: dateKey(release),
      posterUrl: `https://placehold.co/300x450/png?text=${title.replace(/ /g, '+')}`,
      trailerUrl: null, ageRating, status,
    };
  };
  return [
    make(1, 'Hành Trình Về Phương Nam', 'Phiêu lưu', 131, 'T13', 'Một nhóm bạn trẻ vượt qua miền sông nước để tìm lại ngôi nhà cũ của gia đình.', 'NOW_SHOWING', 30),
    make(2, 'Mùa Hè Của Ngoại', 'Tâm lý', 120, 'P', 'Câu chuyện ấm áp về tình bà cháu trong một mùa hè ở miền quê.', 'NOW_SHOWING', 20),
    make(3, 'Điệp Vụ Bóng Đêm', 'Hành động', 105, 'T16', 'Một đặc vụ nghỉ hưu bị kéo trở lại cuộc chơi sau một đêm biến cố.', 'NOW_SHOWING', 15),
    make(4, 'Thành Phố Không Ngủ', 'Hình sự', 148, 'T18', 'Cuộc truy lùng kẻ giấu mặt len lỏi qua những con hẻm của đô thị về đêm.', 'NOW_SHOWING', 10),
    make(5, 'Vũ Điệu Cuối Cùng', 'Tình cảm', 112, 'T13', 'Hai vũ công trẻ gặp lại nhau sau mười năm trước đêm diễn lớn.', 'COMING_SOON', -14),
    make(6, 'Rừng Thì Thầm', 'Kinh dị', 98, 'T18', 'Đoàn khảo sát rừng nguyên sinh nghe thấy tiếng gọi không thuộc về con người.', 'COMING_SOON', -30),
  ];
}

// Mỗi phòng 4 suất/ngày trong 7 ngày tới, giống dữ liệu mẫu của Movie Service thật
function seedShowtimes(db) {
  const nowShowing = db.movies.filter((m) => m.status === 'NOW_SHOWING');
  const now = new Date();
  const list = [];
  for (let day = 0; day < 7; day++) {
    db.rooms.forEach((room, j) => {
      SLOTS.forEach(([hour, minute], s) => {
        const start = new Date();
        start.setDate(start.getDate() + day);
        start.setHours(hour, minute, 0, 0);
        if (start <= now) return;
        const movie = nowShowing[(s < 2 ? j : j + 1) % nowShowing.length];
        list.push({
          id: db.seq.showtime++,
          movieId: movie.id,
          roomId: room.id,
          startTime: fmt(start),
          endTime: fmt(addMinutes(start, movie.durationMinutes + CLEANING_MINUTES)),
          basePrice: SLOT_PRICES[s],
        });
      });
    });
  }
  return list;
}

function createDb() {
  const db = {
    seededOn: dateKey(new Date()),
    seq: { movie: 7, cinema: 3, room: 5, showtime: 1, booking: 1001, payment: 501, user: 3 },
    users: [
      { id: 1, fullName: 'Quản trị viên', email: 'admin@cinema.com', password: 'admin123', phone: '0900000001', role: 'ADMIN' },
      { id: 2, fullName: 'Khách Demo', email: 'user@cinema.com', password: '123456', phone: '0900000002', role: 'CUSTOMER' },
    ],
    movies: seedMovies(),
    cinemas: [
      { id: 1, name: 'Cinema Sao Việt - Quận 1', address: '12 Lê Lợi, Quận 1', city: 'TP.HCM' },
      { id: 2, name: 'Cinema Sao Việt - Thủ Đức', address: '45 Võ Văn Ngân, TP. Thủ Đức', city: 'TP.HCM' },
    ],
    rooms: [
      { id: 1, cinemaId: 1, name: 'Phòng 1', totalRows: 8, seatsPerRow: 10 },
      { id: 2, cinemaId: 1, name: 'Phòng 2', totalRows: 6, seatsPerRow: 8 },
      { id: 3, cinemaId: 2, name: 'Phòng 1', totalRows: 8, seatsPerRow: 10 },
      { id: 4, cinemaId: 2, name: 'Phòng 2', totalRows: 6, seatsPerRow: 8 },
    ],
    seatOverrides: {}, // "roomId:seatId" -> loại ghế do admin đổi
    showtimes: [],
    bookings: [],
    payments: [],
  };
  db.showtimes = seedShowtimes(db);
  return db;
}

function loadDb() {
  let db = null;
  try {
    db = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
  } catch {
    db = null;
  }
  if (!db) return createDb();

  // Sang ngày mới thì sinh lại suất chiếu, giữ nguyên tài khoản và đơn đặt vé
  if (db.seededOn !== dateKey(new Date())) {
    db.seededOn = dateKey(new Date());
    db.showtimes = seedShowtimes(db);
  }
  return db;
}

function saveDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* bỏ qua nếu không lưu được */
  }
}

// ---------- Ghế và giá ----------

const rowLabel = (index) => String.fromCharCode(65 + index);

// Mặc định STANDARD; phòng từ 4 hàng trở lên thì 2 hàng cuối là VIP (giống Movie Service thật)
function roomSeats(db, room) {
  const seats = [];
  for (let r = 0; r < room.totalRows; r++) {
    for (let n = 1; n <= room.seatsPerRow; n++) {
      const id = room.id * 1000 + r * room.seatsPerRow + n;
      const defaultType = room.totalRows >= 4 && r >= room.totalRows - 2 ? 'VIP' : 'STANDARD';
      seats.push({
        id, row: rowLabel(r), number: n, label: `${rowLabel(r)}${n}`,
        type: db.seatOverrides[`${room.id}:${id}`] || defaultType,
      });
    }
  }
  return seats;
}

// STANDARD = giá gốc, VIP x1.3, COUPLE x2, làm tròn xuống đến hàng nghìn (tính bằng số nguyên để khỏi sai số)
function seatPrice(type, basePrice) {
  const raw = type === 'VIP' ? (basePrice * 13) / 10 : type === 'COUPLE' ? basePrice * 2 : basePrice;
  return Math.floor(raw / 1000) * 1000;
}

// ---------- Hiển thị theo đúng định dạng response của contract ----------

const userView = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role });

function showtimeView(db, st) {
  const movie = db.movies.find((m) => m.id === st.movieId);
  const room = db.rooms.find((r) => r.id === st.roomId);
  const cinema = db.cinemas.find((c) => c.id === room.cinemaId);
  return {
    id: st.id, movieId: movie.id, movieTitle: movie.title,
    cinemaId: cinema.id, cinemaName: cinema.name,
    roomId: room.id, roomName: room.name,
    startTime: st.startTime, endTime: st.endTime, basePrice: st.basePrice,
  };
}

const roomView = (r) => ({ id: r.id, cinemaId: r.cinemaId, name: r.name, totalRows: r.totalRows, seatsPerRow: r.seatsPerRow });

// ---------- Phân quyền ----------

function authenticate(db, token) {
  const match = /^mock-token\.(\d+)$/.exec(token || '');
  return match ? db.users.find((u) => u.id === Number(match[1])) || null : null;
}

function requireUser(user) {
  if (!user) fail(401, 'Bạn cần đăng nhập để thực hiện thao tác này');
}

function requireAdmin(user) {
  requireUser(user);
  if (user.role !== 'ADMIN') fail(403, 'Bạn không có quyền thực hiện thao tác này');
}

// ---------- Đặt vé ----------

// Đơn chờ thanh toán quá hạn giữ ghế thì chuyển EXPIRED (Booking Service thật làm bằng job chạy nền)
function expireBookings(db) {
  const now = new Date();
  db.bookings.forEach((b) => {
    if (b.status === 'PENDING_PAYMENT' && new Date(b.expiresAt) < now) b.status = 'EXPIRED';
  });
}

function seatStatusOf(db, showtimeId) {
  const seats = [];
  db.bookings
    .filter((b) => b.showtimeId === showtimeId && (b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED'))
    .forEach((b) => {
      const status = b.status === 'CONFIRMED' ? 'SOLD' : 'HELD';
      b.seatIds.forEach((seatId) => seats.push({ seatId, status }));
    });
  return { showtimeId, seats };
}

function bookingView(b, withUser = false) {
  const view = {
    bookingId: b.bookingId, status: b.status, totalAmount: b.totalAmount, expiresAt: b.expiresAt,
    showtimeId: b.showtimeId, movieTitle: b.movieTitle, cinemaName: b.cinemaName, roomName: b.roomName,
    startTime: b.startTime, seatLabels: b.seatLabels, ticketCode: b.ticketCode ?? null, createdAt: b.createdAt,
  };
  if (b.paidAt) view.paidAt = b.paidAt;
  if (withUser) view.userId = b.userId;
  return view;
}

function ownBookingOrThrow(db, id, user) {
  const booking = db.bookings.find((b) => b.bookingId === id);
  if (!booking) fail(404, `Không tìm thấy đơn đặt vé ${id}`);
  if (booking.userId !== user.id && user.role !== 'ADMIN') fail(403, 'Bạn không có quyền xem đơn này');
  return booking;
}

function createBooking(db, user, body) {
  const showtime = db.showtimes.find((s) => s.id === body?.showtimeId);
  if (!showtime) fail(404, 'Không tìm thấy suất chiếu');
  const seatIds = body?.seatIds;
  if (!Array.isArray(seatIds) || seatIds.length === 0) fail(400, 'Vui lòng chọn ít nhất một ghế');
  if (new Set(seatIds).size !== seatIds.length) fail(400, 'Danh sách ghế bị trùng');
  if (seatIds.length > 8) fail(400, 'Mỗi đơn chỉ được đặt tối đa 8 ghế');

  const room = db.rooms.find((r) => r.id === showtime.roomId);
  const allSeats = roomSeats(db, room);
  const chosen = seatIds.map((id) => allSeats.find((s) => s.id === id));
  if (chosen.some((s) => !s)) fail(404, 'Có ghế không tồn tại trong phòng chiếu');

  const taken = new Set(seatStatusOf(db, showtime.id).seats.map((s) => s.seatId));
  const conflict = chosen.find((s) => taken.has(s.id));
  if (conflict) fail(409, `Ghế ${conflict.label} đã được giữ hoặc đã bán`);

  const view = showtimeView(db, showtime);
  const now = new Date();
  const booking = {
    bookingId: db.seq.booking++, userId: user.id, status: 'PENDING_PAYMENT',
    totalAmount: chosen.reduce((sum, s) => sum + seatPrice(s.type, showtime.basePrice), 0),
    expiresAt: fmt(addMinutes(now, HOLD_MINUTES)),
    showtimeId: showtime.id, seatIds, seatLabels: chosen.map((s) => s.label),
    movieTitle: view.movieTitle, cinemaName: view.cinemaName, roomName: view.roomName, startTime: view.startTime,
    ticketCode: null, createdAt: fmt(now),
  };
  db.bookings.push(booking);
  return bookingView(booking);
}

function payBooking(db, user, id, body) {
  const booking = ownBookingOrThrow(db, id, user);
  const payment = db.payments.find((p) => p.bookingId === id && p.status === 'SUCCESS');

  // Chống thanh toán lặp: đơn đã thành công thì trả lại kết quả cũ, không tạo giao dịch mới
  if (booking.status === 'CONFIRMED' && payment) {
    return { ...bookingView(booking), payment: paymentView(payment) };
  }
  if (booking.status === 'EXPIRED') fail(409, 'Đơn đặt vé đã hết hạn giữ ghế');
  if (booking.status === 'CANCELLED') fail(409, 'Đơn đặt vé đã bị hủy');

  const method = body?.method;
  if (!['CARD', 'E_WALLET', 'BANK_TRANSFER'].includes(method)) fail(400, 'Phương thức thanh toán không hợp lệ');

  const success = (body?.simulateResult || 'SUCCESS') !== 'FAILED';
  const now = new Date();
  const record = {
    paymentId: db.seq.payment++, bookingId: id, userId: booking.userId,
    status: success ? 'SUCCESS' : 'FAILED', method, amount: booking.totalAmount, createdAt: fmt(now),
  };
  db.payments.push(record);

  if (success) {
    booking.status = 'CONFIRMED';
    booking.paidAt = fmt(now);
    booking.ticketCode = `CB-${id}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  } else {
    booking.status = 'CANCELLED'; // thanh toán thất bại: hủy đơn, ghế được giải phóng
  }
  return { ...bookingView(booking), payment: paymentView(record) };
}

const paymentView = (p) => ({ paymentId: p.paymentId, bookingId: p.bookingId, status: p.status, method: p.method, amount: p.amount, createdAt: p.createdAt });

// ---------- Kiểm tra dữ liệu quản trị ----------

function pickMovie(body) {
  if (!body?.title?.trim()) fail(400, 'Tên phim không được để trống');
  if (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 1) fail(400, 'Thời lượng phim phải lớn hơn 0');
  return {
    title: body.title.trim(), description: body.description ?? null, genre: body.genre ?? null,
    durationMinutes: body.durationMinutes, releaseDate: body.releaseDate ?? null,
    posterUrl: body.posterUrl ?? null, trailerUrl: body.trailerUrl ?? null, ageRating: body.ageRating ?? null,
  };
}

function pickCinema(body) {
  if (!body?.name?.trim()) fail(400, 'Tên rạp không được để trống');
  if (!body?.address?.trim()) fail(400, 'Địa chỉ không được để trống');
  if (!body?.city?.trim()) fail(400, 'Thành phố không được để trống');
  return { name: body.name.trim(), address: body.address.trim(), city: body.city.trim() };
}

function buildShowtime(db, body, excludeId) {
  const movie = db.movies.find((m) => m.id === body?.movieId);
  if (!movie) fail(404, 'Không tìm thấy phim');
  const room = db.rooms.find((r) => r.id === body?.roomId);
  if (!room) fail(404, 'Không tìm thấy phòng chiếu');
  if (!body.startTime) fail(400, 'Giờ bắt đầu không được để trống');
  if (!Number.isInteger(body.basePrice) || body.basePrice < 1000) fail(400, 'Giá vé tối thiểu 1.000 VND');

  const start = new Date(body.startTime);
  if (Number.isNaN(start.getTime())) fail(400, 'Giờ bắt đầu sai định dạng');
  if (start <= new Date()) fail(400, 'Giờ bắt đầu phải ở trong tương lai');

  const end = addMinutes(start, movie.durationMinutes + CLEANING_MINUTES);
  const overlap = db.showtimes.some(
    (s) => s.roomId === room.id && s.id !== excludeId && new Date(s.startTime) < end && new Date(s.endTime) > start,
  );
  if (overlap) fail(409, 'Phòng chiếu đã có suất khác trùng khung giờ này');

  return { movieId: movie.id, roomId: room.id, startTime: fmt(start), endTime: fmt(end), basePrice: body.basePrice };
}

// ---------- Bộ định tuyến giả lập ----------

function match(pattern, path) {
  const keys = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:[a-zA-Z]+/g, (k) => { keys.push(k.slice(1)); return '([^/]+)'; }) + '$',
  );
  const result = regex.exec(path);
  if (!result) return null;
  return Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(result[i + 1])]));
}

function route(db, method, path, body, query, user) {
  let p;

  // ----- User Service -----
  if (method === 'POST' && path === '/api/auth/register') {
    if (!body?.fullName?.trim() || !body?.email?.trim() || !body?.password) fail(400, 'Vui lòng nhập đầy đủ họ tên, email và mật khẩu');
    if (body.password.length < 6) fail(400, 'Mật khẩu tối thiểu 6 ký tự');
    if (db.users.some((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())) fail(409, 'Email đã được sử dụng');
    const created = {
      id: db.seq.user++, fullName: body.fullName.trim(), email: body.email.trim(),
      password: body.password, phone: body.phone ?? '', role: 'CUSTOMER',
    };
    db.users.push(created);
    return userView(created);
  }
  if (method === 'POST' && path === '/api/auth/login') {
    const found = db.users.find(
      (u) => u.email.toLowerCase() === (body?.email || '').trim().toLowerCase() && u.password === body?.password,
    );
    if (!found) fail(401, 'Email hoặc mật khẩu không đúng');
    return { token: `mock-token.${found.id}`, user: userView(found) };
  }
  if (path === '/api/users/me') {
    requireUser(user);
    if (method === 'GET') return userView(user);
    if (method === 'PUT') {
      if (!body?.fullName?.trim()) fail(400, 'Họ tên không được để trống');
      user.fullName = body.fullName.trim();
      user.phone = body.phone ?? user.phone;
      return userView(user);
    }
  }

  // ----- Movie Service: phim -----
  if (path === '/api/movies') {
    if (method === 'GET') {
      const kw = (query.keyword || '').toLowerCase();
      const genre = (query.genre || '').toLowerCase();
      return db.movies
        .filter((m) => !kw || m.title.toLowerCase().includes(kw))
        .filter((m) => !genre || (m.genre || '').toLowerCase().includes(genre))
        .filter((m) => !query.status || m.status === query.status)
        .sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || '') || b.id - a.id);
    }
    if (method === 'POST') {
      requireAdmin(user);
      const movie = { id: db.seq.movie++, ...pickMovie(body), status: body.status || 'COMING_SOON' };
      db.movies.push(movie);
      return movie;
    }
  }
  if ((p = match('/api/movies/:id', path))) {
    const id = Number(p.id);
    const movie = db.movies.find((m) => m.id === id);
    if (method === 'GET') {
      if (!movie) fail(404, `Không tìm thấy phim với id ${id}`);
      return movie;
    }
    if (method === 'PUT') {
      requireAdmin(user);
      if (!movie) fail(404, `Không tìm thấy phim với id ${id}`);
      Object.assign(movie, pickMovie(body), { status: body.status || movie.status });
      return movie;
    }
    if (method === 'DELETE') {
      requireAdmin(user);
      if (!movie) fail(404, `Không tìm thấy phim với id ${id}`);
      if (db.showtimes.some((s) => s.movieId === id && new Date(s.startTime) > new Date())) {
        fail(409, 'Không thể xóa phim vì còn suất chiếu trong tương lai');
      }
      db.movies = db.movies.filter((m) => m.id !== id);
      return null;
    }
  }

  // ----- Movie Service: rạp, phòng, ghế -----
  if (path === '/api/cinemas') {
    if (method === 'GET') return db.cinemas;
    if (method === 'POST') {
      requireAdmin(user);
      const cinema = { id: db.seq.cinema++, ...pickCinema(body) };
      db.cinemas.push(cinema);
      return cinema;
    }
  }
  if ((p = match('/api/cinemas/:id/rooms', path)) && method === 'POST') {
    requireAdmin(user);
    const cinemaId = Number(p.id);
    if (!db.cinemas.some((c) => c.id === cinemaId)) fail(404, `Không tìm thấy rạp với id ${cinemaId}`);
    if (!body?.name?.trim()) fail(400, 'Tên phòng không được để trống');
    const rows = body.totalRows;
    const perRow = body.seatsPerRow;
    if (!Number.isInteger(rows) || rows < 1 || rows > 26) fail(400, 'Số hàng ghế phải từ 1 đến 26');
    if (!Number.isInteger(perRow) || perRow < 1 || perRow > 30) fail(400, 'Số ghế mỗi hàng phải từ 1 đến 30');
    const room = { id: db.seq.room++, cinemaId, name: body.name.trim(), totalRows: rows, seatsPerRow: perRow };
    db.rooms.push(room);
    return roomView(room);
  }
  if ((p = match('/api/cinemas/:id', path))) {
    const id = Number(p.id);
    const cinema = db.cinemas.find((c) => c.id === id);
    if (method === 'GET') {
      if (!cinema) fail(404, `Không tìm thấy rạp với id ${id}`);
      return { ...cinema, rooms: db.rooms.filter((r) => r.cinemaId === id).map(({ id: rid, name, totalRows, seatsPerRow }) => ({ id: rid, name, totalRows, seatsPerRow })) };
    }
    if (method === 'PUT') {
      requireAdmin(user);
      if (!cinema) fail(404, `Không tìm thấy rạp với id ${id}`);
      Object.assign(cinema, pickCinema(body));
      return cinema;
    }
    if (method === 'DELETE') {
      requireAdmin(user);
      if (!cinema) fail(404, `Không tìm thấy rạp với id ${id}`);
      const roomIds = db.rooms.filter((r) => r.cinemaId === id).map((r) => r.id);
      if (db.showtimes.some((s) => roomIds.includes(s.roomId))) fail(409, 'Không thể xóa rạp vì có phòng đã có suất chiếu');
      db.cinemas = db.cinemas.filter((c) => c.id !== id);
      db.rooms = db.rooms.filter((r) => r.cinemaId !== id);
      return null;
    }
  }
  if ((p = match('/api/rooms/:roomId/seats/:seatId', path)) && method === 'PUT') {
    requireAdmin(user);
    const room = db.rooms.find((r) => r.id === Number(p.roomId));
    const seat = room && roomSeats(db, room).find((s) => s.id === Number(p.seatId));
    if (!seat) fail(404, `Không tìm thấy ghế ${p.seatId} trong phòng ${p.roomId}`);
    if (!['STANDARD', 'VIP', 'COUPLE'].includes(body?.type)) fail(400, 'Loại ghế không hợp lệ');
    db.seatOverrides[`${room.id}:${seat.id}`] = body.type;
    return { ...seat, type: body.type };
  }
  if ((p = match('/api/rooms/:id', path))) {
    const id = Number(p.id);
    const room = db.rooms.find((r) => r.id === id);
    if (method === 'PUT') {
      requireAdmin(user);
      if (!room) fail(404, `Không tìm thấy phòng với id ${id}`);
      if (!body?.name?.trim()) fail(400, 'Tên phòng không được để trống');
      room.name = body.name.trim();
      return roomView(room);
    }
    if (method === 'DELETE') {
      requireAdmin(user);
      if (!room) fail(404, `Không tìm thấy phòng với id ${id}`);
      if (db.showtimes.some((s) => s.roomId === id)) fail(409, 'Không thể xóa phòng vì đã có suất chiếu');
      db.rooms = db.rooms.filter((r) => r.id !== id);
      return null;
    }
  }

  // ----- Movie Service: suất chiếu -----
  if (path === '/api/showtimes') {
    if (method === 'GET') {
      return db.showtimes
        .filter((s) => !query.movieId || s.movieId === Number(query.movieId))
        .filter((s) => !query.cinemaId || db.rooms.find((r) => r.id === s.roomId)?.cinemaId === Number(query.cinemaId))
        .filter((s) => !query.date || s.startTime.startsWith(query.date))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((s) => showtimeView(db, s));
    }
    if (method === 'POST') {
      requireAdmin(user);
      const showtime = { id: db.seq.showtime++, ...buildShowtime(db, body, null) };
      db.showtimes.push(showtime);
      return showtimeView(db, showtime);
    }
  }
  // Route seat-status đứng trước /api/showtimes/:id/seats cho giống thứ tự định tuyến ở Gateway
  if ((p = match('/api/showtimes/:id/seat-status', path)) && method === 'GET') {
    const id = Number(p.id);
    if (!db.showtimes.some((s) => s.id === id)) fail(404, `Không tìm thấy suất chiếu với id ${id}`);
    return seatStatusOf(db, id);
  }
  if ((p = match('/api/showtimes/:id/seats', path)) && method === 'GET') {
    const showtime = db.showtimes.find((s) => s.id === Number(p.id));
    if (!showtime) fail(404, `Không tìm thấy suất chiếu với id ${p.id}`);
    const room = db.rooms.find((r) => r.id === showtime.roomId);
    return {
      showtimeId: showtime.id, roomId: room.id, roomName: room.name,
      totalRows: room.totalRows, seatsPerRow: room.seatsPerRow,
      seats: roomSeats(db, room).map((s) => ({ ...s, price: seatPrice(s.type, showtime.basePrice) })),
    };
  }
  if ((p = match('/api/showtimes/:id', path))) {
    const id = Number(p.id);
    const showtime = db.showtimes.find((s) => s.id === id);
    if (method === 'GET') {
      if (!showtime) fail(404, `Không tìm thấy suất chiếu với id ${id}`);
      return showtimeView(db, showtime);
    }
    if (method === 'PUT') {
      requireAdmin(user);
      if (!showtime) fail(404, `Không tìm thấy suất chiếu với id ${id}`);
      Object.assign(showtime, buildShowtime(db, body, id));
      return showtimeView(db, showtime);
    }
    if (method === 'DELETE') {
      requireAdmin(user);
      if (!showtime) fail(404, `Không tìm thấy suất chiếu với id ${id}`);
      db.showtimes = db.showtimes.filter((s) => s.id !== id);
      return null;
    }
  }

  // ----- Booking Service -----
  if (path === '/api/bookings') {
    if (method === 'POST') {
      requireUser(user);
      return createBooking(db, user, body);
    }
    if (method === 'GET') {
      requireAdmin(user);
      return db.bookings
        .filter((b) => !query.status || b.status === query.status)
        .filter((b) => !query.showtimeId || b.showtimeId === Number(query.showtimeId))
        .sort((a, b) => b.bookingId - a.bookingId)
        .map((b) => bookingView(b, true));
    }
  }
  if (method === 'GET' && path === '/api/bookings/my') {
    requireUser(user);
    return db.bookings.filter((b) => b.userId === user.id).sort((a, b) => b.bookingId - a.bookingId).map((b) => bookingView(b));
  }
  if ((p = match('/api/bookings/:id/pay', path)) && method === 'POST') {
    requireUser(user);
    return payBooking(db, user, Number(p.id), body);
  }
  if ((p = match('/api/bookings/:id/cancel', path)) && method === 'POST') {
    requireUser(user);
    const booking = ownBookingOrThrow(db, Number(p.id), user);
    if (booking.status !== 'PENDING_PAYMENT') fail(409, 'Chỉ hủy được đơn đang chờ thanh toán');
    booking.status = 'CANCELLED';
    return bookingView(booking);
  }
  if ((p = match('/api/bookings/:id', path)) && method === 'GET') {
    requireUser(user);
    return bookingView(ownBookingOrThrow(db, Number(p.id), user));
  }

  // ----- Payment Service -----
  if (method === 'GET' && path === '/api/payments') {
    requireAdmin(user);
    return db.payments.filter((x) => !query.status || x.status === query.status).sort((a, b) => b.paymentId - a.paymentId).map(paymentView);
  }
  if ((p = match('/api/payments/booking/:bookingId', path)) && method === 'GET') {
    requireUser(user);
    const booking = ownBookingOrThrow(db, Number(p.bookingId), user);
    const payment = [...db.payments].reverse().find((x) => x.bookingId === booking.bookingId);
    if (!payment) fail(404, 'Đơn này chưa có giao dịch thanh toán');
    return paymentView(payment);
  }

  return fail(404, `Không tìm thấy đường dẫn ${path}`);
}

/**
 * Điểm vào duy nhất: giả lập một request tới Gateway.
 * Trả về dữ liệu giống response thật, hoặc ném lỗi có thuộc tính status và message.
 */
export async function mockRequest(method, path, { body, query = {}, token } = {}) {
  await delay(150); // giả lập độ trễ mạng
  const db = loadDb();
  expireBookings(db);
  const user = authenticate(db, token);
  try {
    const result = route(db, method, path, body, query, user);
    return result === undefined || result === null ? null : JSON.parse(JSON.stringify(result));
  } finally {
    saveDb(db); // lưu cả khi lỗi, vì việc đánh dấu hết hạn đã thay đổi dữ liệu
  }
}