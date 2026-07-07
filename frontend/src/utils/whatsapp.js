export const WHATSAPP_BRAND_GREEN = '#25D366';

export const resolveWhatsAppNumber = (settings = {}) => {
  const raw = settings.registry_helpdesk_whatsapp
    || settings.plugins_config?.whatsapp_number
    || settings.store_phone;
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits || null;
};

export const buildWhatsAppChatUrl = (number, message) => {
  const digits = String(number || '').replace(/\D/g, '');
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
};

export const isWhatsAppChatEnabled = (settings = {}) => {
  if (settings.maintenance_enabled === true || settings.maintenance_enabled === 'true') {
    return false;
  }
  return settings.plugins_config?.whatsapp_chat_enabled !== false;
};
