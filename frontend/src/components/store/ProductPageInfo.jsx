export function ProductPageAlert({ message }) {
  if (!message?.trim()) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
      <span className="font-semibold uppercase text-[10px] tracking-wider text-amber-700 block mb-1">Notice</span>
      {message}
    </div>
  );
}

export function ProductDeliverySchedule({ schedules, disclaimer, tierLabel = 'Location Tier' }) {
  const rows = schedules || [];
  if (!rows.length) return null;

  return (
    <div className="rounded-2xl border-2 border-amber-400 overflow-hidden bg-amber-50 shadow-sm">
      <div className="bg-amber-400 px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
          <span aria-hidden>⚡</span>
          Product Delivery &amp; Availability Schedule
        </h2>
        {tierLabel && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-amber-300 px-2.5 py-1 rounded-full shrink-0">
            {tierLabel}
          </span>
        )}
      </div>

      <p className="px-4 py-2 text-[11px] text-slate-700 bg-amber-100/60 border-b border-amber-200 leading-relaxed">
        This table shows expected delivery windows by area. If your location or timing is not listed as available, you can still place an order — our team will confirm delivery with you.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm min-w-[720px]">
          <thead>
            <tr className="bg-amber-100/80 text-[10px] uppercase tracking-wider text-slate-700 border-b border-amber-300">
              <th className="px-3 py-2 font-bold">Delivery Group</th>
              <th className="px-3 py-2 font-bold">Coverage Area</th>
              <th className="px-3 py-2 font-bold">Delivery Method</th>
              <th className="px-3 py-2 font-bold">Estimated Delivery Time</th>
              <th className="px-3 py-2 font-bold">Cut-off Time</th>
              <th className="px-3 py-2 font-bold">Availability</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.groupId}
                className={`border-b border-amber-200/80 align-top ${row.available ? 'bg-amber-50/50' : 'bg-slate-50/80'}`}
              >
                <td className="px-3 py-3 font-bold text-slate-900">{row.groupName}</td>
                <td className="px-3 py-3 text-slate-700">{row.coverageText || '—'}</td>
                <td className="px-3 py-3 text-slate-700">{row.deliveryMethodLabel || '—'}</td>
                <td className="px-3 py-3 font-semibold text-slate-800">{row.estimatedTimeLabel || '—'}</td>
                <td className="px-3 py-3 font-bold text-slate-900">{row.cutoffTimeLabel || '—'}</td>
                <td className="px-3 py-3">
                  {row.available ? (
                    <span className="inline-flex text-[10px] font-bold uppercase tracking-wide text-emerald-800 bg-emerald-100 px-2 py-1 rounded-full">
                      Standard schedule
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-900 leading-snug block max-w-[180px]">
                      {row.availabilityLabel || 'Manual confirmation — order still accepted'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {disclaimer?.trim() && (
        <p className="px-4 py-3 text-[11px] text-slate-600 italic border-t border-amber-200 bg-amber-50/80 leading-relaxed">
          {disclaimer}
        </p>
      )}
    </div>
  );
}

export function ProductWhatsappHelp({ settings }) {
  const enabled = settings.product_whatsapp_help_enabled === true
    || settings.product_whatsapp_help_enabled === 'true';
  if (!enabled) return null;

  const plugins = settings.plugins_config || {};
  const rawNumber = settings.registry_helpdesk_whatsapp
    || plugins.whatsapp_number
    || settings.store_phone;
  if (!rawNumber) return null;

  const waUrl = `https://wa.me/${String(rawNumber).replace(/\D/g, '')}`;

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex gap-3">
        <span className="text-2xl shrink-0" aria-hidden>💬</span>
        <div>
          <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">
            {settings.product_whatsapp_help_title || 'WhatsApp Emergency Help & Customization'}
          </h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            {settings.product_whatsapp_help_description
              || 'Require immediate updates, custom note adjustments, or fast delivery coordination? Chat with our team instantly!'}
          </p>
        </div>
      </div>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-sm shrink-0 transition-colors"
      >
        <span aria-hidden>📞</span>
        {settings.product_whatsapp_help_button_text || 'WhatsApp Chat'}
      </a>
    </div>
  );
}

export function ProductShortTerms({ terms }) {
  if (!terms?.trim()) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">Short Terms &amp; Conditions</h3>
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">{terms}</p>
    </div>
  );
}
