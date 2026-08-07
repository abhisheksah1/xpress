const FIELD_KEYS = ['customCakeMessage', 'giftMessage', 'imagePrint'];
const MAX_IMAGES_HARD_LIMIT = 6;

const FIELD_META = {
  customCakeMessage: { valueKey: 'cakeMessage', label: 'Message on Cake', kind: 'text', maxLength: 50 },
  giftMessage: { valueKey: 'giftMessage', label: 'Text on Gift', kind: 'text', maxLength: 250 },
  imagePrint: { valueKey: 'printImages', label: 'Upload Image or Design', kind: 'image' },
};

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

function listPrintImages(personalization = {}) {
  const list = [];
  if (Array.isArray(personalization.printImages)) {
    for (const img of personalization.printImages) {
      const url = String(img?.url || img?.printImageUrl || '').trim();
      if (!url) continue;
      list.push({
        url,
        name: String(img?.name || img?.printImageName || '').trim() || undefined,
      });
    }
  }
  if (!list.length && personalization.printImageUrl) {
    list.push({
      url: String(personalization.printImageUrl).trim(),
      name: personalization.printImageName?.trim() || undefined,
    });
  }
  return list;
}

export function validateOrderPersonalization(product, personalization = {}) {
  const normalized = normalizePersonalizationFields(product.personalizationFields);
  const images = listPrintImages(personalization);

  for (const key of FIELD_KEYS) {
    const field = normalized[key];
    const meta = FIELD_META[key];
    if (!field?.enabled || !field?.required) continue;

    if (meta.kind === 'image') {
      if (!images.length) {
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

  const maxImages = clampMaxImages(normalized.imagePrint?.maxImages ?? 1);
  if (images.length > maxImages) {
    return `${product.name} allows up to ${maxImages} personalization image${maxImages === 1 ? '' : 's'}`;
  }

  return null;
}
