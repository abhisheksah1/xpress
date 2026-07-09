export function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image')));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

export async function getCroppedImageBlob(
  imageSrc,
  pixelCrop,
  outputWidth,
  outputHeight,
  mimeType = 'image/jpeg',
  quality = 0.92
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const width = outputWidth || Math.round(pixelCrop.width);
  const height = outputHeight || Math.round(pixelCrop.height);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Failed to export cropped image'));
      else resolve(blob);
    }, mimeType, quality);
  });
}

export function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp)$/i.test(file.name || '');
}

export function toCroppedFile(blob, originalName, mimeType = 'image/jpeg') {
  const base = String(originalName || 'image').replace(/\.[^.]+$/, '');
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], `${base}-cropped.${ext}`, { type: mimeType });
}

export function pickOutputMime(originalFile, guideKey) {
  const name = originalFile?.name || '';
  const isPng = originalFile?.type === 'image/png' || /\.png$/i.test(name);
  if (isPng && ['logo', 'paymentLogo', 'favicon'].includes(guideKey)) {
    return 'image/png';
  }
  return 'image/jpeg';
}
