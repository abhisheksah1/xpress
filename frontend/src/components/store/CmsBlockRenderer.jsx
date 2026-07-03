import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { storeApi } from '../../api/store.js';
import ProductCard from './ProductCard.jsx';
import { applyCategoriesGridRules } from '../../utils/categoriesGrid.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { getDeliveryCountdownState, formatCutoffTimeLabel } from '../../utils/deliveryCountdown.js';
import { resolveVideoEmbed, getVideoUrlFromBlock } from '../../utils/videoEmbed.js';

function HeroBlock({ block }) {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 leading-tight">{block.title}</h1>
        {block.content && (
          <p className="text-base sm:text-lg md:text-xl text-primary-100 mb-6 sm:mb-8 max-w-2xl mx-auto whitespace-pre-line px-2">
            {block.content}
          </p>
        )}
        {block.buttonText && block.buttonLink && (
          <Link
            to={block.buttonLink}
            className="inline-block bg-white text-primary-600 px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors text-sm sm:text-base"
          >
            {block.buttonText}
          </Link>
        )}
      </div>
    </section>
  );
}

function BannerBlock({ block }) {
  const src = block.image?.url || block.images?.[0]?.url;
  return (
    <section className="cms-section-tight">
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 bg-slate-900 min-h-[240px] sm:min-h-[300px] md:min-h-[360px]">
        {src && (
          <img
            src={src}
            alt={block.image?.alt || block.title || ''}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/30" />
        <div className="relative z-10 flex flex-col justify-end min-h-[240px] sm:min-h-[300px] md:min-h-[360px] p-5 sm:p-8 md:p-10 text-white">
          {block.title && <h2 className="cms-title-lg leading-tight">{block.title}</h2>}
          {block.content && (
            <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-white/90 max-w-2xl whitespace-pre-line">
              {block.content}
            </p>
          )}
          {block.buttonText && block.buttonLink && (
            <Link
              to={block.buttonLink}
              className="inline-block mt-4 sm:mt-6 bg-white text-slate-900 px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-colors text-sm sm:text-base w-fit"
            >
              {block.buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function SliderBlock({ block }) {
  const slides = block.images?.length ? block.images : block.settings?.images || [];
  const [idx, setIdx] = useState(0);
  const intervalMs = block.settings?.intervalMs || 5000;

  useEffect(() => {
    if (!slides.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(t);
  }, [slides.length, intervalMs]);

  if (!slides.length) return null;
  const active = slides[idx];
  const url = active.url || active;

  return (
    <section className="cms-section-tight">
      <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 bg-white relative">
        <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[16/7] bg-gray-100">
          <img src={url} alt={active.alt || block.title || ''} className="w-full h-full object-cover" />
        </div>
        {(block.title || block.content) && (
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent flex items-end">
            <div className="p-4 sm:p-6 md:p-10 text-white max-w-3xl w-full">
              {block.title && <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold leading-tight">{block.title}</h2>}
              {block.content && (
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-lg text-white/90 whitespace-pre-line line-clamp-4 sm:line-clamp-none">
                  {block.content}
                </p>
              )}
            </div>
          </div>
        )}
        {slides.length > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-1.5 sm:gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`}
                onClick={() => setIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CategoriesGridBlock({ block }) {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    storeApi.getCategories({ withProductCount: true })
      .then((res) => setCategories(res.data.data || []))
      .catch(() => setCategories([]));
  }, []);

  const { items, cols } = useMemo(
    () => applyCategoriesGridRules(categories, block.settings),
    [categories, block.settings]
  );

  const title = block.title || 'Browse Categories';
  const colClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  }[Math.min(6, Math.max(2, cols))] || 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  if (!items.length) return null;

  return (
    <section className="cms-section">
      <div className="cms-section-header">
        <h2 className="cms-title">{title}</h2>
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="text-primary-600 text-sm font-medium hover:underline shrink-0">
            {block.buttonText}
          </Link>
        )}
      </div>
      <div className={`grid ${colClass} gap-3 sm:gap-4`}>
        {items.map((cat) => {
          const imageUrl = resolveMediaUrl(cat.image?.url);
          return (
            <Link
              key={cat._id}
              to={`/shop?category=${cat._id}`}
              className="card text-center py-4 sm:py-6 px-2 sm:px-3 hover:border-primary-300 transition-colors flex flex-col items-center gap-2 sm:gap-3 min-h-[100px] sm:min-h-[120px] justify-center"
            >
              {imageUrl ? (
                <img src={imageUrl} alt={cat.image?.alt || cat.name} className="w-10 h-10 sm:w-14 sm:h-14 object-cover rounded-lg" />
              ) : null}
              <span className="font-medium text-xs sm:text-sm leading-snug">{cat.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ProductGridBlock({ block }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => {
    const p = { limit: block.settings?.limit || 8 };
    if (block.settings?.categoryId) p.category = block.settings.categoryId;
    if (block.settings?.search) p.search = block.settings.search;
    if (block.settings?.isFeatured) p.isFeatured = true;
    return p;
  }, [block.settings]);

  useEffect(() => {
    setLoading(true);
    storeApi.getProducts(params).then((res) => setProducts(res.data.data.products || [])).catch(() => setProducts([])).finally(() => setLoading(false));
  }, [params]);

  return (
    <section className="cms-section">
      <div className="cms-section-header">
        <h2 className="cms-title">{block.title || 'Products'}</h2>
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="text-primary-600 text-sm font-medium hover:underline shrink-0">
            {block.buttonText}
          </Link>
        )}
      </div>
      {block.content && <p className="cms-body text-gray-600 mb-4 sm:mb-6 max-w-3xl whitespace-pre-line">{block.content}</p>}
      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function ImageContentBlock({ block }) {
  const src = resolveMediaUrl(block.image?.url || block.images?.[0]?.url);
  const layout = block.settings?.layout || block.settings?.imagePosition || 'left';
  const overlayPosition = block.settings?.overlayPosition || 'center';
  const overlayStyle = block.settings?.overlayStyle || 'dark';

  const contentBody = (
    <>
      {block.title && (
        <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 ${layout === 'overlay' ? 'text-white' : 'text-gray-900'}`}>
          {block.title}
        </h2>
      )}
      {block.content && (
        <div className={`cms-body whitespace-pre-line ${layout === 'overlay' ? 'text-white/90' : 'text-gray-600'}`}>
          {block.content}
        </div>
      )}
      {block.buttonText && block.buttonLink && (
        <Link
          to={block.buttonLink}
          className={`inline-block mt-4 sm:mt-6 px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
            layout === 'overlay'
              ? 'bg-white text-slate-900 hover:bg-white/90'
              : 'btn-primary'
          }`}
        >
          {block.buttonText}
        </Link>
      )}
    </>
  );

  const imageEl = (
    <div className="rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
      {src ? (
        <img src={src} alt={block.image?.alt || block.title || ''} className="w-full h-full object-cover min-h-[180px] sm:min-h-[220px]" />
      ) : (
        <div className="aspect-video min-h-[180px] sm:min-h-[220px]" />
      )}
    </div>
  );

  if (layout === 'overlay') {
    const overlayClass = {
      dark: 'bg-gradient-to-t sm:bg-gradient-to-r from-slate-900/85 via-slate-900/50 to-slate-900/20',
      light: 'bg-gradient-to-t sm:bg-gradient-to-r from-white/90 via-white/55 to-transparent',
      none: '',
    }[overlayStyle] || 'bg-gradient-to-t sm:bg-gradient-to-r from-slate-900/85 via-slate-900/50 to-slate-900/20';

    const positionClass = {
      top: 'justify-start items-start',
      center: 'justify-center items-start',
      bottom: 'justify-end items-start',
    }[overlayPosition] || 'justify-center items-start';

    const textLight = overlayStyle !== 'light';

    return (
      <section className="cms-section">
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden min-h-[280px] sm:min-h-[340px] md:min-h-[420px] border border-gray-100">
          {src ? (
            <img src={src} alt={block.image?.alt || block.title || ''} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gray-200" />
          )}
          {overlayStyle !== 'none' && <div className={`absolute inset-0 ${overlayClass}`} />}
          <div className={`relative z-10 flex flex-col min-h-[280px] sm:min-h-[340px] md:min-h-[420px] p-5 sm:p-8 md:p-12 ${positionClass}`}>
            <div className={`max-w-2xl w-full ${textLight ? '' : 'text-gray-900'}`}>
              {block.title && (
                <h2 className={`text-xl sm:text-2xl md:text-4xl font-bold mb-2 sm:mb-3 leading-tight ${textLight ? 'text-white' : 'text-gray-900'}`}>
                  {block.title}
                </h2>
              )}
              {block.content && (
                <div className={`cms-body md:text-lg whitespace-pre-line ${textLight ? 'text-white/90' : 'text-gray-700'}`}>
                  {block.content}
                </div>
              )}
              {block.buttonText && block.buttonLink && (
                <Link
                  to={block.buttonLink}
                  className={`inline-block mt-4 sm:mt-6 px-5 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                    textLight ? 'bg-white text-slate-900 hover:bg-white/90' : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {block.buttonText}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'top' || layout === 'bottom') {
    return (
      <section className="cms-section">
        <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl mx-auto">
          {layout === 'top' ? (
            <>
              {imageEl}
              <div>{contentBody}</div>
            </>
          ) : (
            <>
              <div>{contentBody}</div>
              {imageEl}
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="cms-section">
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-10 items-center ${layout === 'right' ? 'md:[&>*:first-child]:order-2' : ''}`}>
        {imageEl}
        <div>{contentBody}</div>
      </div>
    </section>
  );
}

function VideoBlock({ block }) {
  const rawUrl = getVideoUrlFromBlock(block);
  const embed = useMemo(() => resolveVideoEmbed(rawUrl), [rawUrl]);

  if (!embed) return null;

  return (
    <section className="cms-section-medium">
      {block.title && <h2 className="cms-title mb-4 sm:mb-6">{block.title}</h2>}
      <div className="aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-gray-100 bg-black w-full">
        {embed.type === 'file' ? (
          <video
            src={embed.src}
            controls
            playsInline
            className="w-full h-full object-contain bg-black"
            title={block.title || 'Video'}
          />
        ) : (
          <iframe
            src={embed.src}
            title={block.title || 'Video'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </div>
    </section>
  );
}

function HtmlEmbedBlock({ block }) {
  if (!block.content) return null;
  return (
    <section className="cms-section-medium">
      {block.title && <h2 className="cms-title mb-3 sm:mb-4">{block.title}</h2>}
      <div className="cms-embed rounded-xl border border-gray-100 bg-white p-3 sm:p-4" dangerouslySetInnerHTML={{ __html: block.content }} />
    </section>
  );
}

function GoogleReviewsBlock({ block }) {
  const cfg = block.settings || {};
  const reviews = (cfg.reviews || []).filter((r) => r.text || r.authorName);
  const [idx, setIdx] = useState(0);
  const intervalMs = cfg.intervalMs || 6000;

  useEffect(() => {
    if (reviews.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % reviews.length), intervalMs);
    return () => clearInterval(t);
  }, [reviews.length, intervalMs]);

  if (!reviews.length) return null;

  const active = reviews[idx];
  const placeUrl = cfg.placeUrl || block.buttonLink;
  const rating = cfg.rating;
  const totalReviews = cfg.totalReviews;

  return (
    <section className="cms-section">
      <div className="cms-section-header">
        <div className="min-w-0">
          <h2 className="cms-title">{block.title || 'Google Reviews'}</h2>
          {(rating != null || totalReviews != null) && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {rating != null && (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <span className="text-base sm:text-lg">{rating}</span>
                  <span>★</span>
                </span>
              )}
              {totalReviews != null && <span>{totalReviews} reviews on Google</span>}
              {cfg.placeName && <span className="truncate">· {cfg.placeName}</span>}
            </p>
          )}
          {block.content && (
            <p className="cms-body text-gray-600 mt-2 max-w-2xl whitespace-pre-line">{block.content}</p>
          )}
        </div>
        {placeUrl && (
          <a
            href={placeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary-600 text-sm font-medium hover:underline shrink-0"
          >
            {block.buttonText || 'View on Google'}
          </a>
        )}
      </div>

      <div className="relative rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 sm:px-8 md:px-12 py-8 sm:py-10 md:py-12 min-h-[200px] sm:min-h-[220px] flex flex-col justify-center">
          <div key={active.id || idx} className="max-w-3xl mx-auto text-center w-full">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              {active.authorPhoto ? (
                <img
                  src={active.authorPhoto}
                  alt=""
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-100 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                  {(active.authorName || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center sm:text-left min-w-0">
                <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{active.authorName || 'Google user'}</p>
                <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 text-amber-400 text-sm flex-wrap">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= (active.rating || 5) ? 'text-amber-400' : 'text-gray-200'}>★</span>
                  ))}
                  {active.relativeTime && (
                    <span className="text-xs text-slate-400">{active.relativeTime}</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-slate-700 text-sm sm:text-base md:text-lg leading-relaxed whitespace-pre-line px-1">
              &ldquo;{active.text}&rdquo;
            </p>
          </div>
        </div>

        {reviews.length > 1 && (
          <>
            <button
              type="button"
              className="hidden sm:flex absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/90 border border-gray-200 shadow text-slate-600 hover:bg-white items-center justify-center"
              onClick={() => setIdx((i) => (i - 1 + reviews.length) % reviews.length)}
              aria-label="Previous review"
            >
              ‹
            </button>
            <button
              type="button"
              className="hidden sm:flex absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/90 border border-gray-200 shadow text-slate-600 hover:bg-white items-center justify-center"
              onClick={() => setIdx((i) => (i + 1) % reviews.length)}
              aria-label="Next review"
            >
              ›
            </button>
            <div className="flex justify-center gap-2 pb-4 sm:pb-6 px-4">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${i === idx ? 'bg-primary-600' : 'bg-gray-300'}`}
                  onClick={() => setIdx(i)}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function DeliveryCountdownBlock({ block }) {
  const cfg = block.settings || {};
  const cutoff = cfg.cutoffTime || '17:00';
  const timeZone = cfg.timezone || 'Asia/Kathmandu';
  const btnText = cfg.buttonText || block.buttonText;
  const btnUrl = cfg.buttonUrl || block.buttonLink;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const state = useMemo(
    () => getDeliveryCountdownState({ nowMs: now, cutoffTime: cutoff, timeZone }),
    [now, cutoff, timeZone]
  );

  const isSameDay = state.phase === 'same_day';
  const mainTitle = isSameDay
    ? (cfg.titleSameDay || block.title || 'Need delivery today?')
    : (cfg.titleNextDay || block.title || 'Next-day delivery available');
  const countdownLabel = isSameDay
    ? (cfg.headingBefore || 'Order closing in...')
    : (cfg.headingAfter || 'Same-day delivery opens in...');
  const deliveryBadge = isSameDay ? 'Same-day delivery' : 'Next-day delivery';
  const cutoffNote = cfg.cutoffNote || `Zone Cutoff: ${formatCutoffTimeLabel(cutoff)} Time`;

  return (
    <section className="cms-section-tight">
      <div className="rounded-xl sm:rounded-2xl border border-rose-100 bg-white p-4 sm:p-6 md:p-10 text-center shadow-sm">
        <span className={`inline-block text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full mb-3 sm:mb-4 ${
          isSameDay ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {deliveryBadge}
        </span>
        <h2 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-rose-700 mb-2 leading-snug px-1">{mainTitle}</h2>
        {block.content && (
          <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4 max-w-2xl mx-auto whitespace-pre-line px-1">{block.content}</p>
        )}
        <p className="text-sm sm:text-base text-slate-500 font-medium mb-4 sm:mb-6">{countdownLabel}</p>
        <div className="flex flex-wrap items-stretch justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 max-w-md sm:max-w-none mx-auto">
          {[
            { label: 'Hours', value: String(state.hours).padStart(2, '0') },
            { label: 'Minutes', value: String(state.mins).padStart(2, '0') },
            { label: 'Seconds', value: String(state.secs).padStart(2, '0') },
          ].map((x) => (
            <div key={x.label} className="flex-1 sm:flex-none rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 px-3 sm:px-5 py-3 sm:py-4 text-center min-w-[72px] sm:min-w-[90px] md:min-w-[100px]">
              <div className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">{x.value}</div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-0.5 sm:mt-1">{x.label}</div>
            </div>
          ))}
        </div>
        {btnText && btnUrl && (
          <Link to={btnUrl} className="btn-primary inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wide w-full sm:w-auto max-w-xs sm:max-w-none mx-auto">
            {btnText}
          </Link>
        )}
        {cfg.showCutoffNote !== false && (
          <p className="text-[10px] sm:text-xs text-slate-400 mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-1.5 px-2">
            <span aria-hidden>🕐</span>
            <span>{cutoffNote}</span>
          </p>
        )}
      </div>
    </section>
  );
}

function TextBlock({ block }) {
  const level = block.settings?.headingLevel || 'h2';
  const linkUrl = block.settings?.linkUrl;

  const Heading = ({ children }) => {
    if (level === 'h1') return <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-3 sm:mb-4 leading-tight">{children}</h1>;
    if (level === 'h3') return <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{children}</h3>;
    if (level === 'p') return <p className="cms-body text-gray-600 mb-3">{children}</p>;
    return <h2 className="cms-title mb-3 sm:mb-4">{children}</h2>;
  };

  const features = block.settings?.features;
  if (block.settings?.layout === 'features' && features?.length) {
    return (
      <section className="cms-section">
        {block.title && <h2 className="cms-title text-center mb-6 sm:mb-8">{block.title}</h2>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((item) => (
            <div key={item.title} className="card text-center">
              <h3 className="font-semibold text-base sm:text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="cms-section-narrow">
      {block.title && <Heading>{block.title}</Heading>}
      {block.content && <div className="cms-body text-gray-600 whitespace-pre-line">{block.content}</div>}
      {linkUrl && (
        <a href={linkUrl} className="inline-block mt-4 text-primary-600 font-medium hover:underline text-sm sm:text-base" target={linkUrl.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
          {block.buttonText || 'Learn more'}
        </a>
      )}
    </section>
  );
}

function CtaBlock({ block }) {
  return (
    <section className="bg-primary-50 py-8 sm:py-10 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {block.title && <h2 className="cms-title mb-2 sm:mb-3">{block.title}</h2>}
        {block.content && <p className="cms-body text-gray-600 mb-4 sm:mb-6 max-w-2xl mx-auto">{block.content}</p>}
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="btn-primary inline-block text-sm sm:text-base">{block.buttonText}</Link>
        )}
      </div>
    </section>
  );
}

function parseFaqItems(block) {
  const stored = block.settings?.items || [];
  const valid = stored.filter((item) => item.q?.trim() || item.a?.trim());
  if (valid.length) return valid;

  if (!block.content?.trim()) return [];
  return block.content
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => ({
      q: (chunk.match(/^Q:\s*(.*)$/m)?.[1] || '').trim(),
      a: (chunk.match(/^A:\s*([\s\S]*)$/m)?.[1] || '').trim(),
    }))
    .filter((item) => item.q && item.a);
}

function FaqBlock({ block }) {
  const items = parseFaqItems(block);
  const [openIndex, setOpenIndex] = useState(null);

  if (!items.length) return null;

  return (
    <section className="cms-section-narrow">
      {block.title && (
        <h2 className="cms-title text-center mb-2 sm:mb-3">{block.title}</h2>
      )}
      {block.content && (
        <p className="cms-body text-gray-500 text-center mb-6 sm:mb-8 max-w-2xl mx-auto whitespace-pre-line">
          {block.content}
        </p>
      )}
      <div className="space-y-2 sm:space-y-3">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 sm:py-4 text-left font-semibold text-sm sm:text-base text-slate-900 hover:bg-gray-50 transition-colors"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span className="min-w-0">{item.q}</span>
                <span
                  className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-lg font-light border transition-colors ${
                    isOpen
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-primary-600 border-primary-200'
                  }`}
                  aria-hidden
                >
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm sm:text-base text-gray-600 leading-relaxed border-t border-gray-100 pt-3 sm:pt-4 whitespace-pre-line">
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ImageBlock({ block }) {
  const src = block.image?.url || block.images?.[0]?.url;
  if (!src) return null;
  return (
    <section className="cms-section-medium">
      <img src={src} alt={block.image?.alt || block.title || ''} className="w-full h-auto rounded-lg sm:rounded-xl" />
    </section>
  );
}

function TestimonialBlock({ block }) {
  const items = block.settings?.items || [];
  return (
    <section className="cms-section">
      {block.title && <h2 className="cms-title text-center mb-6 sm:mb-8">{block.title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {items.map((t, i) => (
          <div key={i} className="card">
            <p className="text-gray-600 text-sm italic mb-2 sm:mb-3 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <p className="font-medium text-sm">{t.author}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function CmsBlockRenderer({ blocks = [] }) {
  const sorted = [...blocks].filter((b) => b.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="cms-page">
      {sorted.map((block) => {
        switch (block.type) {
          case 'hero': return <HeroBlock key={block._id} block={block} />;
          case 'banner': return <BannerBlock key={block._id} block={block} />;
          case 'slider': return <SliderBlock key={block._id} block={block} />;
          case 'categories_grid': return <CategoriesGridBlock key={block._id} block={block} />;
          case 'product_grid': return <ProductGridBlock key={block._id} block={block} />;
          case 'image_content': return <ImageContentBlock key={block._id} block={block} />;
          case 'video': return <VideoBlock key={block._id} block={block} />;
          case 'text': return <TextBlock key={block._id} block={block} />;
          case 'cta': return <CtaBlock key={block._id} block={block} />;
          case 'faq': return <FaqBlock key={block._id} block={block} />;
          case 'google_reviews': return <GoogleReviewsBlock key={block._id} block={block} />;
          case 'html_embed': return <HtmlEmbedBlock key={block._id} block={block} />;
          case 'delivery_countdown': return <DeliveryCountdownBlock key={block._id} block={block} />;
          case 'image': return <ImageBlock key={block._id} block={block} />;
          case 'testimonial': return <TestimonialBlock key={block._id} block={block} />;
          default: return block.content ? <TextBlock key={block._id} block={block} /> : null;
        }
      })}
    </div>
  );
}
