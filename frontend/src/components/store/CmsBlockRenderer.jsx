import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { storeApi } from '../../api/store.js';
import ProductCard from './ProductCard.jsx';

function HeroBlock({ block }) {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-24">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">{block.title}</h1>
        {block.content && (
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto whitespace-pre-line">{block.content}</p>
        )}
        {block.buttonText && block.buttonLink && (
          <Link
            to={block.buttonLink}
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
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
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
        {src && <img src={src} alt={block.image?.alt || block.title || ''} className="w-full h-[260px] md:h-[340px] object-cover" />}
        <div className="p-6 md:p-10 bg-gradient-to-r from-slate-900/70 to-slate-900/20 text-white -mt-[260px] md:-mt-[340px] relative">
          {block.title && <h2 className="text-2xl md:text-4xl font-extrabold">{block.title}</h2>}
          {block.content && <p className="mt-3 text-sm md:text-lg text-white/90 max-w-2xl whitespace-pre-line">{block.content}</p>}
          {block.buttonText && block.buttonLink && (
            <Link to={block.buttonLink} className="inline-block mt-6 bg-white text-slate-900 px-6 py-2.5 rounded-lg font-semibold hover:bg-white/90 transition-colors">
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
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white relative">
        <div className="aspect-[16/7] bg-gray-100">
          <img src={url} alt={active.alt || block.title || ''} className="w-full h-full object-cover" />
        </div>
        {(block.title || block.content) && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/30 to-transparent flex items-end">
            <div className="p-6 md:p-10 text-white max-w-3xl">
              {block.title && <h2 className="text-2xl md:text-4xl font-extrabold">{block.title}</h2>}
              {block.content && <p className="mt-3 text-sm md:text-lg text-white/90 whitespace-pre-line">{block.content}</p>}
            </div>
          </div>
        )}
        {slides.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`w-2.5 h-2.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`}
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
    storeApi.getCategories().then((res) => setCategories(res.data.data || [])).catch(() => setCategories([]));
  }, []);

  const title = block.title || 'Browse Categories';
  const cols = block.settings?.cols || 4;

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-end justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold">{title}</h2>
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="text-primary-600 text-sm font-medium hover:underline">{block.buttonText}</Link>
        )}
      </div>
      <div className={`grid grid-cols-2 md:grid-cols-${Math.min(6, Math.max(2, cols))} gap-4`}>
        {categories.map((cat) => (
          <Link
            key={cat._id}
            to={`/shop?category=${cat._id}`}
            className="card text-center py-6 hover:border-primary-300 transition-colors"
          >
            <span className="font-medium text-sm">{cat.name}</span>
          </Link>
        ))}
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
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-end justify-between gap-4 mb-8">
        <h2 className="text-2xl font-bold">{block.title || 'Products'}</h2>
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="text-primary-600 text-sm font-medium hover:underline">{block.buttonText}</Link>
        )}
      </div>
      {block.content && <p className="text-sm text-gray-600 mb-6 max-w-3xl whitespace-pre-line">{block.content}</p>}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function ImageContentBlock({ block }) {
  const src = block.image?.url || block.images?.[0]?.url;
  const align = block.settings?.imagePosition || 'left'; // left|right
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className={`grid md:grid-cols-2 gap-10 items-center ${align === 'right' ? 'md:[&>*:first-child]:order-2' : ''}`}>
        <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-100">
          {src ? <img src={src} alt={block.image?.alt || block.title || ''} className="w-full h-full object-cover" /> : <div className="aspect-video" />}
        </div>
        <div>
          {block.title && <h2 className="text-2xl font-bold mb-3">{block.title}</h2>}
          {block.content && <div className="prose text-gray-600 whitespace-pre-line">{block.content}</div>}
          {block.buttonText && block.buttonLink && (
            <Link to={block.buttonLink} className="btn-primary inline-block mt-6">{block.buttonText}</Link>
          )}
        </div>
      </div>
    </section>
  );
}

function VideoBlock({ block }) {
  const url = block.settings?.url || block.content;
  if (!url) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      {block.title && <h2 className="text-2xl font-bold mb-6">{block.title}</h2>}
      <div className="aspect-video rounded-2xl overflow-hidden border border-gray-100 bg-black">
        <iframe
          src={url}
          title={block.title || 'Video'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}

function HtmlEmbedBlock({ block }) {
  if (!block.content) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      {block.title && <h2 className="text-2xl font-bold mb-4">{block.title}</h2>}
      <div className="rounded-xl border border-gray-100 bg-white p-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: block.content }} />
    </section>
  );
}

