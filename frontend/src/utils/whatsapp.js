export const WHATSAPP_BRAND_GREEN = '#25D366';

/** Prefer Plugins Config number (customer chat), then registry helpdesk, then store phone. */
export const resolveWhatsAppNumber = (settings = {}) => {
  const raw = settings.plugins_config?.whatsapp_number
    || settings.registry_helpdesk_whatsapp
    || settings.store_phone;
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  // Nepal mobiles are 10 digits (98…); wa.me needs country code
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = `977${digits}`;
  }
  return digits;
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
