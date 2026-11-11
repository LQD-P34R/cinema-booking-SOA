import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          Cinema <span>Sao Việt</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end className={linkClass}>
            Phim
          </NavLink>
          {user && (
            <NavLink to="/my-bookings" className={linkClass}>
              Vé của tôi
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Quản trị
            </NavLink>
          )}
        </nav>

        <div className="nav-user">
          {user ? (
            <>
              <Link to="/profile" className="nav-user-name">
                {user.fullName}
              </Link>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}