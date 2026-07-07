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

  if (values.printImageName && !values.printImageUrl) {
    return 'Please wait for the image upload to finish, or upload the image again';
  }

  return null;
}

export function mergePersonalization(prev, patch) {
  const base = prev && typeof prev === 'object' ? prev : {};
  return { ...base, ...patch };
}

/** Merge cart line personalization with top-level print fields, pending uploads, and session backup. */
export function resolveCartItemPersonalization(item, productUploads = {}) {
  if (!item) return undefined;

  const pending = productUploads?.[item.productId];
  const topLevel =
    item.printImageUrl || item.printImageName
      ? {
          printImageUrl: item.printImageUrl,
          printImageName: item.printImageName,
        }
      : null;

  let sessionBackup = null;
  if (typeof sessionStorage !== 'undefined' && item.productId) {
    try {
      const raw = sessionStorage.getItem(`koseli-print-${item.productId}`);
      if (raw) sessionBackup = JSON.parse(raw);
    } catch {
      sessionBackup = null;
    }
  }

  return (
    serializePersonalization(
      mergePersonalization(
        mergePersonalization(mergePersonalization(item.personalization, topLevel), pending),
        sessionBackup?.printImageUrl ? sessionBackup : null
      )
    ) || undefined
  );
}

export function persistProductPrintUpload(productId, upload) {
  if (typeof sessionStorage === 'undefined' || !productId || !upload?.printImageUrl) return;
  try {
    sessionStorage.setItem(`koseli-print-${productId}`, JSON.stringify({
      printImageUrl: upload.printImageUrl,
      printImageName: upload.printImageName || '',
    }));
  } catch {
    /* quota / private mode */
  }
}

export function clearProductPrintUpload(productId) {
  if (typeof sessionStorage === 'undefined' || !productId) return;
  try {
    sessionStorage.removeItem(`koseli-print-${productId}`);
  } catch {
    /* ignore */
  }
}

export function clearAllProductPrintUploads() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('koseli-print-')) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function serializePersonalization(personalization) {
  if (!personalization || typeof personalization !== 'object') return undefined;
  const payload = {
    cakeMessage: personalization.cakeMessage?.trim() || undefined,
    giftMessage: personalization.giftMessage?.trim() || undefined,
    printImageUrl: personalization.printImageUrl?.trim() || undefined,
    printImageName: personalization.printImageName?.trim() || undefined,
  };
  if (payload.printImageName && !payload.printImageUrl) {
    delete payload.printImageName;
  }
  if (!payload.cakeMessage && !payload.giftMessage && !payload.printImageUrl && !payload.printImageName) {
    return undefined;
  }
  return payload;
}

export function personalizationKey(values) {
  return JSON.stringify(serializePersonalization(values) || {});
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
