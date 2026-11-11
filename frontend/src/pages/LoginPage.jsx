import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { USE_MOCK } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Khách demo', email: 'user@cinema.com', password: '123456' },
  { label: 'Quản trị viên', email: 'admin@cinema.com', password: 'admin123' },
];

export default function LoginPage() {
  const { user, login, expired } = useAuth();
  const location = useLocation();
  // ProtectedRoute gửi kèm trang người dùng đang định vào, đăng nhập xong quay lại đúng trang đó
  const from = location.state?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Đã đăng nhập (kể cả vừa đăng nhập xong) thì chuyển đi luôn
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Thành công: user có giá trị, lần render kế tiếp sẽ tự chuyển trang
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="container page">
      <div className="card auth-card">
        <div className="card-body">
          <h1 className="page-title">Đăng nhập</h1>
          <p className="page-subtitle">Đăng nhập để đặt vé và xem lịch sử vé của bạn.</p>

          {expired && (
            <div className="alert alert-warning">Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.</div>
          )}
          {!expired && location.state?.from && (
            <div className="alert alert-info">Vui lòng đăng nhập để tiếp tục.</div>
          )}
          {error && <div className="alert alert-error">{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="text-center muted mt-2">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>

          {USE_MOCK && (
            <div className="alert alert-info mt-2">
              <div className="mb-2">Chế độ dữ liệu giả, bấm để điền sẵn tài khoản thử:</div>
              <div className="row">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}