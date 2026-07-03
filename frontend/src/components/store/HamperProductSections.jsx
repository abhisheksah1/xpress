import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ProductDeliverySchedule,
  ProductWhatsappHelp,
} from './ProductPageInfo.jsx';

function SectionHeading({ icon, children }) {
  return (
    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-800 flex items-center gap-2 mb-4">
      {icon && <span className="text-base shrink-0" aria-hidden>{icon}</span>}
      {children}
    </h2>
  );
}

export function HamperProductDescription({ product }) {
  const text = product?.longDescription || product?.description || product?.shortDescription;
  if (!text?.trim()) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/80">
        <SectionHeading>Product Description</SectionHeading>
      </div>
      <div className="px-4 sm:px-5 py-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
        {text}
      </div>
    </section>
  );
}

export function HamperComboIncludes({ comboItems }) {
  if (!comboItems?.length) return null;

  return (
    <section className="rounded-xl border border-blue-100 bg-white overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-blue-100 bg-blue-50/60">
        <SectionHeading icon="🎁">Beautifully Included in This Combo</SectionHeading>
      </div>
      <ul className="divide-y divide-dashed divide-slate-200">
        {comboItems.map((item, index) => {
          const p = item.product;
          const img = p?.images?.find((i) => i.isPrimary) || p?.images?.[0];
          const desc = p?.shortDescription || p?.description || '';
          const qty = item.quantity > 1 ? ` ×${item.quantity}` : '';

          return (
            <li key={p?._id || index} className="px-4 sm:px-5 py-4 flex gap-4">
              <span className="shrink-0 w-7 h-7 rounded-full bg-rose-100 text-rose-600 text-xs font-black flex items-center justify-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-3">
                  {img?.url && (
                    <img
                      src={img.url}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-slate-100 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    {p?.slug ? (
                      <Link
                        to={`/shop/${p.slug}`}
                        className="font-bold text-slate-900 hover:text-primary-600 text-sm sm:text-base leading-snug"
                      >
                        {p.name}
                        {qty}
                      </Link>
                    ) : (
                      <p className="font-bold text-slate-900 text-sm sm:text-base">
                        {p?.name || 'Product'}
                        {qty}
                      </p>
                    )}
                    {desc && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HamperComplianceSla({ message }) {
  if (!message?.trim()) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200">
        <SectionHeading icon="📢">Compliance &amp; Gifting SLA</SectionHeading>
      </div>
      <div className="px-4 sm:px-5 py-4 flex gap-3">
        <span className="text-xl shrink-0" aria-hidden>📣</span>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
    </section>
  );
}

export function HamperDisclaimer({ terms, additionalNote }) {
  const text = [terms, additionalNote].filter(Boolean).join('\n\n');
  if (!text.trim()) return null;

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 sm:px-5 py-4">
      <p className="text-xs sm:text-sm text-rose-900 leading-relaxed whitespace-pre-line">{text}</p>
    </section>
  );
}

export function ProductReviewsHub({ count = 0 }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-slate-50/80">
        <SectionHeading>Customer Review Hub ({count})</SectionHeading>
      </div>
      <div className="px-4 sm:px-5 py-6 text-center">
        {count > 0 ? (
          <p className="text-sm text-slate-500">Reviews will appear here.</p>
        ) : (
          <p className="text-sm text-slate-500">No client reviews published for this item yet.</p>
        )}
        <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
          <span aria-hidden>🔒</span>
          Reviews are unlocked only after successful delivery.
        </div>
      </div>
    </section>
  );
}

export function HamperComplementsList({ products, formatPriceNpr, onAddToBasket }) {
  if (!products?.length) return null;

  return (
    <section>
      <SectionHeading icon="❤️">You May Also Like (Recommended Complements)</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map((p) => {
          const img = p.images?.find((i) => i.isPrimary)?.url || p.images?.[0]?.url;
          const soldOut = (p.stock ?? 0) <= 0;

          return (
            <div
              key={p._id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <Link to={`/shop/${p.slug}`} className="shrink-0">
                {img ? (
                  <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-100" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-100" />
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/shop/${p.slug}`}
                  className="text-sm font-semibold text-slate-800 hover:text-primary-600 line-clamp-2 leading-snug"
                >
                  {p.name}
                </Link>
                <p className="text-sm font-bold text-rose-600 mt-1 font-mono">{formatPriceNpr(p.price)}</p>
              </div>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => onAddToBasket(p)}
                className="shrink-0 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-colors"
              >
                + Basket
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HamperProductInfoSections({
  product,
  settings,
  comboItems,
  related,
  formatPriceNpr,
  onAddRelated,
}) {
  const deliverySchedules = product.deliveryInfo || [];

  return (
    <div className="mt-10 space-y-6 max-w-5xl">
      <HamperProductDescription product={product} />
      <HamperComboIncludes comboItems={comboItems} />
      <HamperComplianceSla message={settings.product_page_alert_message} />
      {product.deliveryScheduleNote && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {product.deliveryScheduleNote}
        </div>
      )}
      <ProductDeliverySchedule
        schedules={deliverySchedules}
        disclaimer={settings.product_delivery_schedule_disclaimer}
        tierLabel={settings.product_delivery_location_tier_label || 'Location Tier'}
        compact
      />
      <HamperDisclaimer
        terms={settings.product_page_short_terms}
        additionalNote={product.additionalNote}
      />
      <ProductWhatsappHelp settings={settings} />
      <ProductReviewsHub count={0} />
      <HamperComplementsList
        products={related}
        formatPriceNpr={formatPriceNpr}
        onAddToBasket={onAddRelated}
      />
    </div>
  );
}

export function quickAddToBasket(addItem, product) {
  if ((product.stock ?? 0) <= 0) {
    toast.error('This item is out of stock');
    return;
  }
  addItem(
    {
      _id: product._id,
      name: product.name,
      price: product.price,
      images: product.images,
      selectedOptions: [],
      optionsKey: '',
    },
    1,
    null
  );
  toast.success('Added to basket');
}
