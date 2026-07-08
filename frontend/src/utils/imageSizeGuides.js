/** Recommended image dimensions for uploads across admin and storefront. */
export const IMAGE_SIZE_GUIDES = {
  product: {
    title: 'Recommended product image size',
    compact: '1200 × 1200 px square · JPEG/WebP · under 500 KB',
    lines: [
      '1200 × 1200 px square (1:1 — matches product gallery and shop cards)',
      'Minimum 800 × 800 px for sharp zoom on the product page',
      'JPEG or WebP format, under 500 KB per image',
      'The first image is used as the main product photo',
    ],
  },
  category: {
    title: 'Recommended category image size',
    compact: '800 × 800 px square · JPEG/WebP · under 300 KB',
    lines: [
      '800 × 800 px square (1:1)',
      'Minimum 600 × 600 px for clear display on category pages',
      'JPEG or WebP format, under 300 KB',
    ],
  },
  blogFeatured: {
    title: 'Recommended featured image size',
    compact: '1600 × 900 px (16:9) · JPEG/WebP · under 500 KB',
    lines: [
      '1600 × 900 px (16:9 widescreen)',
      'Minimum 1200 × 675 px for blog listing and article headers',
      'JPEG or WebP format, under 500 KB',
    ],
  },
  og: {
    title: 'Recommended Open Graph image size',
    compact: '1200 × 630 px · JPEG/PNG · under 500 KB',
    lines: [
      '1200 × 630 px (1.91:1 — Facebook, LinkedIn, Twitter large card)',
      'Minimum 600 × 315 px',
      'JPEG or PNG format, under 500 KB',
      'Keep important text and logos away from the edges',
    ],
  },
  cmsSlide: {
    title: 'Recommended slide size',
    compact: '1920 × 840 px · JPEG/WebP · under 500 KB per slide',
    lines: [
      '1920 × 840 px (16:7 widescreen — matches the storefront slider)',
      'Minimum 1280 × 560 px for sharp display on desktop',
      'JPEG or WebP format, under 500 KB per slide',
      'Keep key content centered — edges may crop slightly on mobile',
    ],
  },
  cmsContent: {
    title: 'Recommended image size',
    compact: '1600 × 900 px or larger · JPEG/WebP · under 500 KB',
    lines: [
      '1600 × 900 px or larger',
      'JPEG or WebP format, under 500 KB',
    ],
  },
  logo: {
    title: 'Recommended logo size',
    compact: '400 × 120 px wide · PNG with transparent background',
    lines: [
      '400 × 120 px (or similar wide ratio)',
      'PNG with transparent background preferred',
      'Displayed at roughly 40–48 px height in the header',
    ],
  },
  favicon: {
    title: 'Recommended favicon size',
    compact: '64 × 64 px PNG or ICO',
    lines: [
      '64 × 64 px PNG (or 32 × 32 px minimum)',
      'Square format — simple designs work best at small sizes',
      'ICO or PNG format',
    ],
  },
  paymentLogo: {
    title: 'Recommended payment logo size',
    compact: '200 × 80 px · PNG with transparent background',
    lines: [
      '200 × 80 px (or similar wide ratio)',
      'PNG with transparent background',
      'Displayed at roughly 40 px height at checkout',
    ],
  },
  printDesign: {
    title: 'Print design upload guide',
    compact: 'Min. 1000 px longest side · JPG/PNG · max 5 MB',
    lines: [
      'Minimum 1000 px on the longest side for clear printing',
      'JPG or PNG format, maximum 5 MB',
      'High-contrast designs print best — avoid very light text on white',
    ],
  },
  customerPhoto: {
    title: 'Photo upload guide',
    compact: 'JPG or PNG format, maximum 5 MB. Use a clear, well-lit photo.',
    lines: [
      'JPG or PNG format, maximum 5 MB',
      'Use a clear, well-lit photo',
    ],
  },
};

export function getImageSizeGuide(key) {
  return IMAGE_SIZE_GUIDES[key] || IMAGE_SIZE_GUIDES.cmsContent;
}
