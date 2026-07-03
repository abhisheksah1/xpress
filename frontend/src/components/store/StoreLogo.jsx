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
  tile = false,
  className = '',
}) {
  const logoUrl = resolveMediaUrl(src || '');
  const sizeClass = VARIANTS[variant] || VARIANTS.header;

  if (!logoUrl) {
    return (
      <span className={`text-lg sm:text-2xl font-bold text-primary-600 text-center leading-tight ${className}`}>
        {storeName}
      </span>
    );
  }

  const img = (
    <img
      src={logoUrl}
      alt={alt || storeName}
      className={`${sizeClass} ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );

  if (tile) {
    return (
      <span className="inline-flex items-center justify-center rounded-md bg-black p-2 sm:p-3 shadow-sm">
        {img}
      </span>
    );
  }

  return img;
}
