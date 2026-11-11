import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client.js';
import { PAYMENT_METHODS, PAYMENT_STATUS, formatCurrency, formatDateTime, statusInfo } from '../../utils/format.js';

function StatCard({ label, value }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="muted">{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}

const STATUS_FILTERS = [{ key: 'ALL', label: 'Tất cả' }, ...Object.entries(PAYMENT_STATUS).map(([key, info]) => ({ key, label: info.label }))];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api
      .getPayments()
      .then((data) => {
        if (!cancelled) setPayments(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Thống kê trên toàn bộ giao dịch, không phụ thuộc bộ lọc đang chọn
  const stats = useMemo(() => {
    const success = payments.filter((p) => p.status === 'SUCCESS');
    return {
      total: payments.length,
      success: success.length,
      failed: payments.filter((p) => p.status === 'FAILED').length,
      amount: success.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return payments
      .filter((p) => statusFilter === 'ALL' || p.status === statusFilter)
      .filter((p) => !keyword || [p.paymentId, p.bookingId, p.userId].join(' ').toLowerCase().includes(keyword));
  }, [payments, statusFilter, search]);

  return (
    <div>
      <div
        className="mb-2"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}
      >
        <StatCard label="Tổng số giao dịch" value={stats.total} />
        <StatCard label="Thành công" value={stats.success} />
        <StatCard label="Thất bại" value={stats.failed} />
        <StatCard label="Tổng tiền thu được" value={formatCurrency(stats.amount)} />
      </div>

      <div className="toolbar">
        <div className="chips">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`chip${statusFilter === f.key ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="search"
          placeholder="Tìm mã giao dịch, mã đơn, khách..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="spacer" />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
          Làm mới
        </button>
      </div>

      {error && (
        <div className="alert alert-error row row-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>Đang tải danh sách giao dịch...</span>
        </div>
      ) : (
        !error &&
        (visible.length === 0 ? (
          <div className="empty">Không có giao dịch nào phù hợp.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã giao dịch</th>
                  <th>Mã đơn</th>
                  <th>Khách</th>
                  <th>Phương thức</th>
                  <th>Số tiền</th>
                  <th>Kết quả</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((payment) => {
                  const status = statusInfo(PAYMENT_STATUS, payment.status);
                  return (
                    <tr key={payment.paymentId}>
                      <td>
                        <strong>#{payment.paymentId}</strong>
                      </td>
                      <td>#{payment.bookingId}</td>
                      <td>{payment.userId ?? '—'}</td>
                      <td>{PAYMENT_METHODS[payment.method] ?? payment.method}</td>
                      <td className="price">{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className={`badge ${status.badge}`}>{status.label}</span>
                      </td>
                      <td>{payment.createdAt ? formatDateTime(payment.createdAt) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}