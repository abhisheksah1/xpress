import { useState } from 'react';

export const fmtNpr = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-NP', { maximumFractionDigits: 2 })}`;

export const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export const TREASURY_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'mobile_wallet', label: 'Mobile wallet' },
  { value: 'other', label: 'Other' },
];

export const VENDOR_BILL_TYPES = [
  { value: 'pan', label: 'Pan Bill supplier' },
  { value: 'vat', label: 'VAT Bill supplier' },
  { value: 'normal', label: 'Normal Bill supplier' },
];

export const VENDOR_BILL_LABELS = {
  pan: 'Pan Bill',
  vat: 'VAT Bill',
  normal: 'Normal Bill',
};

export const vendorBillToPurchaseType = (billType) => {
  if (billType === 'vat') return 'vat_13';
  if (billType === 'normal') return 'normal_bill';
  return 'pan_bill';
};

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function ExportCsvButton({ onExport, label = 'Download CSV', className = '' }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onExport();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`btn-secondary text-sm shrink-0 inline-flex items-center gap-2 ${className}`}
    >
      <span aria-hidden>⬇</span>
      {loading ? 'Exporting...' : label}
    </button>
  );
}

export function DateRangeFilter({ startDate, endDate, onChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">Start date</label>
        <input
          type="date"
          className="input-field text-sm"
          value={startDate}
          onChange={(e) => onChange({ startDate: e.target.value, endDate })}
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 block mb-1">End date</label>
        <input
          type="date"
          className="input-field text-sm"
          value={endDate}
          onChange={(e) => onChange({ startDate, endDate: e.target.value })}
        />
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200',
    positive: 'border-emerald-200 bg-emerald-50/50',
    negative: 'border-rose-200 bg-rose-50/50',
    neutral: 'border-sky-200 bg-sky-50/50',
  };

  return (
    <div className={`card border ${tones[tone] || tones.default}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
