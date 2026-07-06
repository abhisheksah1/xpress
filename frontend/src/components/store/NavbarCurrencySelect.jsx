import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext.jsx';

export default function NavbarCurrencySelect() {
  const { currencies, displayCurrencyCode, setDisplayCurrencyCode, displayCurrency } = useStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!currencies?.length || currencies.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Display currency"
        title={displayCurrency?.name || 'Currency'}
      >
        <span>{displayCurrencyCode}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Choose display currency"
          className="absolute right-0 mt-1.5 min-w-[10rem] py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[60] max-h-64 overflow-y-auto"
        >
          {currencies.map((c) => {
            const active = c.code === displayCurrencyCode;
            return (
              <li key={c.code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayCurrencyCode(c.code);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3 hover:bg-gray-50 ${
                    active ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span>
                    <span className="font-semibold">{c.code}</span>
                    <span className="text-gray-500 font-normal ml-1.5">{c.symbol}</span>
                  </span>
                  {active && <span className="text-primary-600 text-xs">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
