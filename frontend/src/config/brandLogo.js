import { resolveMediaUrl } from '../utils/mediaUrl.js';

export const DEFAULT_BRAND_LOGO_URL =
  'https://cdn2.blanxer.com/6655e348b68197ea3687aa1d/brand_logo/69ed931a4ef88edb4455819c.webp';

export const DEFAULT_BRAND_LOGO_ALT = 'Koseli Xpress';

export const DEFAULT_BRAND_LOGO = {
  url: DEFAULT_BRAND_LOGO_URL,
  alt: DEFAULT_BRAND_LOGO_ALT,
};

export function resolveBrandLogoUrl({ footerNav, headerNav, settings } = {}) {
  const raw =
    footerNav?.logo?.url ||
    headerNav?.logo?.url ||
    settings?.logo_url ||
    DEFAULT_BRAND_LOGO_URL;
  return resolveMediaUrl(raw);
}

export function resolveBrandLogoAlt({ footerNav, headerNav, settings } = {}) {
  return (
    footerNav?.logo?.alt ||
    headerNav?.logo?.alt ||
    settings?.registry_company_name ||
    settings?.store_name ||
    DEFAULT_BRAND_LOGO_ALT
  );
}
