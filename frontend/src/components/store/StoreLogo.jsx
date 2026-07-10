import { useState } from 'react';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const VARIANTS = {
  header: 'h-8 sm:h-10 w-auto max-w-[140px] sm:max-w-[180px] object-contain',
  footer: 'h-20 sm:h-24 w-auto max-w-[220px] object-contain',
};

export default function StoreLogo({
  src,
  alt,
  storeName = 'KoseliXpress',
  variant = 'header',
  className = '',
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = resolveMediaUrl(src || '');
  const sizeClass = VARIANTS[variant] || VARIANTS.header;

  if (!logoUrl || failed) {
    return (
      <span className={`text-lg sm:text-2xl font-bold text-primary-600 text-center leading-tight ${className}`}>
        {storeName}
      </span>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt || storeName}
      className={`${sizeClass} ${className}`.trim()}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
