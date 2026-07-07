import { useEffect, useState } from 'react';
import { adminApi } from '../../../api/admin.js';
import { DateRangeFilter, ExportCsvButton, StatCard, defaultDateRange, downloadBlob, fmtNpr } from './financeUtils.jsx';

export default function FinancePnlPage() {
  const [{ startDate, endDate }, setRange] = useState(defaultDateRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const exportCsv = async () => {
    const { data: blob } = await adminApi.exportFinancePnlCsv({ startDate, endDate });
    downloadBlob(blob, `profit-loss-report-${endDate}.csv`);
  };

  useEffect(() => {
    setLoading(true);
    adminApi
      .getFinancePnl({ startDate, endDate })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="card flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Profit &amp; Loss Statement</h2>
          <p className="text-sm text-slate-500 mt-1">Based on paid orders, product cost, and recorded overhead.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <DateRangeFilter startDate={startDate} endDate={endDate} onChange={setRange} />
          <ExportCsvButton onExport={exportCsv} />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading statement...</p>
      ) : !data ? (
        <p className="text-slate-400">Unable to load P&amp;L data.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Revenue" value={fmtNpr(data.revenue)} sub={`${data.orderCount} paid orders`} tone="positive" />
            <StatCard label="Cost of goods sold" value={fmtNpr(data.costOfGoodsSold)} sub={`${data.unitsSold} units sold`} />
            <StatCard label="Gross profit" value={fmtNpr(data.grossProfit)} sub={`${data.grossMarginPct}% margin`} tone="neutral" />
            <StatCard
              label="Net profit"
              value={fmtNpr(data.netProfit)}
              sub={`${data.netMarginPct}% net margin`}
              tone={data.netProfit >= 0 ? 'positive' : 'negative'}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-900">Income statement</h3>
              {[
                ['Sales revenue', data.revenue],
                ['Cost of goods sold', -data.costOfGoodsSold],
                ['Gross profit', data.grossProfit],
                ['Operating expenses', -data.operatingExpenses],
                ['Net profit', data.netProfit],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-3 text-sm border-b border-slate-100 pb-2">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-semibold tabular-nums ${amount < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {amount < 0 ? `(${fmtNpr(Math.abs(amount))})` : fmtNpr(amount)}
                  </span>
                </div>
              ))}
              <p className="text-xs text-slate-400 pt-1">
                Wholesale purchases in period: {fmtNpr(data.wholesalePurchases)} (inventory investment)
              </p>
            </div>

            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-900">Expenses by category</h3>
              {Object.keys(data.expensesByCategory || {}).length === 0 ? (
                <p className="text-sm text-slate-400">No overhead recorded in this period.</p>
              ) : (
                Object.entries(data.expensesByCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between gap-3 text-sm">
                    <span className="capitalize text-slate-600">{cat.replace('_', ' ')}</span>
                    <span className="font-semibold tabular-nums">{fmtNpr(amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
