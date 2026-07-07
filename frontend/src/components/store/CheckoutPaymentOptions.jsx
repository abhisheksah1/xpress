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

export function CheckoutCurrencyToggle({ currencies, value, onChange, selectedCurrency }) {
  if (!currencies?.length) return null;

  const activeMeta = selectedCurrency || currencies.find((c) => c.code === value);
  const count = currencies.length;

  const gridClass =
    count <= 2
      ? 'grid-cols-2'
      : count <= 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : count <= 6
          ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 w-full min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-bold text-slate-900">Display currency</p>
          {activeMeta && (
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
              Prices and payment options for{' '}
              <span className="font-semibold text-slate-700">
                {activeMeta.name || activeMeta.code}
              </span>
              {activeMeta.symbol && activeMeta.symbol !== activeMeta.code ? (
                <span className="text-slate-400"> ({activeMeta.symbol})</span>
              ) : null}
            </p>
          )}
        </div>
        {activeMeta && (
          <span className="inline-flex self-start items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-slate-700 shrink-0">
            {activeMeta.code}
          </span>
        )}
      </div>

      <div
        className={`mt-3 grid ${gridClass} gap-2 w-full`}
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
              aria-label={`${c.name || c.code} (${c.code})`}
              onClick={() => onChange(c.code)}
              className={`min-w-0 w-full min-h-[44px] px-2 py-2.5 sm:py-2 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-colors border touch-manipulation ${
                active
                  ? 'text-white border-transparent shadow-sm'
                  : 'text-slate-900 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
              style={active ? { backgroundColor: 'var(--brand-primary, #e11d48)' } : undefined}
            >
              <span className="block truncate">{c.code}</span>
              {c.symbol && c.symbol !== c.code && (
                <span
                  className={`block truncate text-[10px] font-medium mt-0.5 ${
                    active ? 'text-white/90' : 'text-slate-400'
                  }`}
                >
                  {c.symbol}
                </span>
              )}
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
        <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2">Choose payment method</h3>
        <p className="text-sm text-slate-500">No payment options available for the selected currency.</p>
      </div>
    );
  }

  const sorted = [...gateways].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 w-full min-w-0">
      <h3 className="text-sm sm:text-base font-bold text-slate-900">Choose payment method</h3>
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5 sm:gap-3">
        {sorted.map((g) => {
          const selected = value === g.id;
          const label = g.displayLabel || PAYMENT_DISPLAY_LABELS[g.id] || g.id;

          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(g.id)}
              className={`relative rounded-xl border-2 px-3 py-3.5 sm:px-4 sm:py-5 min-h-[5.5rem] sm:min-h-[7.5rem] w-full min-w-0 flex flex-col items-center justify-center gap-2 sm:gap-3 text-center transition-colors touch-manipulation ${
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
              <span className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug px-1 break-words hyphens-auto max-w-full">
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
