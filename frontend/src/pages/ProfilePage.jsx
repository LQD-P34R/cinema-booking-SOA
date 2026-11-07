import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const PHONE_PATTERN = /^(0|\+84)\d{9,10}$/;

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaved(false);

    if (!fullName.trim()) {
      setError('Họ tên không được để trống');
      return;
    }
    if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
      setError('Số điện thoại không hợp lệ');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), phone: phone.trim() });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page">
      <h1 className="page-title">Thông tin cá nhân</h1>
      <p className="page-subtitle">Cập nhật họ tên và số điện thoại của bạn.</p>

      <div className="card auth-card" style={{ maxWidth: 520 }}>
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          {saved && <div className="alert alert-success">Đã lưu thông tin.</div>}

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" value={user?.email ?? ''} disabled readOnly />
              <span className="field-hint">Email dùng để đăng nhập nên không thể đổi.</span>
            </div>
            <div className="field">
              <label htmlFor="fullName">Họ và tên</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setSaved(false);
                }}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                type="tel"
                placeholder="0901234567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="row">
              <span className="muted">Loại tài khoản:</span>
              <span className={`badge ${user?.role === 'ADMIN' ? 'badge-gold' : 'badge-blue'}`}>
                {user?.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng'}
              </span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}