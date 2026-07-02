const PAYMENT_DISPLAY_LABELS = {
  card: 'Visa Card & Master Card',
  hbl: 'HBL Card',
  manual_bank: 'Manual Bank Transfer / QR Pay',
  esewa: 'eSewa Wallet Payment',
  khalti: 'Khalti Mobile Wallet',
  fonepay: 'QR Payment',
  imepay: 'IME Pay',
  cod: 'Cash on Delivery',
};

function PaymentFallbackIcon({ id }) {
  const label = (PAYMENT_DISPLAY_LABELS[id] || id || '?').charAt(0).toUpperCase();
  return (
    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-slate-300 flex items-center justify-center text-sm sm:text-lg font-bold text-slate-500">
      {id === 'manual_bank' ? '!' : label}
    </div>
  );
}

export function CheckoutCurrencyToggle({ currencies, value, onChange }) {
  if (!currencies?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <span className="text-sm sm:text-base font-bold text-slate-900">Display Currency</span>
      <div
        className="inline-flex flex-wrap items-center rounded-full border border-slate-900 p-1 gap-0.5"
        role="radiogroup"
        aria-label="Display currency"
      >
        {currencies.map((c) => {
          const active = value === c.code;
          return (
            <button
              key={c.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(c.code)}
              className={`min-w-[3.25rem] px-4 sm:px-5 py-2 rounded-full text-sm font-bold transition-colors ${
                active
                  ? 'text-white shadow-sm'
                  : 'text-slate-900 bg-white hover:bg-slate-50'
              }`}
              style={active ? { backgroundColor: 'var(--brand-primary, #e11d48)' } : undefined}
            >
              {c.code}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CheckoutPaymentGrid({ gateways, value, onChange }) {
  if (!gateways?.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2">Choose Payment Method</h3>
        <p className="text-sm text-slate-500">No payment options available for the selected currency.</p>
      </div>
    );
  }

  const sorted = [...gateways].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
      <h3 className="text-sm sm:text-base font-bold text-slate-900">Choose Payment Method</h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {sorted.map((g) => {
          const selected = value === g.id;
          const label = g.displayLabel || PAYMENT_DISPLAY_LABELS[g.id] || g.id;

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(g.id)}
              className={`relative rounded-xl border-2 px-2 py-3 sm:px-4 sm:py-5 min-h-[6.5rem] sm:min-h-[7.5rem] flex flex-col items-center justify-center gap-2 sm:gap-3 text-center transition-colors ${
                selected
                  ? 'border-[var(--brand-primary,#e11d48)] bg-rose-50/60'
                  : 'border-slate-900 bg-white hover:bg-slate-50/80'
              }`}
            >
              {selected && (
                <span
                  className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 w-4 h-4 sm:w-5 sm:h-5 rounded-sm flex items-center justify-center text-white text-[10px] sm:text-xs font-bold"
                  style={{ backgroundColor: 'var(--brand-primary, #e11d48)' }}
                  aria-hidden
                >
                  ✓
                </span>
              )}
              {g.logoUrl ? (
                <img src={g.logoUrl} alt="" className="h-8 sm:h-10 w-auto max-w-[90px] sm:max-w-[120px] object-contain" />
              ) : (
                <PaymentFallbackIcon id={g.id} />
              )}
              <span className="text-[10px] sm:text-sm font-semibold text-slate-900 leading-snug px-0.5 sm:px-1">
                {label}
              </span>
              {g.environment === 'sandbox' && (
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Sandbox</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
