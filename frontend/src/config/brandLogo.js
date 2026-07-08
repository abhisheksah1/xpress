import { resolveMediaUrl } from '../utils/mediaUrl.js';

export const DEFAULT_BRAND_LOGO_URL =
  'https://cdn2.blanxer.com/6655e348b68197ea3687aa1d/brand_logo/69ed931a4ef88edb4455819c.webp';

export const DEFAULT_BRAND_LOGO_ALT = 'Koseli Xpress';

export const DEFAULT_BRAND_LOGO = {
  url: DEFAULT_BRAND_LOGO_URL,
  alt: DEFAULT_BRAND_LOGO_ALT,
};

/**
 * Resolve the storefront logo URL.
 * Branding settings (logo_url) is the site-wide source of truth; navbar logos are fallbacks.
 */
export function resolveBrandLogoUrl({ footerNav, headerNav, settings, placement } = {}) {
  const branding = settings?.logo_url?.trim();
  const headerLogo = headerNav?.logo?.url?.trim();
  const footerLogo = footerNav?.logo?.url?.trim();

  if (branding) {
    return resolveMediaUrl(branding);
  }

  if (placement === 'footer') {
    return resolveMediaUrl(footerLogo || headerLogo || DEFAULT_BRAND_LOGO_URL);
  }

  if (placement === 'header') {
    return resolveMediaUrl(headerLogo || footerLogo || DEFAULT_BRAND_LOGO_URL);
  }

  return resolveMediaUrl(headerLogo || footerLogo || DEFAULT_BRAND_LOGO_URL);
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

/** Favicon from branding settings, falling back to the site logo. */
export function resolveFaviconUrl(settings = {}) {
  const favicon = settings.favicon_url?.trim();
  if (favicon) return resolveMediaUrl(favicon);
  const logo = settings.logo_url?.trim();
  if (logo) return resolveMediaUrl(logo);
  return '';
}
