import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, loadSession, saveSession } from '../api/client.js';

// Trạng thái đăng nhập dùng chung. Dùng trong component: const { user, isAdmin, login, logout } = useAuth();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Khôi phục phiên từ localStorage khi tải lại trang
  const [session, setSession] = useState(() => loadSession()); // { token, user } hoặc null
  const [expired, setExpired] = useState(false); // true khi bị đăng xuất do token hết hạn

  const user = session?.user ?? null;

  const login = useCallback(async (email, password) => {
    const { token, user: loggedIn } = await api.login({ email, password });
    saveSession(token, loggedIn);
    setSession({ token, user: loggedIn });
    setExpired(false);
    return loggedIn;
  }, []);

  // Đăng ký xong tự đăng nhập luôn cho khách đỡ phải nhập lại
  const register = useCallback(
    async (data) => {
      await api.register(data);
      return login(data.email, data.password);
    },
    [login],
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const updateProfile = useCallback(
    async (data) => {
      const updated = await api.updateMe(data);
      setSession((current) => {
        if (!current) return current;
        saveSession(current.token, updated);
        return { token: current.token, user: updated };
      });
      return updated;
    },
    [],
  );

  // client.js bắn sự kiện này khi Gateway trả 401 cho một request có token (token hết hạn hoặc bị từ chối)
  useEffect(() => {
    const handleExpired = () => {
      setSession(null);
      setExpired(true);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  // Kiểm tra nhanh token đã lưu còn dùng được không. Nếu không, client.js sẽ tự đăng xuất.
  // Các lỗi khác (ví dụ mất mạng) bỏ qua để người dùng không bị đăng xuất oan.
  useEffect(() => {
    if (loadSession()) {
      api.getMe().catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      expired,
      clearExpired: () => setExpired(false),
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, expired, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
  }
  return context;
}