import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend chạy ở cổng 3000 theo quy ước chung của nhóm.
// Địa chỉ Gateway lấy từ biến VITE_API_URL (mặc định http://localhost:8080, xem src/api/client.js).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, // cổng 3000 bận thì báo lỗi, không tự đổi sang cổng khác (vì Gateway chỉ cho phép CORS từ 3000)
    host: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
});