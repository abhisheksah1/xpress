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
    cropPresets: [
      { label: '1200 × 1200 (recommended)', width: 1200, height: 1200, aspect: 1 },
      { label: '800 × 800 (minimum)', width: 800, height: 800, aspect: 1 },
      { label: '1000 × 1000', width: 1000, height: 1000, aspect: 1 },
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
    cropPresets: [
      { label: '800 × 800 (recommended)', width: 800, height: 800, aspect: 1 },
      { label: '600 × 600 (minimum)', width: 600, height: 600, aspect: 1 },
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
    cropPresets: [
      { label: '1600 × 900 (16:9)', width: 1600, height: 900, aspect: 16 / 9 },
      { label: '1200 × 675 (minimum)', width: 1200, height: 675, aspect: 16 / 9 },
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
    cropPresets: [
      { label: '1200 × 630 (recommended)', width: 1200, height: 630, aspect: 1200 / 630 },
      { label: '600 × 315 (minimum)', width: 600, height: 315, aspect: 600 / 315 },
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
    cropPresets: [
      { label: '1920 × 840 (recommended)', width: 1920, height: 840, aspect: 1920 / 840 },
      { label: '1280 × 560 (minimum)', width: 1280, height: 560, aspect: 1280 / 560 },
    ],
  },
  landingPopup: {
    title: 'Recommended popup image size',
    compact: '800 × 600 px or larger · JPEG/WebP · under 400 KB',
    lines: [
      '800 × 600 px (4:3) or larger',
      'JPEG or WebP format, under 400 KB',
      'Keep important content centered — edges may crop on small screens',
    ],
    cropPresets: [
      { label: '800 × 600 (4:3)', width: 800, height: 600, aspect: 4 / 3 },
      { label: '1000 × 1000 (square)', width: 1000, height: 1000, aspect: 1 },
      { label: '1200 × 675 (16:9)', width: 1200, height: 675, aspect: 16 / 9 },
    ],
  },
  cmsContent: {
    title: 'Recommended image size',
    compact: '1600 × 900 px or larger · JPEG/WebP · under 500 KB',
    lines: [
      '1600 × 900 px or larger',
      'JPEG or WebP format, under 500 KB',
    ],
    cropPresets: [
      { label: '1600 × 900 (16:9)', width: 1600, height: 900, aspect: 16 / 9 },
      { label: '1200 × 800 (3:2)', width: 1200, height: 800, aspect: 3 / 2 },
      { label: '1000 × 1000 (square)', width: 1000, height: 1000, aspect: 1 },
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
    cropPresets: [
      { label: '400 × 120 (recommended)', width: 400, height: 120, aspect: 400 / 120 },
      { label: '320 × 96', width: 320, height: 96, aspect: 320 / 96 },
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
    cropPresets: [
      { label: '64 × 64', width: 64, height: 64, aspect: 1 },
      { label: '128 × 128', width: 128, height: 128, aspect: 1 },
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
    cropPresets: [
      { label: '200 × 80 (recommended)', width: 200, height: 80, aspect: 200 / 80 },
      { label: '160 × 64', width: 160, height: 64, aspect: 160 / 64 },
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

const FREE_CROP_PRESET = { id: 'free', label: 'Free crop (custom)', width: null, height: null, aspect: undefined };

export function getCropPresets(guideKey) {
  const guide = getImageSizeGuide(guideKey);
  const presets = (guide.cropPresets || getImageSizeGuide('cmsContent').cropPresets || []).map((preset, index) => ({
    ...preset,
    id: preset.id || `preset-${index}`,
  }));
  return [...presets, FREE_CROP_PRESET];
}

export function getDefaultCropPreset(guideKey) {
  const presets = getCropPresets(guideKey);
  return presets[0] || FREE_CROP_PRESET;
}
