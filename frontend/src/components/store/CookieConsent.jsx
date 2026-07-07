import { useState } from 'react';
import { useStore } from '../../context/StoreContext.jsx';

export default function CookieConsent() {
  const { settings } = useStore();
  const enabled = settings.cookie_notice_enabled === true || settings.cookie_notice_enabled === 'true';
  const text = settings.cookie_notice_text || 'We use cookies to improve your experience. By continuing, you accept our cookie policy.';
  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('koseli_cookie_consent') === 'accepted';
  });

  if (!enabled || dismissed) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto rounded-xl border border-slate-200 bg-white shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-slate-600 flex-1">{text}</p>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => {
            localStorage.setItem('koseli_cookie_consent', 'accepted');
            setDismissed(true);
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
