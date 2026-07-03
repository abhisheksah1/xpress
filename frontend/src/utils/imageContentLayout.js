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

export const resolveImageContentLayout = (settings = {}) => {
  const layout = settings.layout || settings.imagePosition || 'left';
  return IMAGE_CONTENT_LAYOUTS.some((l) => l.value === layout) ? layout : 'left';
};
