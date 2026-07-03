/**
 * Convert common video page URLs to embeddable sources.
 * Returns { type: 'iframe' | 'file', src: string } or null.
 */
export function resolveVideoEmbed(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  // Direct video files (uploaded / CDN)
  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(raw)) {
    return { type: 'file', src: raw };
  }

  // YouTube — already embed
  const ytEmbed = raw.match(/youtube\.com\/embed\/([^?&/]+)/i);
  if (ytEmbed) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytEmbed[1]}` };
  }

  // YouTube — watch, shorts, youtu.be
  const ytWatch = raw.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/i
  );
  if (ytWatch) {
    return { type: 'iframe', src: `https://www.youtube.com/embed/${ytWatch[1]}` };
  }

  // Vimeo — player URL
  const vimeoPlayer = raw.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (vimeoPlayer) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoPlayer[1]}` };
  }

  // Vimeo — page URL
  const vimeoPage = raw.match(/vimeo\.com\/(\d+)/i);
  if (vimeoPage) {
    return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeoPage[1]}` };
  }

  // Facebook video embed (basic)
  const fbEmbed = raw.match(/facebook\.com\/.*\/videos\/(?:embed\/)?(\d+)/i);
  if (fbEmbed && raw.includes('plugins/video.php')) {
    return { type: 'iframe', src: raw };
  }

  // Generic embed / iframe src pasted as-is
  if (/^https?:\/\//i.test(raw) && (raw.includes('/embed') || raw.includes('player.'))) {
    return { type: 'iframe', src: raw };
  }

  // Last resort for full https URLs
  if (/^https?:\/\//i.test(raw)) {
    return { type: 'iframe', src: raw };
  }

  return null;
}

export function getVideoUrlFromBlock(block) {
  return block?.settings?.url || block?.content || '';
}
