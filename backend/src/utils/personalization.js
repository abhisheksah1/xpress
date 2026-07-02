const FIELD_KEYS = ['customCakeMessage', 'giftMessage', 'imagePrint'];

const FIELD_META = {
  customCakeMessage: { valueKey: 'cakeMessage', label: 'Message on Cake', kind: 'text', maxLength: 50 },
  giftMessage: { valueKey: 'giftMessage', label: 'Gift Message', kind: 'text', maxLength: 250 },
  imagePrint: { valueKey: 'printImageUrl', label: 'Upload Image or Design', kind: 'image' },
};

export function normalizePersonalizationFields(fields = {}) {
  const result = {};
  for (const key of FIELD_KEYS) {
    const val = fields[key];
    if (typeof val === 'boolean') {
      result[key] = { enabled: val, required: false };
    } else if (val && typeof val === 'object') {
      const enabled = Boolean(val.enabled);
      result[key] = { enabled, required: enabled && Boolean(val.required) };
    } else {
      result[key] = { enabled: false, required: false };
    }
  }
  return result;
}

export function validateOrderPersonalization(product, personalization = {}) {
  const normalized = normalizePersonalizationFields(product.personalizationFields);
  for (const key of FIELD_KEYS) {
    const field = normalized[key];
    const meta = FIELD_META[key];
    if (!field?.enabled || !field?.required) continue;

    if (meta.kind === 'image') {
      if (!personalization.printImageUrl) {
        return `${meta.label} is required for ${product.name}`;
      }
      continue;
    }

    const val = personalization[meta.valueKey]?.trim?.() ?? '';
    if (!val) return `${meta.label} is required for ${product.name}`;
    if (meta.maxLength && val.length > meta.maxLength) {
      return `${meta.label} must be ${meta.maxLength} characters or less`;
    }
  }
  return null;
}
