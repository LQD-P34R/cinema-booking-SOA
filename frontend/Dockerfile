# ---------- Giai đoạn 1: build ứng dụng React bằng Node ----------
FROM node:20-alpine AS build
WORKDIR /app

# Cài thư viện trước để Docker cache được. Có package-lock.json thì dùng npm ci cho đúng phiên bản.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Chỉ copy mã nguồn cần thiết, KHÔNG copy cả thư mục, để không mang theo node_modules
# của máy Windows (sẽ ghi đè lên thư viện vừa cài trong container và gây lỗi).
COPY index.html vite.config.js ./
COPY src ./src

# Các biến VITE_* được "nướng" vào file JS lúc build, nên đổi giá trị là phải build lại.
# VITE_API_URL phải là địa chỉ Gateway mà TRÌNH DUYỆT truy cập được (không phải tên service Docker).
ARG VITE_API_URL=http://localhost:8080
ARG VITE_USE_MOCK=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_USE_MOCK=$VITE_USE_MOCK

RUN npm run build

# ---------- Giai đoạn 2: phục vụ file tĩnh bằng nginx ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
