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
    label: 'Text on Gift',
    hint: 'Personal note or text to print / include with the gift',
    placeholder: 'Your gift text...',
    maxLength: 250,
    kind: 'textarea',
  },
  imagePrint: {
    key: 'printImages',
    label: 'Upload Image or Design',
    hint: 'JPG or PNG only',
    kind: 'image',
  },
};

const FIELD_KEYS = Object.keys(FIELD_CONFIG);
const MAX_IMAGES_HARD_LIMIT = 6;

export function clampMaxImages(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_IMAGES_HARD_LIMIT, Math.max(1, Math.floor(n)));
}

export function normalizePersonalizationFields(fields = {}) {
  const result = {};
  for (const key of FIELD_KEYS) {
    const val = fields[key];
    if (typeof val === 'boolean') {
      result[key] = {
        enabled: val,
        required: false,
        ...(key === 'imagePrint' ? { maxImages: 1 } : {}),
      };
    } else if (val && typeof val === 'object') {
      const enabled = Boolean(val.enabled);
      result[key] = {
        enabled,
        required: enabled && Boolean(val.required),
        ...(key === 'imagePrint'
          ? { maxImages: clampMaxImages(val.maxImages ?? 1) }
          : {}),
      };
    } else {
      result[key] = {
        enabled: false,
        required: false,
        ...(key === 'imagePrint' ? { maxImages: 1 } : {}),
      };
    }
  }
  return result;
}

export function getImagePrintMax(personalizationFields = {}) {
  const normalized = normalizePersonalizationFields(personalizationFields);
  return clampMaxImages(normalized.imagePrint?.maxImages ?? 1);
}

export function getActivePersonalizationFields(personalizationFields = {}) {
  const normalized = normalizePersonalizationFields(personalizationFields);
  return Object.entries(FIELD_CONFIG)
    .filter(([flag]) => normalized[flag]?.enabled)
    .map(([flag, config]) => [
      flag,
      {
        ...config,
        required: normalized[flag]?.required ?? false,
        maxImages: flag === 'imagePrint' ? clampMaxImages(normalized[flag]?.maxImages ?? 1) : undefined,
      },
    ]);
}

export function hasPersonalization(personalizationFields = {}) {
  return getActivePersonalizationFields(personalizationFields).length > 0;
}

/** Normalize values to always expose printImages[] (+ legacy first-image fields). */
export function normalizePersonalizationValues(values = {}) {
  const list = [];
  if (Array.isArray(values.printImages)) {
    for (const img of values.printImages) {
      const url = String(img?.url || img?.printImageUrl || '').trim();
      if (!url) continue;
      list.push({
        url,
        name: String(img?.name || img?.printImageName || '').trim(),
      });
    }
  }
  if (!list.length && values.printImageUrl) {
    list.push({
      url: String(values.printImageUrl).trim(),
      name: String(values.printImageName || '').trim(),
    });
  }
  return {
    cakeMessage: values.cakeMessage || '',
    giftMessage: values.giftMessage || '',
    printImages: list,
    printImageUrl: list[0]?.url || '',
    printImageName: list[0]?.name || '',
  };
}

export function emptyPersonalization(personalizationFields = {}) {
  const data = {
    cakeMessage: '',
    giftMessage: '',
    printImages: [],
    printImageUrl: '',
    printImageName: '',
  };
  const normalized = normalizePersonalizationFields(personalizationFields);
  if (!normalized.customCakeMessage?.enabled) delete data.cakeMessage;
  if (!normalized.giftMessage?.enabled) delete data.giftMessage;
  if (!normalized.imagePrint?.enabled) {
    delete data.printImages;
    delete data.printImageUrl;
    delete data.printImageName;
  }
  return data;
}

export function validatePersonalization(personalizationFields, values) {
  const active = getActivePersonalizationFields(personalizationFields);
  const normalizedValues = normalizePersonalizationValues(values);

  for (const [, config] of active) {
    if (!config.required) continue;

    if (config.kind === 'image') {
      if (!normalizedValues.printImages.length) return `${config.label} is required`;
      continue;
    }

    const val = (normalizedValues[config.key] || '').trim();
    if (!val) return `${config.label} is required`;
    if (config.maxLength && val.length > config.maxLength) {
      return `${config.label} must be ${config.maxLength} characters or less`;
    }
  }

  const maxImages = getImagePrintMax(personalizationFields);
  if (normalizedValues.printImages.length > maxImages) {
    return `You can upload up to ${maxImages} image${maxImages === 1 ? '' : 's'}`;
  }

  if (values.printImageName && !values.printImageUrl && !normalizedValues.printImages.length) {
    return 'Please wait for the image upload to finish, or upload the image again';
  }

  return null;
}

export function mergePersonalization(prev, patch) {
  const base = prev && typeof prev === 'object' ? prev : {};
  const next = { ...base, ...patch };
  return normalizePersonalizationValues(next);
}

/** Merge cart line personalization with top-level print fields, pending uploads, and session backup. */
export function resolveCartItemPersonalization(item, productUploads = {}) {
  if (!item) return undefined;

  const pending = productUploads?.[item.productId];
  const topLevel =
    item.printImageUrl || item.printImageName || item.printImages?.length
      ? {
          printImageUrl: item.printImageUrl,
          printImageName: item.printImageName,
          printImages: item.printImages,
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
        sessionBackup?.printImages?.length || sessionBackup?.printImageUrl ? sessionBackup : null
      )
    ) || undefined
  );
}

export function persistProductPrintUpload(productId, upload) {
  if (typeof sessionStorage === 'undefined' || !productId) return;
  const images = Array.isArray(upload?.printImages)
    ? upload.printImages
    : upload?.printImageUrl
      ? [{ url: upload.printImageUrl, name: upload.printImageName || '' }]
      : [];
  if (!images.length) return;
  try {
    sessionStorage.setItem(`koseli-print-${productId}`, JSON.stringify({
      printImages: images,
      printImageUrl: images[0].url,
      printImageName: images[0].name || '',
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
  const normalized = normalizePersonalizationValues(personalization);
  const printImages = normalized.printImages
    .map((img) => ({
      url: img.url,
      name: img.name || undefined,
    }))
    .filter((img) => img.url);

  const payload = {
    cakeMessage: normalized.cakeMessage?.trim() || undefined,
    giftMessage: normalized.giftMessage?.trim() || undefined,
    printImages: printImages.length ? printImages : undefined,
    printImageUrl: printImages[0]?.url || undefined,
    printImageName: printImages[0]?.name || undefined,
  };

  if (payload.printImageName && !payload.printImageUrl) {
    delete payload.printImageName;
  }
  if (!payload.cakeMessage && !payload.giftMessage && !payload.printImageUrl && !payload.printImages) {
    return undefined;
  }
  return payload;
}

export function personalizationKey(values) {
  return JSON.stringify(serializePersonalization(values) || {});
}

export const ADMIN_PERSONALIZATION_OPTIONS = [
  { key: 'customCakeMessage', label: 'Message on Cake', description: 'Single-line icing message on cakes' },
  { key: 'giftMessage', label: 'Text on Gift', description: 'Personal note or printed text with the gift' },
  { key: 'imagePrint', label: 'Image / Design Upload', description: 'Customer uploads one or more print files' },
];

export const defaultPersonalizationFields = () => ({
  customCakeMessage: { enabled: false, required: false },
  giftMessage: { enabled: true, required: false },
  imagePrint: { enabled: false, required: false, maxImages: 1 },
});
