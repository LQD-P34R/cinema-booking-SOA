import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { USE_MOCK } from './api/client.js';
import Navbar from './components/Navbar.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AdminBookingsPage from './pages/admin/AdminBookingsPage.jsx';
import AdminCinemasPage from './pages/admin/AdminCinemasPage.jsx';
import AdminMoviesPage from './pages/admin/AdminMoviesPage.jsx';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage.jsx';
import AdminShowtimesPage from './pages/admin/AdminShowtimesPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MovieDetailPage from './pages/MovieDetailPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import PaymentPage from './pages/PaymentPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import TicketPage from './pages/TicketPage.jsx';

// Khung chung của mọi trang: thanh menu ở trên, chân trang ở dưới.
// Các trang còn lại (chi tiết phim, đặt vé, admin...) sẽ được thêm dần vào <Routes> ở cuối file.

function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          Cinema Sao Việt - Đồ án môn Phát triển phần mềm hướng dịch vụ
          {USE_MOCK && <span className="badge badge-gold" style={{ marginLeft: 8 }}>Dữ liệu giả</span>}
        </div>
      </footer>
    </div>
  );
}

/**
 * Chặn trang cần đăng nhập. Chưa đăng nhập thì chuyển sang /login và nhớ trang đang định vào
 * để đăng nhập xong quay lại. Với adminOnly, người không phải ADMIN bị đưa về trang chủ.
 * Cách dùng: <Route path="/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
 */
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

// Mỗi trang quản trị mới thêm vào đây một tab và một <Route> con bên dưới.
const ADMIN_TABS = [
  { to: '/admin/movies', label: 'Phim' },
  { to: '/admin/cinemas', label: 'Rạp & phòng' },
  { to: '/admin/showtimes', label: 'Suất chiếu' },
  { to: '/admin/bookings', label: 'Đơn đặt vé' },
  { to: '/admin/payments', label: 'Giao dịch' },
];

function AdminLayout() {
  return (
    <div className="container page">
      <h1 className="page-title">Quản trị</h1>
      <p className="page-subtitle">Quản lý phim, rạp, suất chiếu và đơn đặt vé.</p>
      <nav className="tabs">
        {ADMIN_TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="container page text-center">
      <h1 className="page-title">404</h1>
      <p className="page-subtitle">Không tìm thấy trang bạn cần.</p>
      <Link to="/" className="btn btn-primary">
        Về trang chủ
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route
          path="/booking/:showtimeId"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment/:bookingId"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:bookingId"
          element={
            <ProtectedRoute>
              <TicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="movies" replace />} />
          <Route path="movies" element={<AdminMoviesPage />} />
          <Route path="cinemas" element={<AdminCinemasPage />} />
          <Route path="showtimes" element={<AdminShowtimesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}