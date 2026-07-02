export const FIELD_CONFIG = {
  customCakeMessage: {
    key: 'cakeMessage',
    label: 'Message on Cake',
    placeholder: 'Your cake message...',
    maxLength: 50,
    kind: 'text',
  },
  giftMessage: {
    key: 'giftMessage',
    label: 'Gift Message',
    hint: 'Add a personal note to include with your gift',
    placeholder: 'Your gift message...',
    maxLength: 250,
    kind: 'text',
  },
  imagePrint: {
    key: 'printImageUrl',
    label: 'Upload Image or Design',
    hint: 'Upload a photo or design to print on the product (JPG, PNG)',
    kind: 'image',
  },
};

const FIELD_KEYS = Object.keys(FIELD_CONFIG);

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

export function getActivePersonalizationFields(personalizationFields = {}) {
  const normalized = normalizePersonalizationFields(personalizationFields);
  return Object.entries(FIELD_CONFIG)
    .filter(([flag]) => normalized[flag]?.enabled)
    .map(([flag, config]) => [flag, { ...config, required: normalized[flag]?.required ?? false }]);
}

export function hasPersonalization(personalizationFields = {}) {
  return getActivePersonalizationFields(personalizationFields).length > 0;
}

export function emptyPersonalization(personalizationFields = {}) {
  const data = {};
  for (const [, config] of getActivePersonalizationFields(personalizationFields)) {
    data[config.key] = '';
  }
  const normalized = normalizePersonalizationFields(personalizationFields);
  if (normalized.imagePrint?.enabled) {
    data.printImageName = '';
  }
  return data;
}

export function validatePersonalization(personalizationFields, values) {
  const active = getActivePersonalizationFields(personalizationFields);
  for (const [, config] of active) {
    if (!config.required) continue;

    const val = values[config.key]?.trim?.() ?? values[config.key];
    if (config.kind === 'image') {
      if (!values.printImageUrl) return `${config.label} is required`;
    } else if (!val) {
      return `${config.label} is required`;
    }
    if (config.maxLength && val && val.length > config.maxLength) {
      return `${config.label} must be ${config.maxLength} characters or less`;
    }
  }
  return null;
}

export function personalizationKey(values) {
  return JSON.stringify(values || {});
}

export const ADMIN_PERSONALIZATION_OPTIONS = [
  { key: 'customCakeMessage', label: 'Message on Cake', description: 'Single-line icing message on cakes' },
  { key: 'giftMessage', label: 'Gift Message', description: 'Personal note with the gift' },
  { key: 'imagePrint', label: 'Image / Design Upload', description: 'Customer uploads a print file' },
];

export const defaultPersonalizationFields = () => ({
  customCakeMessage: { enabled: false, required: false },
  giftMessage: { enabled: true, required: false },
  imagePrint: { enabled: false, required: false },
});