function GoogleReviewsBlock({ block }) {
  const iframeUrl = block.settings?.iframeUrl || block.content;
  if (!iframeUrl) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-end justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold">{block.title || 'Google Reviews'}</h2>
        {block.buttonText && block.buttonLink && (
          <a href={block.buttonLink} target="_blank" rel="noreferrer" className="text-primary-600 text-sm font-medium hover:underline">
            {block.buttonText}
          </a>
        )}
      </div>
      <div className="rounded-2xl overflow-hidden border border-gray-100 bg-white">
        <iframe src={iframeUrl} title="Google Reviews" className="w-full h-[520px]" loading="lazy" />
      </div>
    </section>
  );
}

function DeliveryCountdownBlock({ block }) {
  const cfg = block.settings || {};
  const cutoff = cfg.cutoffTime || '16:00';
  const labelBefore = cfg.headingBefore || 'Order closing in...';
  const labelAfter = cfg.headingAfter || 'Orders open again in...';
  const btnText = cfg.buttonText;
  const btnUrl = cfg.buttonUrl;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = useMemo(() => {
    const d = new Date(now);
    const [h, m] = String(cutoff).split(':').map((x) => Number(x));
    d.setHours(h || 0, m || 0, 0, 0);
    if (d.getTime() < now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }, [now, cutoff]);

  const diff = Math.max(0, target - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  const isBefore = diff > 0;

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="rounded-2xl border border-rose-100 bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{block.title || (isBefore ? labelBefore : labelAfter)}</h2>
          {block.content && <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">{block.content}</p>}
        </div>
        <div className="flex items-center gap-3">
          {[
            { label: 'Hours', value: String(hours).padStart(2, '0') },
            { label: 'Minutes', value: String(mins).padStart(2, '0') },
            { label: 'Seconds', value: String(secs).padStart(2, '0') },
          ].map((x) => (
            <div key={x.label} className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center min-w-[90px]">
              <div className="text-2xl font-black text-primary-600">{x.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{x.label}</div>
            </div>
          ))}
          {btnText && btnUrl && (
            <Link to={btnUrl} className="btn-primary ml-2">{btnText}</Link>
          )}
        </div>
      </div>
    </section>
  );
}

function TextBlock({ block }) {
  const level = block.settings?.headingLevel || 'h2';
  const linkUrl = block.settings?.linkUrl;

  const Heading = ({ children }) => {
    if (level === 'h1') return <h1 className="text-3xl md:text-5xl font-extrabold mb-4">{children}</h1>;
    if (level === 'h3') return <h3 className="text-xl font-bold mb-3">{children}</h3>;
    if (level === 'p') return <p className="text-gray-600 mb-3">{children}</p>;
    return <h2 className="text-2xl font-bold mb-4">{children}</h2>;
  };

  const features = block.settings?.features;
  if (block.settings?.layout === 'features' && features?.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        {block.title && <h2 className="text-2xl font-bold text-center mb-8">{block.title}</h2>}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((item) => (
            <div key={item.title} className="card text-center">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="max-w-4xl mx-auto px-4 py-12">
      {block.title && <Heading>{block.title}</Heading>}
      {block.content && <div className="prose text-gray-600 whitespace-pre-line">{block.content}</div>}
      {linkUrl && (
        <a href={linkUrl} className="inline-block mt-4 text-primary-600 font-medium hover:underline" target={linkUrl.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
          {block.buttonText || 'Learn more'}
        </a>
      )}
    </section>
  );
}

function CtaBlock({ block }) {
  return (
    <section className="bg-primary-50 py-12">
      <div className="max-w-4xl mx-auto px-4 text-center">
        {block.title && <h2 className="text-2xl font-bold mb-3">{block.title}</h2>}
        {block.content && <p className="text-gray-600 mb-6">{block.content}</p>}
        {block.buttonText && block.buttonLink && (
          <Link to={block.buttonLink} className="btn-primary">{block.buttonText}</Link>
        )}
      </div>
    </section>
  );
}

function FaqBlock({ block }) {
  const items = block.settings?.items || [];
  return (
    <section className="max-w-3xl mx-auto px-4 py-12">
      {block.title && <h2 className="text-2xl font-bold mb-6">{block.title}</h2>}
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="card">
            <h3 className="font-semibold mb-2">{item.q}</h3>
            <p className="text-gray-600 text-sm">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageBlock({ block }) {
  const src = block.image?.url || block.images?.[0]?.url;
  if (!src) return null;
  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <img src={src} alt={block.image?.alt || block.title || ''} className="w-full rounded-xl" />
    </section>
  );
}

function TestimonialBlock({ block }) {
  const items = block.settings?.items || [];
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      {block.title && <h2 className="text-2xl font-bold text-center mb-8">{block.title}</h2>}
      <div className="grid md:grid-cols-3 gap-6">
        {items.map((t, i) => (
          <div key={i} className="card">
            <p className="text-gray-600 text-sm italic mb-3">&ldquo;{t.quote}&rdquo;</p>
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
    <>
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
    </>
  );
}
