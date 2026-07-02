import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api/admin.js';
import { Field, SectionCard, Toggle, saveSection } from './shared.jsx';

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
        hint="When enabled, customers see a maintenance page and checkout is blocked."
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

export function MultiCurrenciesSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const data = values.multi_currencies || { currencies: [] };
  const currencies = data.currencies || [];

  const updateCurrency = (i, field, val) => {
    const next = [...currencies];
    next[i] = { ...next[i], [field]: val };
    if (field === 'isDefault' && val) {
      next.forEach((c, j) => { next[j] = { ...next[j], isDefault: j === i }; });
    }
    set('multi_currencies', { ...data, currencies: next });
  };

  const addCurrency = () => {
    set('multi_currencies', {
      ...data,
      currencies: [...currencies, { code: '', name: '', symbol: '', rate: 1, enabled: false, isDefault: false }],
    });
  };

  const removeCurrency = (i) => {
    set('multi_currencies', { ...data, currencies: currencies.filter((_, j) => j !== i) });
  };

  const handleSave = () => saveSection(['multi_currencies', 'auto_convert_prices'], values, setSaving);

  return (
    <SectionCard title="Multi-Currencies" description="Configure supported currencies and exchange rates." onSave={handleSave} saving={saving}>
      <Toggle label="Auto-convert product prices" checked={values.auto_convert_prices} onChange={(v) => set('auto_convert_prices', v)} />
      <div className="space-y-3">
        {currencies.map((c, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 border border-gray-100 rounded-lg items-end">
            <Field label="Code"><input className="input-field text-sm" value={c.code} onChange={(e) => updateCurrency(i, 'code', e.target.value.toUpperCase())} /></Field>
            <Field label="Name"><input className="input-field text-sm" value={c.name} onChange={(e) => updateCurrency(i, 'name', e.target.value)} /></Field>
            <Field label="Symbol"><input className="input-field text-sm" value={c.symbol} onChange={(e) => updateCurrency(i, 'symbol', e.target.value)} /></Field>
            <Field label="Rate"><input type="number" step="0.0001" className="input-field text-sm" value={c.rate} onChange={(e) => updateCurrency(i, 'rate', Number(e.target.value))} /></Field>
            <Toggle label="Enabled" checked={c.enabled} onChange={(v) => updateCurrency(i, 'enabled', v)} />
            <div className="flex gap-2">
              <Toggle label="Default" checked={c.isDefault} onChange={(v) => updateCurrency(i, 'isDefault', v)} />
              <button type="button" onClick={() => removeCurrency(i)} className="text-red-500 text-xs">Remove</button>
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

  const update = (i, field, val) => {
    const next = [...addons];
    next[i] = { ...next[i], [field]: val };
    set('service_addons', next);
  };

  const add = () => set('service_addons', [...addons, { id: `addon_${Date.now()}`, name: '', price: 0, description: '', enabled: true }]);
  const remove = (i) => set('service_addons', addons.filter((_, j) => j !== i));

  return (
    <SectionCard title="Service Add-ons" description="Optional extras customers can add at checkout." onSave={() => saveSection(['service_addons'], values, setSaving)} saving={saving}>
      {addons.map((a, i) => (
        <div key={a.id || i} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-gray-100 rounded-lg">
          <Field label="Name"><input className="input-field text-sm" value={a.name} onChange={(e) => update(i, 'name', e.target.value)} /></Field>
          <Field label="Price (NPR)"><input type="number" className="input-field text-sm" value={a.price} onChange={(e) => update(i, 'price', Number(e.target.value))} /></Field>
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
  const [zones, setZones] = useState([]);
  const [zoneForm, setZoneForm] = useState({ name: '', province: '', deliveryFee: 100, freeShippingThreshold: 0, isActive: true });

  const loadZones = async () => {
    const { data } = await adminApi.getDeliveryZones();
    setZones(data.data);
  };

  useEffect(() => { loadZones(); }, []);

  const saveFees = () => saveSection(['default_delivery_fee', 'free_shipping_threshold', 'same_day_fee', 'handling_fee'], values, setSaving);

  const addZone = async () => {
    await adminApi.createDeliveryZone({ ...zoneForm, districts: [], estimatedDays: { min: 1, max: 3 } });
    setZoneForm({ name: '', province: '', deliveryFee: 100, freeShippingThreshold: 0, isActive: true });
    loadZones();
    toast.success('Zone added');
  };

  const updateZone = async (id, data) => {
    await adminApi.updateDeliveryZone(id, data);
    loadZones();
  };

  const deleteZone = async (id) => {
    if (!confirm('Delete this delivery zone?')) return;
    await adminApi.deleteDeliveryZone(id);
    loadZones();
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Delivery Fees" description="Global delivery pricing rules." onSave={saveFees} saving={saving}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Default Delivery Fee (NPR)"><input type="number" className="input-field" value={values.default_delivery_fee ?? ''} onChange={(e) => set('default_delivery_fee', Number(e.target.value))} /></Field>
          <Field label="Free Shipping Above (NPR)"><input type="number" className="input-field" value={values.free_shipping_threshold ?? ''} onChange={(e) => set('free_shipping_threshold', Number(e.target.value))} /></Field>
          <Field label="Same-Day Surcharge (NPR)"><input type="number" className="input-field" value={values.same_day_fee ?? ''} onChange={(e) => set('same_day_fee', Number(e.target.value))} /></Field>
          <Field label="Handling Fee (NPR)"><input type="number" className="input-field" value={values.handling_fee ?? ''} onChange={(e) => set('handling_fee', Number(e.target.value))} /></Field>
        </div>
      </SectionCard>
      <SectionCard title="Delivery Zones" description="Region-based delivery fees and availability.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <input className="input-field text-sm" placeholder="Zone name" value={zoneForm.name} onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))} />
          <input className="input-field text-sm" placeholder="Province" value={zoneForm.province} onChange={(e) => setZoneForm((f) => ({ ...f, province: e.target.value }))} />
          <input type="number" className="input-field text-sm" placeholder="Fee" value={zoneForm.deliveryFee} onChange={(e) => setZoneForm((f) => ({ ...f, deliveryFee: Number(e.target.value) }))} />
          <button type="button" onClick={addZone} className="btn-secondary text-sm">+ Add Zone</button>
        </div>
        {zones.map((z) => (
          <div key={z._id} className="flex flex-wrap items-center gap-3 p-3 border border-gray-100 rounded-lg mb-2">
            <span className="font-medium text-sm flex-1">{z.name} — {z.province}</span>
            <input type="number" className="input-field w-24 text-sm" value={z.deliveryFee} onChange={(e) => updateZone(z._id, { deliveryFee: Number(e.target.value) })} />
            <Toggle label="Active" checked={z.isActive} onChange={(v) => updateZone(z._id, { isActive: v })} />
            <button type="button" onClick={() => deleteZone(z._id)} className="text-red-500 text-xs">Delete</button>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

export function PaymentGatewaysSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const keys = ['cod_enabled', 'khalti_enabled', 'esewa_enabled', 'fonepay_enabled', 'card_enabled', 'payment_test_mode', 'khalti_public_key', 'esewa_merchant_code', 'fonepay_merchant_code'];

  return (
    <SectionCard title="Payment Gateways" description="Enable payment methods and configure public keys. Secret keys stay in .env." onSave={() => saveSection(keys, values, setSaving)} saving={saving}>
      <div className="grid md:grid-cols-2 gap-4">
        <Toggle label="Cash on Delivery" checked={values.cod_enabled} onChange={(v) => set('cod_enabled', v)} />
        <Toggle label="Khalti" checked={values.khalti_enabled} onChange={(v) => set('khalti_enabled', v)} />
        <Toggle label="eSewa" checked={values.esewa_enabled} onChange={(v) => set('esewa_enabled', v)} />
        <Toggle label="Fonepay" checked={values.fonepay_enabled} onChange={(v) => set('fonepay_enabled', v)} />
        <Toggle label="Card / Stripe" checked={values.card_enabled} onChange={(v) => set('card_enabled', v)} />
        <Toggle label="Test / Sandbox Mode" checked={values.payment_test_mode} onChange={(v) => set('payment_test_mode', v)} />
      </div>
      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
        <Field label="Khalti Public Key"><input className="input-field text-sm" value={values.khalti_public_key || ''} onChange={(e) => set('khalti_public_key', e.target.value)} /></Field>
        <Field label="eSewa Merchant Code"><input className="input-field text-sm" value={values.esewa_merchant_code || ''} onChange={(e) => set('esewa_merchant_code', e.target.value)} /></Field>
        <Field label="Fonepay Merchant Code"><input className="input-field text-sm" value={values.fonepay_merchant_code || ''} onChange={(e) => set('fonepay_merchant_code', e.target.value)} /></Field>
      </div>
    </SectionCard>
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
        <Field label="WhatsApp Number"><input className="input-field" value={plugins.whatsapp_number || ''} onChange={(e) => setPlugin('whatsapp_number', e.target.value)} /></Field>
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

  return (
    <SectionCard title="Branding & Layout Config" description="10 core visual settings for your storefront." onSave={() => saveSection(keys, values, setSaving)} saving={saving}>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Logo URL"><input className="input-field" value={values.logo_url || ''} onChange={(e) => set('logo_url', e.target.value)} /></Field>
        <Field label="Favicon URL"><input className="input-field" value={values.favicon_url || ''} onChange={(e) => set('favicon_url', e.target.value)} /></Field>
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

export function TimeSlotsSection({ values, set }) {
  const [saving, setSaving] = useState(false);
  const slots = values.delivery_time_slots || [];

  const update = (i, field, val) => {
    const next = [...slots];
    next[i] = { ...next[i], [field]: val };
    set('delivery_time_slots', next);
  };

  const add = () => set('delivery_time_slots', [...slots, { id: `slot_${Date.now()}`, label: '', start: '09:00', end: '12:00', enabled: true, maxOrders: 50 }]);

  return (
    <SectionCard title="Delivery Time Slots" description="Let customers pick preferred delivery windows." onSave={() => saveSection(['delivery_time_slots', 'timeslots_enabled'], values, setSaving)} saving={saving}>
      <Toggle label="Enable time slot selection at checkout" checked={values.timeslots_enabled} onChange={(v) => set('timeslots_enabled', v)} />
      {slots.map((s, i) => (
        <div key={s.id || i} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 border border-gray-100 rounded-lg">
          <Field label="Label"><input className="input-field text-sm" value={s.label} onChange={(e) => update(i, 'label', e.target.value)} /></Field>
          <Field label="Start"><input type="time" className="input-field text-sm" value={s.start} onChange={(e) => update(i, 'start', e.target.value)} /></Field>
          <Field label="End"><input type="time" className="input-field text-sm" value={s.end} onChange={(e) => update(i, 'end', e.target.value)} /></Field>
          <Field label="Max Orders"><input type="number" className="input-field text-sm" value={s.maxOrders} onChange={(e) => update(i, 'maxOrders', Number(e.target.value))} /></Field>
          <Toggle label="Enabled" checked={s.enabled} onChange={(v) => update(i, 'enabled', v)} />
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary text-sm">+ Add Time Slot</button>
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

  const smtpKeys = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'email_from', 'email_templates'];

  const sendTest = async () => {
    if (!testEmail) return toast.error('Enter test email');
    setTesting(true);
    try {
      await adminApi.bulkUpdateSettings(smtpKeys.map((key) => ({ key, value: values[key] })));
      await adminApi.testSmtp(testEmail);
      toast.success('Test email sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'SMTP test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="SMTP Configuration" description="Outgoing email server settings." onSave={() => saveSection(smtpKeys.filter((k) => k !== 'email_templates').concat(['email_templates']), values, setSaving)} saving={saving}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="SMTP Host"><input className="input-field" value={values.smtp_host || ''} onChange={(e) => set('smtp_host', e.target.value)} placeholder="smtp.gmail.com" /></Field>
          <Field label="SMTP Port"><input type="number" className="input-field" value={values.smtp_port ?? 587} onChange={(e) => set('smtp_port', Number(e.target.value))} /></Field>
          <Field label="SMTP Username"><input className="input-field" value={values.smtp_user || ''} onChange={(e) => set('smtp_user', e.target.value)} /></Field>
          <Field label="SMTP Password"><input type="password" className="input-field" value={values.smtp_pass || ''} onChange={(e) => set('smtp_pass', e.target.value)} /></Field>
          <Field label="From Address"><input className="input-field" value={values.email_from || ''} onChange={(e) => set('email_from', e.target.value)} /></Field>
          <Toggle label="Use SSL/TLS (port 465)" checked={values.smtp_secure} onChange={(v) => set('smtp_secure', v)} />
        </div>
        <div className="flex gap-2 items-end pt-2">
          <Field label="Send Test Email">
            <input className="input-field" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <button type="button" onClick={sendTest} disabled={testing} className="btn-secondary mb-0">{testing ? 'Sending...' : 'Send Test'}</button>
        </div>
      </SectionCard>
      <SectionCard title="Email Templates" description="Use {{customer_name}}, {{order_number}}, {{total}}, {{reset_link}} as placeholders." onSave={() => saveSection(['email_templates'], values, setSaving)} saving={saving}>
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
