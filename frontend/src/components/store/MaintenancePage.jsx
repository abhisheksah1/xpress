import { useMemo } from 'react';
import WhatsAppIcon from './WhatsAppIcon.jsx';
import { buildWhatsAppChatUrl, resolveWhatsAppNumber } from '../../utils/whatsapp.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const URGENT_MESSAGE =
  'Hi KoseliXpress CSR, I need urgent order / support help while the website is under maintenance.';

export default function MaintenancePage({ settings = {}, message }) {
  const brandName =
    settings.registry_company_name
    || settings.store_name
    || 'KoseliXpress';

  const logoUrl = resolveMediaUrl(settings.logo_url);
  const whatsappNumber = resolveWhatsAppNumber(settings);
  const waUrl = useMemo(
    () => (whatsappNumber ? buildWhatsAppChatUrl(whatsappNumber, URGENT_MESSAGE) : null),
    [whatsappNumber]
  );

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#FFF7F5]">
      {/* Atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(225,29,72,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(37,211,102,0.12), transparent 50%), radial-gradient(ellipse 40% 35% at 0% 80%, rgba(251,191,36,0.12), transparent 45%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23e11d48\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brandName}
            className="mb-6 h-14 w-auto max-w-[220px] object-contain drop-shadow-sm animate-[fadeRise_0.6s_ease-out]"
          />
        ) : (
          <p className="mb-4 font-serif text-3xl font-bold tracking-tight text-rose-700 animate-[fadeRise_0.6s_ease-out]">
            {brandName}
          </p>
        )}

        <div className="w-full rounded-3xl border border-rose-100/80 bg-white/80 p-8 shadow-[0_20px_60px_-28px_rgba(225,29,72,0.35)] backdrop-blur-md animate-[fadeRise_0.7s_ease-out]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
            <span className="text-3xl" aria-hidden>🛠️</span>
          </div>

          <h1 className="mb-3 font-serif text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            We&apos;ll be back shortly
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600 whitespace-pre-line sm:text-base">
            {message}
          </p>

          {waUrl && (
            <div className="mt-8 border-t border-rose-100 pt-7">
              <p className="mb-1 text-sm font-semibold text-slate-800">
                Need an urgent order or support?
              </p>
              <p className="mb-5 text-xs leading-relaxed text-slate-500">
                Message our CSR on WhatsApp for urgent orders and help while the site is updating.
              </p>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] hover:bg-[#20BD5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 sm:w-auto sm:min-w-[260px]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white/30">
                  <WhatsAppIcon className="h-5 w-5" />
                </span>
                WhatsApp CSR — Urgent help
              </a>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-400 animate-[fadeRise_0.9s_ease-out]">
          Thank you for your patience · {brandName}
        </p>
      </div>

      <style>{`
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
