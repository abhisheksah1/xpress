import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { Field, SectionCard, Toggle, saveSection } from './shared.jsx';
import PaymentGatewaysSetup from '../PaymentGatewaysSetup.jsx';
import ImageSizeGuide from '../../ImageSizeGuide.jsx';
import CmsImagePicker from '../CmsImagePicker.jsx';

const REGISTRY_KEYS = [
  'registry_company_name',
  'registry_support_email',
  'registry_helpdesk_whatsapp',
  'registry_fulfillment_address',
  'registry_base_currency',
  'registry_invoice_prefix',
];

export function StoreRegistrySection({ values, set }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const keys = [...REGISTRY_KEYS, 'store_name', 'currency', 'currency_symbol'];
      const payload = keys.map((key) => {
        let value = values[key];
        if (key === 'store_name') value = values.registry_company_name;
        if (key === 'currency') value = values.registry_base_currency;
        if (key === 'currency_symbol' && values.registry_base_currency === 'NPR') value = 'Rs.';
        return { key, value };
      });
      const { adminApi } = await import('../../../api/admin.js');
      await adminApi.bulkUpdateSettings(payload);
      set('store_name', values.registry_company_name);
      set('currency', values.registry_base_currency);
      toast.success('Store registry identities saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Store Registry Identities"
      description="Core business identity used on invoices, emails, and customer-facing support channels."
      onSave={handleSave}
      saving={saving}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Company / Store Name">
          <input
            className="input-field"
            value={values.registry_company_name || ''}
            onChange={(e) => set('registry_company_name', e.target.value)}
            placeholder="Koseli Xpress Pvt. Ltd."
          />
        </Field>
        <Field label="Support Email Address">
          <input
            type="email"
            className="input-field"
            value={values.registry_support_email || ''}
            onChange={(e) => set('registry_support_email', e.target.value)}
            placeholder="support@koselixpress.com"
          />
        </Field>
        <Field
          label="Helpdesk WhatsApp Support Contact Number"
          hint="Used for direct customer help/emergency WhatsApp messages."
        >
          <input
            className="input-field"
            value={values.registry_helpdesk_whatsapp || ''}
            onChange={(e) => set('registry_helpdesk_whatsapp', e.target.value)}
            placeholder="+977 1 4455888"
          />
        </Field>
        <Field label="System Base Currency">
          <select
            className="input-field"
            value={values.registry_base_currency || 'NPR'}
            onChange={(e) => set('registry_base_currency', e.target.value)}
          >
            {['NPR', 'USD', 'INR', 'EUR', 'GBP'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Invoice Reference Prefix">
          <input
            className="input-field"
            value={values.registry_invoice_prefix || ''}
            onChange={(e) => set('registry_invoice_prefix', e.target.value)}
            placeholder="KO-"
          />
        </Field>
      </div>
      <Field label="Fulfillment Base Address">
        <textarea
          className="input-field"
          rows={3}
          value={values.registry_fulfillment_address || ''}
          onChange={(e) => set('registry_fulfillment_address', e.target.value)}
          placeholder="Warehouse / dispatch center address"
        />
      </Field>
    </SectionCard>
  );
}

export function MaintenanceSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const keys = ['maintenance_enabled', 'maintenance_message'];

  return (
    <SectionCard
      title="Customer Maintenance Mode"
      description="Disable the customer website while you update products, prices, or content. Admin remains accessible."
      onSave={() => saveSection(keys, values, setSaving)}
      saving={saving}
    >
      <Toggle
        label="Enable Maintenance Mode"
        checked={values.maintenance_enabled}
        onChange={(v) => set('maintenance_enabled', v)}
        hint="When enabled, the customer website is hidden. Staff can still sign in at /admin/login and use the admin panel."
      />
      <Field label="Maintenance Message">
        <textarea
          className="input-field"
          rows={4}
          value={values.maintenance_message || ''}
          onChange={(e) => set('maintenance_message', e.target.value)}
          placeholder="We are under maintenance. Please check back soon."
        />
      </Field>
    </SectionCard>
  );
}

const DEFAULT_LANDING_POPUP = {
  enabled: false,
  mode: 'text',
  title: '',
  text: '',
  imageUrl: '',
  buttonText: 'Learn more',
  redirectUrl: '',
  version: '1',
};

export function LandingPopupSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const popup = { ...DEFAULT_LANDING_POPUP, ...(values.landing_popup || {}) };
  const setPopup = (patch) => set('landing_popup', { ...popup, ...patch });
  const imageImages = popup.imageUrl ? [{ url: popup.imageUrl, alt: popup.title || 'Popup notice' }] : [];
  const showTextFields = popup.mode === 'text' || popup.mode === 'image_text';
  const showImageField = popup.mode === 'image' || popup.mode === 'image_text';

  return (
    <SectionCard
      title="Landing Page Popup"
      description="Show a dismissible notice on the storefront homepage. Choose text only, image only, or image with text. Optionally link to any URL."
      onSave={() => saveSection(['landing_popup'], values, setSaving)}
      saving={saving}
    >
      <Toggle
        label="Enable landing popup"
        checked={popup.enabled}
        onChange={(v) => setPopup({ enabled: v })}
        hint="Popup appears only on the homepage (/). Visitors can close it; change the version below to show it again."
      />
      <Field label="Content type">
        <select
          className="input-field"
          value={popup.mode}
          onChange={(e) => setPopup({ mode: e.target.value })}
        >
          <option value="text">Text only</option>
          <option value="image">Image only</option>
          <option value="image_text">Image and text</option>
        </select>
      </Field>
      {showTextFields && (
        <>
          <Field label="Title">
            <input
              className="input-field"
              value={popup.title}
              onChange={(e) => setPopup({ title: e.target.value })}
              placeholder="Optional headline"
            />
          </Field>
          <Field label="Message">
            <textarea
              className="input-field"
              rows={4}
              value={popup.text}
              onChange={(e) => setPopup({ text: e.target.value })}
              placeholder="Your announcement or promotion text"
            />
          </Field>
        </>
      )}
      {showImageField && (
        <Field label="Popup image">
          <CmsImagePicker
            mode="single"
            guideKey="landingPopup"
            images={imageImages}
            onChange={(imgs) => setPopup({ imageUrl: imgs[0]?.url || '' })}
            alt={popup.title || 'Popup notice'}
          />
        </Field>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Button label">
          <input
            className="input-field"
            value={popup.buttonText}
            onChange={(e) => setPopup({ buttonText: e.target.value })}
            placeholder="Learn more"
          />
        </Field>
        <Field label="Redirect URL">
          <input
            className="input-field"
            value={popup.redirectUrl}
            onChange={(e) => setPopup({ redirectUrl: e.target.value })}
            placeholder="/shop or https://example.com"
          />
        </Field>
      </div>
      <Field
        label="Popup version"
        hint="Change this (e.g. 2, summer-sale) after updating content so returning visitors see the popup again."
      >
        <input
          className="input-field max-w-xs"
          value={popup.version}
          onChange={(e) => setPopup({ version: e.target.value })}
          placeholder="1"
        />
      </Field>
    </SectionCard>
  );
}

export function MultiCurrenciesSection({ values, set, setValues }) {
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const data = values.multi_currencies || { currencies: [] };
  const currencies = data.currencies || [];
  const lastSync = values.currency_nrb_last_sync || {};

  const updateCurrency = (i, field, val) => {
    const next = [...currencies];
    const patch = { [field]: val };
    if (field === 'rate' || field === 'nprPerUnit') {
      patch.manualOverride = true;
      patch.source = 'manual';
    }
    next[i] = { ...next[i], ...patch };
    if (field === 'isDefault' && val) {
      next.forEach((c, j) => { next[j] = { ...next[j], isDefault: j === i }; });
    }
    set('multi_currencies', { ...data, currencies: next });
  };

  const addCurrency = () => {
    set('multi_currencies', {
      ...data,
      currencies: [...currencies, {
        code: '',
        name: '',
        symbol: '',
        rate: 1,
        enabled: true,
        isDefault: false,
        manualOverride: true,
        source: 'manual',
      }],
    });
  };

  const removeCurrency = (i) => {
    set('multi_currencies', { ...data, currencies: currencies.filter((_, j) => j !== i) });
  };

  const handleSave = () => saveSection(
    ['multi_currencies', 'auto_convert_prices', 'currency_nrb_auto_sync'],
    values,
    setSaving
  );

  const handleSyncNrb = async () => {
    setSyncing(true);
    try {
      const { data: res } = await adminApi.syncNrbRates();
      const result = res.data;
      if (setValues) {
        setValues((prev) => ({
          ...prev,
          multi_currencies: { ...prev.multi_currencies, currencies: result.currencies },
          currency_nrb_last_sync: {
            at: result.at,
            date: result.date,
            publishedOn: result.publishedOn,
            modifiedOn: result.modifiedOn,
            updated: result.updated,
            message: result.message,
            error: false,
          },
        }));
      } else {
        set('multi_currencies', { ...data, currencies: result.currencies });
        set('currency_nrb_last_sync', {
          at: result.at,
          date: result.date,
          publishedOn: result.publishedOn,
          modifiedOn: result.modifiedOn,
          updated: result.updated,
          message: result.message,
        });
      }
      toast.success(result.message || 'Rates synced from NRB');
    } catch (err) {
      toast.error(err.response?.data?.message || 'NRB sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const formatSyncTime = (iso) => {
    if (!iso) return 'Never';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <SectionCard
      title="Multi-Currencies"
      description="Configure supported currencies. Rates can be synced from Nepal Rastra Bank (NRB) or set manually."
      onSave={handleSave}
      saving={saving}
    >
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-blue-900">NRB Official FOREX Rates</p>
            <p className="text-xs text-blue-700 mt-1">
              Source:{' '}
              <a
                href="https://www.nrb.org.np/api-docs-v1/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Nepal Rastra Bank API
              </a>
              {' '}— auto-refreshes every hour when enabled.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncNrb}
            disabled={syncing}
            className="btn-primary text-sm whitespace-nowrap"
          >
            {syncing ? 'Syncing...' : 'Sync Now from NRB'}
          </button>
        </div>
        <div className="text-xs text-blue-800 grid sm:grid-cols-2 gap-1">
          <span>Last sync: {formatSyncTime(lastSync.at)}</span>
          <span>NRB date: {lastSync.date || '—'}</span>
          <span>Updated currencies: {lastSync.updated ?? 0}</span>
          <span className={lastSync.error ? 'text-red-600' : ''}>{lastSync.message || 'Not synced yet'}</span>
        </div>
        <Toggle
          label="Auto-sync from NRB every 1 hour"
          hint="When enabled, rates update automatically in the background. Locked (manual) currencies are skipped."
          checked={values.currency_nrb_auto_sync !== false}
          onChange={(v) => set('currency_nrb_auto_sync', v)}
        />
      </div>

      <Toggle label="Auto-convert product prices" checked={values.auto_convert_prices} onChange={(v) => set('auto_convert_prices', v)} />

      <p className="text-xs text-gray-500">
        Rate = foreign units per 1 NPR. NPR per unit is shown for reference. Lock a currency to keep a manual rate during NRB sync.
      </p>

      <div className="space-y-3">
        {currencies.map((c, i) => (
          <div key={i} className="p-3 border border-gray-100 rounded-lg space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <Field label="Code">
                <input className="input-field text-sm" value={c.code} onChange={(e) => updateCurrency(i, 'code', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Name">
                <input className="input-field text-sm" value={c.name} onChange={(e) => updateCurrency(i, 'name', e.target.value)} />
              </Field>
              <Field label="Symbol">
                <input className="input-field text-sm" value={c.symbol} onChange={(e) => updateCurrency(i, 'symbol', e.target.value)} />
              </Field>
              <Field label="Rate (per NPR)" hint={c.nprPerUnit ? `≈ ${c.nprPerUnit} NPR per ${c.code}` : undefined}>
                <input
                  type="number"
                  step="0.00000001"
                  className="input-field text-sm"
                  value={c.rate}
                  onChange={(e) => updateCurrency(i, 'rate', Number(e.target.value))}
                  disabled={c.code === 'NPR'}
                />
              </Field>
              <Toggle label="Enabled" checked={c.enabled} onChange={(v) => updateCurrency(i, 'enabled', v)} />
              <div className="flex flex-col gap-2">
                <Toggle label="Default" checked={c.isDefault} onChange={(v) => updateCurrency(i, 'isDefault', v)} />
                {c.code !== 'NPR' && (
                  <Toggle
                    label="Lock rate (manual)"
                    checked={!!c.manualOverride}
                    onChange={(v) => updateCurrency(i, 'manualOverride', v)}
                  />
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span>
                Source: {c.source || 'manual'}
                {c.syncedAt ? ` · synced ${formatSyncTime(c.syncedAt)}` : ''}
                {c.buyRate ? ` · NRB buy ${c.buyRate}` : ''}
              </span>
              {c.code !== 'NPR' && (
                <button type="button" onClick={() => removeCurrency(i)} className="text-red-500">Remove</button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addCurrency} className="btn-secondary text-sm">+ Add Currency</button>
    </SectionCard>
  );
}

export function ServiceAddonsSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const addons = values.service_addons || [];

  const INPUT_TYPE_OPTIONS = [
    { value: 'none', label: 'None (no extra info)' },
    { value: 'text', label: 'Collect text' },
    { value: 'photo', label: 'Collect photo' },
    { value: 'both', label: 'Collect text & photo' },
  ];

  const update = (i, field, val) => {
    const next = [...addons];
    next[i] = { ...next[i], [field]: val };
    set('service_addons', next);
  };

  const add = () => set('service_addons', [...addons, {
    id: `addon_${Date.now()}`,
    name: '',
    price: 0,
    description: '',
    enabled: true,
    inputType: 'none',
  }]);
  const remove = (i) => set('service_addons', addons.filter((_, j) => j !== i));

  return (
    <SectionCard title="Service Add-ons" description="Optional extras customers can add at checkout. Choose whether to collect text, photo, or both per add-on." onSave={() => saveSection(['service_addons'], values, setSaving)} saving={saving}>
      {addons.map((a, i) => (
        <div key={a.id || i} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 border border-gray-100 rounded-lg">
          <Field label="Name"><input className="input-field text-sm" value={a.name} onChange={(e) => update(i, 'name', e.target.value)} /></Field>
          <Field label="Price (NPR)"><input type="number" className="input-field text-sm" value={a.price} onChange={(e) => update(i, 'price', Number(e.target.value))} /></Field>
          <Field label="Customer input">
            <select className="input-field text-sm" value={a.inputType || 'none'} onChange={(e) => update(i, 'inputType', e.target.value)}>
              {INPUT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Description"><input className="input-field text-sm" value={a.description} onChange={(e) => update(i, 'description', e.target.value)} /></Field>
          <Toggle label="Enabled" checked={a.enabled} onChange={(v) => update(i, 'enabled', v)} />
          <button type="button" onClick={() => remove(i)} className="text-red-500 text-sm self-end">Remove</button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary text-sm">+ Add Service</button>
    </SectionCard>
  );
}

export function DeliveryPricingSection({ values, set }) {
  const [saving, setSaving] = useState(false);

  const saveFees = () => saveSection(['default_delivery_fee', 'free_shipping_threshold', 'same_day_fee', 'handling_fee'], values, setSaving);

  return (
    <div className="space-y-6">
      <SectionCard title="Delivery Fees" description="Global delivery pricing rules applied at checkout." onSave={saveFees} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Default Delivery Fee (NPR)"><input type="number" className="input-field" value={values.default_delivery_fee ?? ''} onChange={(e) => set('default_delivery_fee', Number(e.target.value))} /></Field>
          <Field label="Free Shipping Above (NPR)"><input type="number" className="input-field" value={values.free_shipping_threshold ?? ''} onChange={(e) => set('free_shipping_threshold', Number(e.target.value))} /></Field>
          <Field label="Same-Day Surcharge (NPR)"><input type="number" className="input-field" value={values.same_day_fee ?? ''} onChange={(e) => set('same_day_fee', Number(e.target.value))} /></Field>
          <Field label="Handling Fee (NPR)"><input type="number" className="input-field" value={values.handling_fee ?? ''} onChange={(e) => set('handling_fee', Number(e.target.value))} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Delivery Groups & Locations" description="Configure delivery areas, location fees, and delivery times per group.">
        <p className="text-sm text-gray-600">
          Delivery groups (e.g. Kathmandu Valley) contain multiple locations, each with optional fee overrides.
          Products and categories can be restricted to specific groups with same-day and custom delivery day rules.
        </p>
        <a href="/admin/delivery" className="btn-primary inline-block text-sm mt-2">Open Delivery Groups Manager</a>
      </SectionCard>
    </div>
  );
}

export function PaymentGatewaysSection({ values, set }) {
  return (
    <div className="card">
      <PaymentGatewaysSetup values={values} set={set} />
    </div>
  );
}

export function PluginsSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const plugins = values.plugins_config || {};
  const setPlugin = (key, val) => set('plugins_config', { ...plugins, [key]: val });

  return (
    <SectionCard title="Plugins Config" description="Analytics, chat widgets, and third-party integrations." onSave={() => saveSection(['plugins_config'], values, setSaving)} saving={saving}>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Google Analytics ID"><input className="input-field" value={plugins.google_analytics_id || ''} onChange={(e) => setPlugin('google_analytics_id', e.target.value)} placeholder="G-XXXXXXXX" /></Field>
        <Field label="Google Tag Manager ID"><input className="input-field" value={plugins.google_tag_manager_id || ''} onChange={(e) => setPlugin('google_tag_manager_id', e.target.value)} /></Field>
        <Field label="Facebook Pixel ID"><input className="input-field" value={plugins.facebook_pixel_id || ''} onChange={(e) => setPlugin('facebook_pixel_id', e.target.value)} /></Field>
        <Field label="Hotjar ID"><input className="input-field" value={plugins.hotjar_id || ''} onChange={(e) => setPlugin('hotjar_id', e.target.value)} /></Field>
        <Field label="WhatsApp Number" hint="Used for the storefront chat button and product WhatsApp help. Include country code or a 10-digit Nepal mobile (e.g. 98XXXXXXXX).">
          <input className="input-field" value={plugins.whatsapp_number || ''} onChange={(e) => setPlugin('whatsapp_number', e.target.value)} placeholder="97798XXXXXXXX" />
        </Field>
        <Field label="Messenger Page ID"><input className="input-field" value={plugins.messenger_page_id || ''} onChange={(e) => setPlugin('messenger_page_id', e.target.value)} /></Field>
      </div>
      <Toggle label="Enable WhatsApp Chat Button" checked={plugins.whatsapp_chat_enabled} onChange={(v) => setPlugin('whatsapp_chat_enabled', v)} />
      <Field label="Custom Head Scripts" hint="Injected in storefront <head>"><textarea className="input-field font-mono text-xs" rows={4} value={plugins.custom_head_scripts || ''} onChange={(e) => setPlugin('custom_head_scripts', e.target.value)} /></Field>
    </SectionCard>
  );
}

export function BrandingSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const keys = ['logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'accent_color', 'font_family', 'header_style', 'button_style', 'store_layout', 'hero_style'];

  const logoImages = values.logo_url ? [{ url: values.logo_url, alt: 'Store logo' }] : [];
  const faviconImages = values.favicon_url ? [{ url: values.favicon_url, alt: 'Favicon' }] : [];

  return (
    <SectionCard title="Branding & Layout Config" description="10 core visual settings for your storefront." onSave={() => saveSection(keys, values, setSaving)} saving={saving}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Logo" hint="Site-wide logo for header, footer, and SEO fallbacks. Saved here overrides navbar logo URLs.">
            <CmsImagePicker
              mode="single"
              guideKey="logo"
              images={logoImages}
              onChange={(imgs) => set('logo_url', imgs[0]?.url || '')}
              alt="Store logo"
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Favicon" hint="Browser tab icon. Square PNG or ICO works best.">
            <CmsImagePicker
              mode="single"
              guideKey="favicon"
              images={faviconImages}
              onChange={(imgs) => set('favicon_url', imgs[0]?.url || '')}
              alt="Favicon"
            />
          </Field>
        </div>
        <Field label="Primary Color"><input type="color" className="h-10 w-full" value={values.primary_color || '#E11D48'} onChange={(e) => set('primary_color', e.target.value)} /></Field>
        <Field label="Secondary Color"><input type="color" className="h-10 w-full" value={values.secondary_color || '#1E293B'} onChange={(e) => set('secondary_color', e.target.value)} /></Field>
        <Field label="Accent Color"><input type="color" className="h-10 w-full" value={values.accent_color || '#F59E0B'} onChange={(e) => set('accent_color', e.target.value)} /></Field>
        <Field label="Font Family">
          <select className="input-field" value={values.font_family || 'Inter'} onChange={(e) => set('font_family', e.target.value)}>
            {['Inter', 'Poppins', 'Roboto', 'Open Sans', 'Lato'].map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Header Style">
          <select className="input-field" value={values.header_style || 'sticky'} onChange={(e) => set('header_style', e.target.value)}>
            <option value="sticky">Sticky</option>
            <option value="static">Static</option>
          </select>
        </Field>
        <Field label="Button Style">
          <select className="input-field" value={values.button_style || 'rounded'} onChange={(e) => set('button_style', e.target.value)}>
            <option value="rounded">Rounded</option>
            <option value="square">Square</option>
          </select>
        </Field>
        <Field label="Store Layout">
          <select className="input-field" value={values.store_layout || 'wide'} onChange={(e) => set('store_layout', e.target.value)}>
            <option value="wide">Wide</option>
            <option value="boxed">Boxed</option>
          </select>
        </Field>
        <Field label="Hero Style">
          <select className="input-field" value={values.hero_style || 'gradient'} onChange={(e) => set('hero_style', e.target.value)}>
            <option value="gradient">Gradient</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </Field>
      </div>
    </SectionCard>
  );
}

export function ComplianceSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const keys = ['terms_url', 'privacy_url', 'cookie_notice_enabled', 'cookie_notice_text', 'company_registration', 'vat_number', 'footer_copyright', 'footer_disclaimer'];

  return (
    <SectionCard title="Compliance & Footer" description="Legal links, cookie notice, and footer text." onSave={() => saveSection(keys, values, setSaving)} saving={saving}>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Terms URL"><input className="input-field" value={values.terms_url || ''} onChange={(e) => set('terms_url', e.target.value)} /></Field>
        <Field label="Privacy URL"><input className="input-field" value={values.privacy_url || ''} onChange={(e) => set('privacy_url', e.target.value)} /></Field>
        <Field label="Company Registration"><input className="input-field" value={values.company_registration || ''} onChange={(e) => set('company_registration', e.target.value)} /></Field>
        <Field label="VAT / PAN Number"><input className="input-field" value={values.vat_number || ''} onChange={(e) => set('vat_number', e.target.value)} /></Field>
      </div>
      <Toggle label="Show Cookie Notice" checked={values.cookie_notice_enabled} onChange={(v) => set('cookie_notice_enabled', v)} />
      <Field label="Cookie Notice Text"><input className="input-field" value={values.cookie_notice_text || ''} onChange={(e) => set('cookie_notice_text', e.target.value)} /></Field>
      <Field label="Footer Copyright"><input className="input-field" value={values.footer_copyright || ''} onChange={(e) => set('footer_copyright', e.target.value)} /></Field>
      <Field label="Footer Disclaimer"><textarea className="input-field" rows={2} value={values.footer_disclaimer || ''} onChange={(e) => set('footer_disclaimer', e.target.value)} /></Field>
    </SectionCard>
  );
}

export function TimeSlotsSection() {
  return (
    <SectionCard title="Delivery Time Slots" description="Time slots are configured per delivery location (not globally).">
      <p className="text-sm text-gray-600">
        To choose which cities allow time slot selection (e.g. Kathmandu, Pokhara) and set an additional fee per slot,
        open the Delivery Setup page and edit each location.
      </p>
      <a href="/admin/delivery" className="btn-primary inline-block text-sm mt-3">Open Delivery Setup</a>
      <p className="text-xs text-gray-400 mt-3">
        Customers see slot fees at checkout. If no slot is chosen, only the base delivery fee applies.
      </p>
    </SectionCard>
  );
}

export function AdminCredentialsSection() {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getProfile().then((res) => setProfile({ name: res.data.data.name, email: res.data.data.email, phone: res.data.data.phone || '' }));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await adminApi.updateProfile({ name: profile.name, phone: profile.phone });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (passwords.newPassword !== passwords.confirm) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await adminApi.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Admin User Credentials" description="Update your admin profile and password." onSave={saveProfile} saving={saving}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Name"><input className="input-field" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Email"><input className="input-field bg-gray-50" value={profile.email} disabled /></Field>
          <Field label="Phone"><input className="input-field" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Change Password" onSave={savePassword} saving={saving}>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Current Password"><input type="password" className="input-field" value={passwords.currentPassword} onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
          <Field label="New Password"><input type="password" className="input-field" value={passwords.newPassword} onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))} /></Field>
          <Field label="Confirm Password"><input type="password" className="input-field" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} /></Field>
        </div>
      </SectionCard>
    </div>
  );
}

export function SmtpSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const templates = values.email_templates || {};

  const setTemplate = (key, field, val) => {
    set('email_templates', { ...templates, [key]: { ...templates[key], [field]: val } });
  };

  const emailKeys = ['brevo_api_key', 'email_from', 'email_templates'];

  const sendTest = async () => {
    if (!testEmail) return toast.error('Enter test email');
    setTesting(true);
    try {
      await adminApi.bulkUpdateSettings(emailKeys.map((key) => ({ key, value: values[key] })));
      await adminApi.testSmtp(testEmail);
      toast.success('Test email sent via Brevo');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Brevo test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Brevo Configuration"
        description="Transactional email via Brevo API. Used for admin login OTP codes, order emails, and reminders. Create an API key under Brevo → SMTP & API → API Keys. The From address must be a verified sender."
        onSave={() => saveSection(emailKeys.filter((k) => k !== 'email_templates').concat(['email_templates']), values, setSaving)}
        saving={saving}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Brevo API Key">
            <input
              type="password"
              className="input-field"
              value={values.brevo_api_key || ''}
              onChange={(e) => set('brevo_api_key', e.target.value)}
              placeholder="xkeysib-..."
              autoComplete="off"
            />
          </Field>
          <Field label="From Address">
            <input
              className="input-field"
              value={values.email_from || ''}
              onChange={(e) => set('email_from', e.target.value)}
              placeholder="KoseliXpress <noreply@yourdomain.com>"
            />
          </Field>
        </div>
        <div className="flex gap-2 items-end pt-2">
          <Field label="Send Test Email">
            <input className="input-field" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <button type="button" onClick={sendTest} disabled={testing} className="btn-secondary mb-0">{testing ? 'Sending...' : 'Send Test'}</button>
        </div>
      </SectionCard>
      <SectionCard title="Email Templates" description="Order confirmation placeholders: {{customer_name}}, {{order_number}}, {{total}}, {{tracking_url}}, {{payment_pending_note}}, {{payment_instructions}}, {{support_email}}, {{support_whatsapp}}. Also {{reset_link}} for password reset." onSave={() => saveSection(['email_templates'], values, setSaving)} saving={saving}>
        {Object.entries(templates).map(([key, tpl]) => (
          <div key={key} className="border border-gray-100 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold capitalize">{key.replace(/_/g, ' ')}</p>
            <Field label="Subject"><input className="input-field text-sm" value={tpl.subject || ''} onChange={(e) => setTemplate(key, 'subject', e.target.value)} /></Field>
            <Field label="Body"><textarea className="input-field text-sm" rows={4} value={tpl.body || ''} onChange={(e) => setTemplate(key, 'body', e.target.value)} /></Field>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

export function CustomerAuthSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const keys = ['registration_enabled', 'email_verification_required', 'social_google_enabled', 'social_facebook_enabled', 'min_password_length', 'session_timeout_minutes', 'login_attempts_max'];

  return (
    <SectionCard title="Customer Authentication" description="Control how customers register and sign in." onSave={() => saveSection(keys, values, setSaving)} saving={saving}>
      <div className="space-y-3">
        <Toggle label="Allow Customer Registration" checked={values.registration_enabled} onChange={(v) => set('registration_enabled', v)} />
        <Toggle label="Require Email Verification" checked={values.email_verification_required} onChange={(v) => set('email_verification_required', v)} />
        <Toggle label="Google Sign-In" checked={values.social_google_enabled} onChange={(v) => set('social_google_enabled', v)} hint="Requires OAuth credentials in .env" />
        <Toggle label="Facebook Sign-In" checked={values.social_facebook_enabled} onChange={(v) => set('social_facebook_enabled', v)} hint="Requires OAuth credentials in .env" />
      </div>
      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <Field label="Min Password Length"><input type="number" className="input-field" value={values.min_password_length ?? 8} onChange={(e) => set('min_password_length', Number(e.target.value))} /></Field>
        <Field label="Session Timeout (min)"><input type="number" className="input-field" value={values.session_timeout_minutes ?? 10080} onChange={(e) => set('session_timeout_minutes', Number(e.target.value))} /></Field>
        <Field label="Max Login Attempts"><input type="number" className="input-field" value={values.login_attempts_max ?? 5} onChange={(e) => set('login_attempts_max', Number(e.target.value))} /></Field>
      </div>
    </SectionCard>
  );
}

const PRODUCT_PAGE_KEYS = [
  'product_page_alert_message',
  'product_page_short_terms',
  'product_delivery_schedule_disclaimer',
  'product_delivery_location_tier_label',
  'product_whatsapp_help_enabled',
  'product_whatsapp_help_title',
  'product_whatsapp_help_description',
  'product_whatsapp_help_button_text',
];

export function ProductPageSection({ values, set }) {
  const [saving, setSaving] = useState(false);

  return (
    <SectionCard
      title="Product Page Content"
      description="Alert messages, short terms, delivery schedule note, and WhatsApp help shown on every product page. Delivery rows come from Admin → Delivery groups."
      onSave={() => saveSection(PRODUCT_PAGE_KEYS, values, setSaving)}
      saving={saving}
    >
      <Field
        label="Concise alert message"
        hint="Shown at the top of every product page (e.g. cut-off reminders)."
      >
        <textarea
          className="input-field"
          rows={2}
          value={values.product_page_alert_message || ''}
          onChange={(e) => set('product_page_alert_message', e.target.value)}
          placeholder="Orders placed after cut-off are scheduled for the next cycle."
        />
      </Field>

      <Field
        label="Short terms & conditions"
        hint="Brief terms block displayed on all product pages."
      >
        <textarea
          className="input-field"
          rows={4}
          value={values.product_page_short_terms || ''}
          onChange={(e) => set('product_page_short_terms', e.target.value)}
        />
      </Field>

      <Field
        label="Delivery schedule footer note"
        hint="Small print below the yellow delivery table on product pages. Buy panel uses cut-off from the schedule when available."
      >
        <textarea
          className="input-field"
          rows={2}
          value={values.product_delivery_schedule_disclaimer || ''}
          onChange={(e) => set('product_delivery_schedule_disclaimer', e.target.value)}
          placeholder="* Orders submitted beyond the cut-off times (4 PM NST) are queued and dispatched on the subsequent fulfillment cycle. All speeds verified by carriers."
        />
      </Field>

      <Field label="Delivery table badge label">
        <input
          className="input-field max-w-xs"
          value={values.product_delivery_location_tier_label || 'Location Tier'}
          onChange={(e) => set('product_delivery_location_tier_label', e.target.value)}
        />
      </Field>

      <div className="border-t border-gray-100 pt-4 space-y-4">
        <Toggle
          label="Show WhatsApp help banner on product pages"
          checked={values.product_whatsapp_help_enabled}
          onChange={(v) => set('product_whatsapp_help_enabled', v)}
          hint="Uses WhatsApp number from Plugins Config (or Helpdesk WhatsApp from Store Registry)."
        />
        <Field label="WhatsApp help title">
          <input
            className="input-field"
            value={values.product_whatsapp_help_title || ''}
            onChange={(e) => set('product_whatsapp_help_title', e.target.value)}
          />
        </Field>
        <Field label="WhatsApp help description">
          <textarea
            className="input-field"
            rows={2}
            value={values.product_whatsapp_help_description || ''}
            onChange={(e) => set('product_whatsapp_help_description', e.target.value)}
          />
        </Field>
        <Field label="WhatsApp button text">
          <input
            className="input-field max-w-xs"
            value={values.product_whatsapp_help_button_text || 'WhatsApp Chat'}
            onChange={(e) => set('product_whatsapp_help_button_text', e.target.value)}
          />
        </Field>
      </div>
    </SectionCard>
  );
}

const SEO_KEYS = [
  'site_url',
  'meta_title',
  'meta_description',
  'meta_keywords',
  'default_og_image',
  'google_site_verification',
  'bing_site_verification',
  'business_name',
  'geo_placename',
  'geo_region',
  'geo_country',
  'geo_latitude',
  'geo_longitude',
];

export function SeoSection({ values, set }) {
  const [saving, setSaving] = useState(false);

  return (
    <SectionCard
      title="SEO, Social & GEO Defaults"
      description="Site-wide defaults used when a page or blog post does not override SEO fields."
      onSave={() => saveSection(SEO_KEYS, values, setSaving)}
      saving={saving}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Canonical site URL" hint="Used for absolute canonical and OG URLs.">
          <input className="input-field" value={values.site_url || ''} onChange={(e) => set('site_url', e.target.value)} placeholder="https://koselixpress.com" />
        </Field>
        <Field label="Business name (schema)">
          <input className="input-field" value={values.business_name || ''} onChange={(e) => set('business_name', e.target.value)} />
        </Field>
        <Field label="Default meta title">
          <input className="input-field" value={values.meta_title || ''} onChange={(e) => set('meta_title', e.target.value)} />
        </Field>
        <Field label="Default meta description">
          <textarea className="input-field" rows={2} value={values.meta_description || ''} onChange={(e) => set('meta_description', e.target.value)} />
        </Field>
        <Field label="Default meta keywords" className="md:col-span-2">
          <input className="input-field" value={values.meta_keywords || ''} onChange={(e) => set('meta_keywords', e.target.value)} placeholder="gifts, flowers, Nepal" />
        </Field>
        <Field label="Default OG image URL" className="md:col-span-2">
          <input className="input-field" value={values.default_og_image || ''} onChange={(e) => set('default_og_image', e.target.value)} placeholder="https://..." />
          <ImageSizeGuide guide="og" variant="muted" compact className="mt-1.5" />
        </Field>
        <Field label="Google site verification">
          <input className="input-field" value={values.google_site_verification || ''} onChange={(e) => set('google_site_verification', e.target.value)} />
        </Field>
        <Field label="Bing site verification">
          <input className="input-field" value={values.bing_site_verification || ''} onChange={(e) => set('bing_site_verification', e.target.value)} />
        </Field>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-2">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Default GEO tags</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Placename">
            <input className="input-field" value={values.geo_placename || ''} onChange={(e) => set('geo_placename', e.target.value)} />
          </Field>
          <Field label="Region">
            <input className="input-field" value={values.geo_region || ''} onChange={(e) => set('geo_region', e.target.value)} />
          </Field>
          <Field label="Country code">
            <input className="input-field" value={values.geo_country || ''} onChange={(e) => set('geo_country', e.target.value)} />
          </Field>
          <Field label="Latitude">
            <input className="input-field" value={values.geo_latitude || ''} onChange={(e) => set('geo_latitude', e.target.value)} />
          </Field>
          <Field label="Longitude">
            <input className="input-field" value={values.geo_longitude || ''} onChange={(e) => set('geo_longitude', e.target.value)} />
          </Field>
        </div>
      </div>
    </SectionCard>
  );
}
