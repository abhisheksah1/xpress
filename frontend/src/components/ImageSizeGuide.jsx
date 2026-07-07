import { getImageSizeGuide } from '../utils/imageSizeGuides.js';

const VARIANT_STYLES = {
  admin: {
    wrap: 'px-3 py-2 border-b border-slate-100 bg-blue-50/80',
    title: 'text-xs font-semibold text-blue-900',
    list: 'mt-1 space-y-0.5 text-xs text-blue-800/90 list-disc list-inside',
    compact: 'text-xs text-blue-800/90',
  },
  store: {
    wrap: 'rounded-lg border border-rose-100 bg-rose-50/70 px-3 py-2',
    title: 'text-xs font-semibold text-rose-900',
    list: 'mt-1 space-y-0.5 text-xs text-rose-800/90 list-disc list-inside',
    compact: 'text-xs text-rose-700/90',
  },
  muted: {
    wrap: 'rounded-lg border border-slate-100 bg-slate-50 px-3 py-2',
    title: 'text-xs font-semibold text-slate-700',
    list: 'mt-1 space-y-0.5 text-xs text-slate-600 list-disc list-inside',
    compact: 'text-xs text-slate-500',
  },
};

export default function ImageSizeGuide({
  guide = 'cmsContent',
  variant = 'admin',
  compact = false,
  className = '',
}) {
  const config = getImageSizeGuide(guide);
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.admin;

  if (compact) {
    return (
      <p className={`${styles.compact} ${className}`}>
        {config.compact || config.lines[0]}
      </p>
    );
  }

  return (
    <div className={`${styles.wrap} ${className}`}>
      <p className={styles.title}>{config.title}</p>
      <ul className={styles.list}>
        {config.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
