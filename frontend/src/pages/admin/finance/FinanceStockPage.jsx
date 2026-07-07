import { useEffect, useState } from 'react';
import { adminApi } from '../../../api/admin.js';
import { ExportCsvButton, StatCard, downloadBlob, fmtNpr } from './financeUtils.jsx';

export default function FinanceStockPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getFinanceStock({ search, lowStockOnly })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [search, lowStockOnly]);

  const exportCsv = async () => {
    const { data: blob } = await adminApi.exportFinanceStockCsv({ search, lowStockOnly });
    downloadBlob(blob, `stock-valuation-report.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="card flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Stock Report &amp; Valuation</h2>
          <p className="text-sm text-slate-500 mt-1">On-hand units valued at cost and retail price.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            className="input-field sm:max-w-xs"
            placeholder="Search SKU or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 shrink-0">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
          <ExportCsvButton onExport={exportCsv} />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading stock report...</p>
      ) : !data ? (
        <p className="text-slate-400">Unable to load stock data.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="SKUs" value={data.totals.skuCount} />
            <StatCard label="Total units" value={data.totals.totalUnits.toLocaleString()} />
            <StatCard label="Cost valuation" value={fmtNpr(data.totals.totalCostValue)} tone="neutral" />
            <StatCard label="Retail valuation" value={fmtNpr(data.totals.totalRetailValue)} tone="positive" />
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 border-b">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3 text-right">Stock</th>
                  <th className="py-2 pr-3 text-right">Cost</th>
                  <th className="py-2 pr-3 text-right">Retail</th>
                  <th className="py-2 pr-3 text-right">Cost value</th>
                  <th className="py-2 text-right">Retail value</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row._id} className={`border-b border-slate-100 ${row.isLowStock ? 'bg-amber-50/40' : ''}`}>
                    <td className="py-3 pr-3 font-medium">{row.name}</td>
                    <td className="py-3 pr-3 font-mono text-xs">{row.sku || '—'}</td>
                    <td className="py-3 pr-3">{row.category || '—'}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{row.stock}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{fmtNpr(row.costPrice)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums">{fmtNpr(row.retailPrice)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums font-semibold">{fmtNpr(row.costValue)}</td>
                    <td className="py-3 text-right tabular-nums">{fmtNpr(row.retailValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
