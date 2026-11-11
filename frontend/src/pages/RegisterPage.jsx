import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;

export default function RegisterPage() {
  const { user, register } = useAuth();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Đăng ký xong được tự đăng nhập, lúc đó user có giá trị và chuyển về trang chủ
  if (user) {
    return <Navigate to="/" replace />;
  }

  const update = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  // Trả về thông báo lỗi đầu tiên tìm thấy, hoặc chuỗi rỗng nếu hợp lệ
  const validate = () => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên';
    if (form.password.length < 6) return 'Mật khẩu tối thiểu 6 ký tự';
    if (form.password !== form.confirm) return 'Mật khẩu nhập lại không khớp';
    if (form.phone.trim() && !PHONE_PATTERN.test(form.phone.trim())) return 'Số điện thoại không hợp lệ';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="container page">
      <div className="card auth-card">
        <div className="card-body">
          <h1 className="page-title">Đăng ký tài khoản</h1>
          <p className="page-subtitle">Tạo tài khoản miễn phí để đặt vé nhanh hơn.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={update('fullName')}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ban@example.com"
                value={form.email}
                onChange={update('email')}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Số điện thoại (không bắt buộc)</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0901234567"
                value={form.phone}
                onChange={update('phone')}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={update('password')}
                required
              />
              <span className="field-hint">Tối thiểu 6 ký tự.</span>
            </div>
            <div className="field">
              <label htmlFor="confirm">Nhập lại mật khẩu</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={update('confirm')}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          <p className="text-center muted mt-2">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}