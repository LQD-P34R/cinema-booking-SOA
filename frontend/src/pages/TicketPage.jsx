import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client.js';
import { BOOKING_STATUS, formatCurrency, formatDate, formatDateTime, formatTime, statusInfo } from '../utils/format.js';

export default function TicketPage() {
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, message }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getBooking(bookingId)
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err) => {
        if (!cancelled) setError({ status: err.status, message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="container page">
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải vé...</span>
        </div>
      </div>
    );
  }

  if (error) {
    const title = error.status === 404 ? 'Không tìm thấy vé' : error.status === 403 ? 'Bạn không có quyền xem vé này' : 'Không tải được vé';
    return (
      <div className="container page text-center">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{error.message}</p>
        <Link to="/my-bookings" className="btn btn-primary">
          Vé của tôi
        </Link>
      </div>
    );
  }

  // Chỉ đơn đã thanh toán mới có vé
  if (booking.status !== 'CONFIRMED') {
    const status = statusInfo(BOOKING_STATUS, booking.status);
    return (
      <div className="container page text-center">
        <h1 className="page-title">Đơn này chưa có vé</h1>
        <p className="page-subtitle">
          Trạng thái đơn: <span className={`badge ${status.badge}`}>{status.label}</span>
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {booking.status === 'PENDING_PAYMENT' && (
            <Link to={`/payment/${booking.bookingId}`} className="btn btn-primary">
              Tiếp tục thanh toán
            </Link>
          )}
          <Link to="/my-bookings" className="btn btn-secondary">
            Vé của tôi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="alert alert-success text-center">Đặt vé thành công! Vui lòng xuất trình mã QR này tại rạp.</div>

      <div className="ticket">
        <div className="ticket-main">
          <h2>{booking.movieTitle}</h2>
          <div className="ticket-row">
            <span>Rạp</span>
            <strong>{booking.cinemaName}</strong>
          </div>
          <div className="ticket-row">
            <span>Phòng chiếu</span>
            <strong>{booking.roomName}</strong>
          </div>
          <div className="ticket-row">
            <span>Suất chiếu</span>
            <strong>
              {formatTime(booking.startTime)}, {formatDate(booking.startTime)}
            </strong>
          </div>
          <div className="ticket-row">
            <span>Ghế</span>
            <strong>{booking.seatLabels.join(', ')}</strong>
          </div>
          <div className="ticket-row">
            <span>Tổng tiền</span>
            <strong className="price">{formatCurrency(booking.totalAmount)}</strong>
          </div>
          <div className="ticket-row">
            <span>Mã đơn</span>
            <strong>#{booking.bookingId}</strong>
          </div>
          {booking.paidAt && (
            <div className="ticket-row">
              <span>Thanh toán lúc</span>
              <strong>{formatDateTime(booking.paidAt)}</strong>
            </div>
          )}
        </div>

        <div className="ticket-qr">
          <QRCodeSVG value={booking.ticketCode} size={140} level="M" />
          <div>{booking.ticketCode}</div>
        </div>
      </div>

      <div className="row mt-3" style={{ justifyContent: 'center' }}>
        <Link to="/my-bookings" className="btn btn-secondary">
          Vé của tôi
        </Link>
        <Link to="/" className="btn btn-primary">
          Tiếp tục xem phim
        </Link>
      </div>
    </div>
  );
}