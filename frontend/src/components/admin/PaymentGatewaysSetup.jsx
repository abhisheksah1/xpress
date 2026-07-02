import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import {
  GATEWAY_FIELD_DEFS,
  PAYMENT_CURRENCIES,
  mergeGatewayDefaults,
} from '../../config/paymentGateways.js';

function EnvToggle({ value, onChange }) {
  return (
    <div className="flex rounded overflow-hidden border border-gray-200 text-xs font-bold">
      <button
        type="button"
        onClick={() => onChange('sandbox')}
        className={`px-3 py-1.5 ${value === 'sandbox' ? 'bg-rose-500 text-white' : 'bg-white text-gray-500'}`}
      >
        SANDBOX
      </button>
      <button
        type="button"
        onClick={() => onChange('production')}
        className={`px-3 py-1.5 ${value === 'production' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-500'}`}
      >
        PRODUCTION
      </button>
    </div>
  );
}

function GatewayToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-6' : ''
        }`}
      />
    </button>
  );
}

function CurrencyPills({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PAYMENT_CURRENCIES.map((code) => {
        const active = selected.includes(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() =>
              onChange(active ? selected.filter((c) => c !== code) : [...selected, code])
            }
            className={`px-3 py-1 rounded text-xs font-semibold border ${
              active
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}

function GatewayPanel({ gateway, onChange, onUploadLogo }) {
  const fields = GATEWAY_FIELD_DEFS[gateway.type] || [];

  const set = (patch) => onChange({ ...gateway, ...patch });
  const setCred = (key, val) =>
    onChange({ ...gateway, credentials: { ...gateway.credentials, [key]: val } });

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/80 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500">
            SOL:
            <input
              type="number"
              min="0"
              className="ml-1 w-14 border border-gray-200 rounded px-2 py-1 text-sm"
              value={gateway.sortOrder ?? 0}
              onChange={(e) => set({ sortOrder: Number(e.target.value) })}
            />
          </label>
          <EnvToggle value={gateway.environment || 'sandbox'} onChange={(v) => set({ environment: v })} />
        </div>
        <GatewayToggle enabled={!!gateway.enabled} onChange={(v) => set({ enabled: v })} />
      </div>

      <div className="p-4 space-y-4">
        {fields.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            {fields.map((field) => {
              if (field.kind === 'select') {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</label>
                    <select
                      className="input-field text-sm"
                      value={gateway.credentials[field.key] || ''}
                      onChange={(e) => setCred(field.key, e.target.value)}
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.kind === 'textarea') {
                return (
                  <div key={field.key} className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</label>
                    <textarea
                      className="input-field text-sm"
                      rows={3}
                      value={gateway.credentials[field.key] || ''}
                      onChange={(e) => setCred(field.key, e.target.value)}
                    />
                  </div>
                );
              }

              if (field.kind === 'image') {
                return (
                  <div key={field.key} className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</label>
                    <div className="flex gap-2">
                      <input
                        className="input-field text-sm flex-1"
                        value={gateway.credentials[field.key] || ''}
                        onChange={(e) => setCred(field.key, e.target.value)}
                        placeholder="https://... or upload"
                      />
                      <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onUploadLogo(e.target.files?.[0], (url) => setCred(field.key, url))}
                        />
                      </label>
                    </div>
                    {gateway.credentials[field.key] && (
                      <img src={gateway.credentials[field.key]} alt="" className="mt-2 h-24 object-contain border rounded" />
                    )}
                  </div>
                );
              }

              return (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{field.label}</label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    className="input-field text-sm"
                    value={gateway.credentials[field.key] || ''}
                    onChange={(e) => setCred(field.key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Gateway Display Label</label>
            <input
              className="input-field text-sm"
              value={gateway.displayLabel || ''}
              onChange={(e) => set({ displayLabel: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Logo / Icon or Image</label>
            <div className="flex gap-2">
              <input
                className="input-field text-sm flex-1"
                value={gateway.logoUrl || ''}
                onChange={(e) => set({ logoUrl: e.target.value })}
                placeholder="Image URL"
              />
              <label className="btn-secondary text-sm cursor-pointer whitespace-nowrap">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUploadLogo(e.target.files?.[0], (url) => set({ logoUrl: url }))}
                />
              </label>
            </div>
            {gateway.logoUrl && (
              <img src={gateway.logoUrl} alt="" className="mt-2 h-10 object-contain" />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Active Currencies Selection</label>
          <CurrencyPills
            selected={gateway.currencies || []}
            onChange={(currencies) => set({ currencies })}
          />
          <p className="text-xs text-gray-400 mt-2">
            Only show this payment gateway during checkout if the customer&apos;s active billing currency matches.
            If no specific currencies are selected, it defaults to showing all.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentGatewaysSetup({ values, set }) {
  const [gateways, setGateways] = useState(() => mergeGatewayDefaults(values.payment_gateways));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGateways(mergeGatewayDefaults(values.payment_gateways));
  }, [values.payment_gateways]);

  const updateGateway = (index, next) => {
    setGateways((list) => list.map((g, i) => (i === index ? next : g)));
  };

  const uploadImage = async (file, onDone) => {
    if (!file) return;
    try {
      const { data } = await adminApi.uploadImage(file);
      onDone(data.data.url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sorted = [...gateways].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      await adminApi.bulkUpdateSettings([{ key: 'payment_gateways', value: sorted }]);
      set('payment_gateways', sorted);
      toast.success('Payment gateway state saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gateways');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Integrated Payment Gateway API Setup</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure each payment method with API credentials, display labels, logos, currency filters, and sandbox/production mode.
        </p>
      </div>

      <div className="space-y-5">
        {gateways.map((gateway, index) => (
          <GatewayPanel
            key={gateway.id}
            gateway={gateway}
            onChange={(next) => updateGateway(index, next)}
            onUploadLogo={uploadImage}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm tracking-wide disabled:opacity-60"
      >
        {saving ? 'SAVING...' : 'SAVE GATEWAY STATE'}
      </button>
    </div>
  );
}
