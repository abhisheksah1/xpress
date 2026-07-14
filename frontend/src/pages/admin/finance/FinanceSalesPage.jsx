import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../../api/admin.js';
import { DateRangeFilter, ExportCsvButton, StatCard, defaultDateRange, downloadBlob, fmtNpr } from './financeUtils.jsx';

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: 'All payment statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const ORDER_STATUS_OPTIONS = [
  { value: '', label: 'All order statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out_for_delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

function labelize(value) {
  return String(value || '—')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FinanceSalesPage() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getFinanceSalesLedger({
        startDate,
        endDate,
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(orderStatus ? { orderStatus } : {}),
      })
      .then((res) => setReport(res.data.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [startDate, endDate, paymentStatus, orderStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    const { data: blob } = await adminApi.exportFinanceSalesLedgerCsv({
      startDate,
      endDate,
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(orderStatus ? { orderStatus } : {}),
    });
    downloadBlob(blob, `sales-ledger-report-${endDate}.csv`);
  };

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Sales Ledger</h2>
        <p className="text-sm text-slate-500 mt-1">
          Customer order sales register by date. Filter, review totals, and export CSV.
        </p>
      </div>

      <div className="card flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-end">
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setRange} />
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Payment status</label>
            <select
              className="input-field text-sm min-w-[180px]"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-pay'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Order status</label>
            <select
              className="input-field text-sm min-w-[180px]"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all-order'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <ExportCsvButton onExport={exportCsv} label="Download sales CSV" />
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading sales ledger...</p>
      ) : !report || !summary ? (
        <div className="card text-slate-500 text-sm">Unable to load sales ledger.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Orders" value={summary.orderCount} />
            <StatCard label="Units sold" value={summary.unitsSold.toLocaleString()} />
            <StatCard label="Gross sales" value={fmtNpr(summary.grandTotal)} tone="positive" />
            <StatCard label="Paid collected" value={fmtNpr(summary.paidTotal)} tone="neutral" />
            <StatCard label="Pending" value={fmtNpr(summary.pendingTotal)} />
            <StatCard label="Discounts" value={fmtNpr(summary.discount)} tone="negative" />
            <StatCard label="Shipping" value={fmtNpr(summary.shippingFee)} />
            <StatCard label="Refunded" value={fmtNpr(summary.refundedTotal)} />
          </div>

          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-semibold text-slate-900">Sales register</h3>
              <p className="text-xs text-slate-500">
                {report.period.startDate || '—'} → {report.period.endDate || '—'}
              </p>
            </div>
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b">
                  <th className="py-2 pr-3">Order #</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3 text-right">Items</th>
                  <th className="py-2 pr-3 text-right">Subtotal</th>
                  <th className="py-2 pr-3 text-right">Ship</th>
                  <th className="py-2 pr-3 text-right">Disc.</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3">Payment</th>
                  <th className="py-2 pr-3">Pay status</th>
                  <th className="py-2">Order status</th>
                </tr>
              </thead>
              <tbody>
                {(report.rows || []).length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      No sales in this date range.
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row) => (
                    <tr key={row._id} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3 font-mono text-xs font-semibold text-slate-800">
                        {row.orderNumber}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-800">{row.customerName}</p>
                        <p className="text-xs text-slate-500">{row.customerContact || '—'}</p>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {row.itemsCount}
                        <span className="text-slate-400 text-xs block">{row.units} u</span>
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">{fmtNpr(row.subtotal)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{fmtNpr(row.shippingFee)}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-rose-600">
                        {row.discount ? `-${fmtNpr(row.discount)}` : '—'}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums font-semibold">{fmtNpr(row.total)}</td>
                      <td className="py-3 pr-3 text-xs">{labelize(row.paymentMethod)}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            row.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : row.paymentStatus === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : row.paymentStatus === 'refunded'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 text-xs">{labelize(row.orderStatus)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
