import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const fmtNpr = (n) => `Rs. ${Number(n || 0).toLocaleString('en-NP', { maximumFractionDigits: 0 })}`;

const defaultDates = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

function KpiCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-w-0">
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function PartnerReportsPage() {
  const dates = useMemo(() => defaultDates(), []);
  const [partnerId, setPartnerId] = useState('all');
  const [startDate, setStartDate] = useState(dates.startDate);
  const [endDate, setEndDate] = useState(dates.endDate);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getPartnerExplorerReport({
        partnerId: partnerId === 'all' ? undefined : partnerId,
        startDate,
        endDate,
      });
      setReport(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load partner report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [partnerId, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  const partners = report?.partners || [];

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const res = await adminApi.exportPartnerReportCsv({
        partnerId: partnerId === 'all' ? undefined : partnerId,
        startDate,
        endDate,
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partner-transactions-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const kpis = report?.kpis;
  const states = report?.orderStates;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 mb-1">
            <Link to="/admin/api-partners" className="hover:text-primary-600">API Partners</Link>
            {' / '}Reports
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            Partner Transactional Query Explorer
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Generate client-wise analytical reports, audit order fulfillment ratios, and export compliance CSV sheets.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 lg:gap-3 shrink-0 w-full lg:w-auto">
          <div className="min-w-[180px] flex-1 sm:flex-none">
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Select partner context</label>
            <select className="input-field text-sm" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
              <option value="all">All Integration Partners ({partners.length})</option>
              {partners.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.integrationName} ({p.apiUsername})
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[130px] flex-1 sm:flex-none">
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Start date</label>
            <input type="date" className="input-field text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="min-w-[130px] flex-1 sm:flex-none">
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">End date</label>
            <input type="date" className="input-field text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={exporting || loading}
              className="btn-primary w-full sm:w-auto whitespace-nowrap flex items-center justify-center gap-2"
            >
              <span aria-hidden>⬇</span>
              {exporting ? 'Exporting...' : 'Download CSV Sheet'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading report...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              label="Placed orders count"
              value={kpis?.placedOrders ?? 0}
              sub="API placed"
            />
            <KpiCard
              label="Gross revenue (NPR)"
              value={fmtNpr(kpis?.grossRevenueNpr)}
            />
            <KpiCard
              label="Average order value"
              value={fmtNpr(kpis?.averageOrderValueNpr)}
            />
            <KpiCard
              label="API connection success rate"
              value={`${(kpis?.apiSuccessRate ?? 0).toFixed(1)}%`}
              sub={`${kpis?.apiLogHits ?? 0} error hits / ${kpis?.apiLogTotal ?? 0} requests`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-w-0">
              <h2 className="text-sm font-bold text-slate-900 mb-4">Order processing states</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  ['Pending', states?.pendingPayment, 'text-amber-600'],
                  ['Paid', states?.paid, 'text-blue-600'],
                  ['Fulfilled', states?.fulfilled, 'text-emerald-600'],
                  ['Cancelled', states?.cancelled, 'text-rose-600'],
                ].map(([label, count, color]) => (
                  <div key={label} className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <p className={`text-2xl font-black ${color}`}>{count ?? 0}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                Top 5 recipient dispatch cities / districts
              </h3>
              <div className="space-y-2">
                {(report?.topDestinations || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No destination data in this period.</p>
                ) : (
                  report.topDestinations.map((d) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1 gap-2">
                        <span className="font-medium text-slate-700 truncate">{d.name}</span>
                        <span className="text-slate-500 shrink-0">{d.count} orders ({d.percent}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${Math.min(100, d.percent)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-w-0">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Whitelisted catalog &amp; top sellers</h2>
              <p className="text-xs text-slate-400 mb-4">
                {partnerId === 'all'
                  ? 'Filtering all partners combined database ledger...'
                  : `Filtering selected partner ledger...`}
              </p>
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Top whitelisted products demanded</h3>
              <div className="space-y-2">
                {(report?.topProducts || []).length === 0 ? (
                  <p className="text-xs text-slate-400">No product demand in this period.</p>
                ) : (
                  report.topProducts.map((p) => (
                    <div key={p.name} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-800 min-w-0 truncate">{p.name}</span>
                      <span className="text-slate-500 shrink-0 text-xs">
                        Qty {p.qty} · {fmtNpr(p.revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                Line transactional ledgers for audit ({kpis?.placedOrders ?? 0} API placements found)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Order ID / Ref ID</th>
                    <th className="px-4 py-3 text-left font-bold">Date placed</th>
                    <th className="px-4 py-3 text-left font-bold">API user ID</th>
                    <th className="px-4 py-3 text-left font-bold">API partner name</th>
                    <th className="px-4 py-3 text-left font-bold">Partner username</th>
                    <th className="px-4 py-3 text-left font-bold">Sender &amp; recipient</th>
                    <th className="px-4 py-3 text-left font-bold">Delivery destination</th>
                    <th className="px-4 py-3 text-left font-bold">Manual settlement status</th>
                    <th className="px-4 py-3 text-right font-bold">Value (NPR)</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.ledger || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                        No API partner orders found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    report.ledger.map((row) => (
                      <tr key={row._id} className="border-t border-slate-100 align-top hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs text-slate-800">{row.orderNumber}</p>
                          {row.partnerExternalRef && (
                            <p className="font-mono text-[10px] text-slate-400 mt-0.5">{row.partnerExternalRef}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {row.datePlaced ? new Date(row.datePlaced).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-rose-600 font-semibold text-xs">{row.apiUserId}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.partnerName}</td>
                        <td className="px-4 py-3">
                          <span className="text-sky-600 font-medium text-xs">{row.partnerUsername}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <p>Sender: {row.senderName}</p>
                          <p className="mt-0.5">Recipient: {row.recipientName}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                          <p className="font-medium text-slate-700">📍 {row.deliveryDestination}</p>
                          {row.deliveryAddress && (
                            <p className="text-slate-400 mt-0.5 line-clamp-2">{row.deliveryAddress}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${row.settlementClass}`}>
                            {row.settlementStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {fmtNpr(row.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
