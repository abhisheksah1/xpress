export const DEFAULT_FOOTER_OPTIONS = {
  backgroundColor: '#ffffff',
  textColor: '#4b5563',
  headingColor: '#111827',
  borderColor: '#e5e7eb',
};

const DARK_FOOTER_OPTIONS = {
  headingColor: '#ffffff',
  textColor: '#d1d5db',
  borderColor: '#374151',
};

function parseHex(color) {
  if (!color || typeof color !== 'string') return null;
  let hex = color.trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function relativeLuminance(color) {
  const rgb = parseHex(color);
  if (!rgb) return 0.5;
  const channels = [rgb.r, rgb.g, rgb.b].map((value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function isLightColor(color) {
  return relativeLuminance(color) > 0.55;
}

export function resolveFooterOptions(opts = {}) {
  const merged = { ...DEFAULT_FOOTER_OPTIONS, ...opts };
  const bgLight = isLightColor(merged.backgroundColor);

  if (bgLight) {
    if (isLightColor(merged.headingColor)) merged.headingColor = DEFAULT_FOOTER_OPTIONS.headingColor;
    if (isLightColor(merged.textColor)) merged.textColor = DEFAULT_FOOTER_OPTIONS.textColor;
    if (isLightColor(merged.borderColor)) merged.borderColor = DEFAULT_FOOTER_OPTIONS.borderColor;
  } else {
    if (!isLightColor(merged.headingColor)) merged.headingColor = DARK_FOOTER_OPTIONS.headingColor;
    if (!isLightColor(merged.textColor)) merged.textColor = DARK_FOOTER_OPTIONS.textColor;
    if (!isLightColor(merged.borderColor)) merged.borderColor = DARK_FOOTER_OPTIONS.borderColor;
  }

  return merged;
}

export const DEFAULT_FOOTER_LAYOUT = {
  showLogo: true,
  linkColumns: [
    {
      title: 'About Koseli Xpress',
      items: [
        { label: 'About Us', link: '/about' },
        { label: 'Contact', link: '/contact' },
        { label: 'Offers', link: '/shop' },
        { label: 'Social Media', link: '/contact' },
      ],
    },
    {
      title: 'Popular Category',
      items: [
        { label: 'Gift for Girl Friend', link: '/shop?search=girlfriend' },
        { label: 'Gift for Wife', link: '/shop?search=wife' },
        { label: 'Birthday Gifts', link: '/shop?search=birthday' },
        { label: 'Birthday Cakes', link: '/shop?search=cake' },
      ],
    },
    {
      title: 'Legals',
      items: [
        { label: 'Shipping Policy', link: '/p/shipping-policy' },
        { label: 'Refund Policy', link: '/p/refund-policy' },
        { label: 'Privacy Policy', link: '/p/privacy' },
        { label: 'Terms of service', link: '/p/terms' },
      ],
    },
    {
      title: 'Socials',
      items: [
        { label: 'Facebook', link: 'https://facebook.com' },
        { label: 'YouTube', link: 'https://youtube.com' },
        { label: 'Instagram', link: 'https://instagram.com' },
        { label: 'Tik Tok', link: 'https://tiktok.com' },
      ],
    },
  ],
  infoColumns: [
    {
      items: [
        { label: 'Registered Business Name', value: 'Koseli Xpress Pvt. Ltd.' },
        { label: 'Contact', value: 'koselixpress@gmail.com' },
      ],
    },
    {
      items: [
        { label: 'PAN/VAT Number', value: '619715335' },
        { label: 'E-Commerce Number', value: 'on process' },
      ],
    },
    {
      items: [
        { label: 'Company Address', value: 'Main Office - Budhanilkantha-12, Kapan Kathmandu, Nepal' },
        { label: 'Outlets', value: 'Main Branch- Kathmandu' },
      ],
    },
    {
      items: [
        { label: 'Registration Number', value: '313957/79/080, वा.रजिष्ट्रेशन नम्बर- 002-25' },
        { label: 'Complain Officer', value: 'Sabita Acharya, 9801354451, koselixpress@gmail.com' },
      ],
    },
  ],
};
