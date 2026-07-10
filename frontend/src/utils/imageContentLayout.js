export const IMAGE_CONTENT_LAYOUTS = [
  { value: 'left', label: 'Image left · content right' },
  { value: 'right', label: 'Image right · content left' },
  { value: 'top', label: 'Image top · content below' },
  { value: 'bottom', label: 'Content top · image below' },
  { value: 'overlay', label: 'Content over image' },
];

export const OVERLAY_POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

export const BUTTON_LAYOUTS = [
  { value: 'row', label: 'Same row (side by side)' },
  { value: 'stack', label: 'Different rows (stacked)' },
];

export const BUTTON_ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export const TEXT_ALIGNS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export const BUTTON_STYLES = [
  { value: 'primary', label: 'Primary (filled)' },
  { value: 'secondary', label: 'Secondary (outline)' },
  { value: 'light', label: 'Light / white' },
  { value: 'dark', label: 'Dark' },
];

export const resolveImageContentLayout = (settings = {}) => {
  const layout = settings.layout || settings.imagePosition || 'left';
  return IMAGE_CONTENT_LAYOUTS.some((l) => l.value === layout) ? layout : 'left';
};

/** Resolve up to 2 CTAs from settings + legacy block.buttonText/buttonLink */
export const resolveImageContentButtons = (block = {}) => {
  const s = block.settings || {};
  const buttons = [];

  const b1Text = s.button1Text ?? block.buttonText;
  const b1Link = s.button1Link ?? block.buttonLink;
  if (b1Text && b1Link) {
    buttons.push({
      text: b1Text,
      link: b1Link,
      style: s.button1Style || 'primary',
    });
  }

  if (s.button2Text && s.button2Link) {
    buttons.push({
      text: s.button2Text,
      link: s.button2Link,
      style: s.button2Style || 'secondary',
    });
  }

  return buttons;
};
