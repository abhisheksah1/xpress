import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import {
  GATEWAY_FIELD_DEFS,
  mergeGatewayDefaults,
} from '../../config/paymentGateways.js';
import { getConfiguredCurrencyCodes } from '../../utils/currency.js';
import ImageSizeGuide from '../ImageSizeGuide.jsx';

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

function CurrencyPills({ selected, onChange, codes }) {
  const options = codes?.length ? codes : ['NPR'];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((code) => {
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

function NpsOnePgTools({ gateway, onSelectInstrument }) {
  const [urls, setUrls] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.getNpsUrls().then(({ data }) => setUrls(data.data)).catch(() => {});
  }, []);

  const credPayload = () => ({
    ...gateway.credentials,
    environment: gateway.environment,
  });

  const fetchInstruments = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getNpsInstruments(credPayload());
      const list = data.data || [];
      setInstruments(list);
      toast.success(`Found ${list.length} payment instrument(s)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch NPS instruments');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.testNpsConnection(credPayload());
      setInstruments(data.data?.instruments || []);
      toast.success(`NPS connected — ${data.data?.instrumentCount || 0} instrument(s)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'NPS connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-rose-900">NPS OnePG — Card Checkout</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={testConnection} disabled={loading} className="btn-secondary text-xs">
            Test Connection
          </button>
          <button type="button" onClick={fetchInstruments} disabled={loading} className="btn-secondary text-xs">
            Fetch Instruments
          </button>
        </div>
      </div>

      {urls && (
        <div className="text-xs text-gray-600 space-y-1 bg-white rounded border border-rose-100 p-3">
          <p><span className="font-semibold">Notification URL (webhook):</span> {urls.notificationUrl}</p>
          <p><span className="font-semibold">Response URL (customer):</span> {urls.responseUrl}</p>
          {urls.localDevWarning && (
            <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              {urls.localDevWarning}
            </p>
          )}
          <p className="text-gray-400 mt-1">Register both URLs with NPS during merchant setup. Response URL must match checkout redirect exactly.</p>
        </div>
      )}

      {instruments.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Select Instrument Code</label>
          <select
            className="input-field text-sm"
            value={gateway.credentials.instrumentCode || ''}
            onChange={(e) => onSelectInstrument(e.target.value)}
          >
            <option value="">— Customer chooses on gateway —</option>
            {instruments.map((item) => {
              const code = item.InstrumentCode || item.instrumentCode;
              const name = item.InstrumentName || item.instrumentName || code;
              return (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              );
            })}
          </select>
        </div>
      )}
    </div>
  );
}

function GatewayPanel({ gateway, onChange, onUploadLogo, currencyCodes }) {
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
                    <ImageSizeGuide guide="paymentLogo" variant="admin" className="rounded-lg border border-blue-100 mb-2" />
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

        {gateway.type === 'card' && (
          <NpsOnePgTools
            gateway={gateway}
            onSelectInstrument={(instrumentCode) =>
              onChange({ ...gateway, credentials: { ...gateway.credentials, instrumentCode } })
            }
          />
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
            <ImageSizeGuide guide="paymentLogo" variant="admin" className="rounded-lg border border-blue-100 mb-2" />
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
            codes={currencyCodes}
          />
          <p className="text-xs text-gray-400 mt-2">
            Currencies come from <strong>Multi-Currencies</strong> setup. Only show this gateway when the customer&apos;s billing currency matches.
            If none are selected, the gateway appears for all currencies.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentGatewaysSetup({ values, set }) {
  const [gateways, setGateways] = useState(() => mergeGatewayDefaults(values.payment_gateways));
  const [saving, setSaving] = useState(false);
  const currencyCodes = getConfiguredCurrencyCodes(values);

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
            currencyCodes={currencyCodes}
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
