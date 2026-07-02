import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import { useCartStore } from '../../store/cartStore.js';
import ProductCard from '../../components/store/ProductCard.jsx';
import ProductPersonalization, {
  emptyPersonalization,
  hasPersonalization,
  validatePersonalization,
} from '../../components/store/ProductPersonalization.jsx';
import {
  ProductPageAlert,
  ProductDeliverySchedule,
  ProductWhatsappHelp,
  ProductShortTerms,
} from '../../components/store/ProductPageInfo.jsx';

function buildGallery(product, comboComponents) {
  const base = product?.images?.length
    ? [...product.images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((i) => i.url)
    : [];
  if (!product?.isHamper || !comboComponents.length) return base;

  const urls = new Set(base);
  for (const p of comboComponents) {
    const img = p?.images?.find((i) => i.isPrimary) || p?.images?.[0];
    if (img?.url && !urls.has(img.url)) {
      base.push(img.url);
      urls.add(img.url);
    }
  }
  return base;
}

function optionsKey(selectedOptions) {
  if (!selectedOptions?.length) return '';
  return selectedOptions.map((o) => `${o.category}:${o.label}`).sort().join('|');
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { settings, formatPriceNpr } = useStore();
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [qty, setQty] = useState(1);
  const [personalization, setPersonalization] = useState({});
  const [activeImage, setActiveImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});

  const fields = product?.personalizationFields || {};
  const comboItems = product?.isHamper ? product.comboItems || [] : [];
  const comboComponents = comboItems.map((i) => i.product).filter(Boolean);
  const gallery = useMemo(() => buildGallery(product, comboComponents), [product, comboComponents]);

  useEffect(() => {
    storeApi
      .getProduct(slug)
      .then((res) => {
        const p = res.data.data;
        setProduct(p);
        setPersonalization(emptyPersonalization(p.personalizationFields || {}));
        setActiveImage(0);
        setQty(1);

        const initial = {};
        (p.optionCategories || []).forEach((cat, index) => {
          const catId = cat._id || `cat-${index}`;
          if (cat.options?.[0]) {
            initial[catId] = cat.options[0];
          }
        });
        setSelectedOptions(initial);

        const catId = p.category?._id || p.category;
        if (catId) {
          storeApi
            .getProducts({ category: catId, limit: 5 })
            .then((r) => {
              const list = (r.data.data?.products || []).filter((item) => item.slug !== p.slug);
              setRelated(list.slice(0, 4));
            })
            .catch(() => setRelated([]));
        }
      })
      .catch(() => toast.error('Product not found'));
  }, [slug]);

  const showPersonalization = useMemo(
    () => product && hasPersonalization(product.personalizationFields),
    [product]
  );

  const optionAdjustment = useMemo(() => {
    return Object.values(selectedOptions).reduce((sum, opt) => sum + (opt?.priceAdjustment || 0), 0);
  }, [selectedOptions]);

  const basePrice = product?.price ?? 0;
  const comparePrice = product?.compareAtPrice ?? 0;
  const hasDiscount = comparePrice > basePrice;
  const unitPrice = basePrice + optionAdjustment;
  const displayCompare = hasDiscount ? comparePrice + optionAdjustment : null;
  const discountPct = hasDiscount ? Math.round(((comparePrice - basePrice) / comparePrice) * 100) : 0;
  const soldOut = (product?.stock ?? 0) <= 0;
  const lowStock = !soldOut && product?.lowStockThreshold != null && product.stock <= product.lowStockThreshold;

  const handleAddToCart = () => {
    if (showPersonalization) {
      const error = validatePersonalization(fields, personalization);
      if (error) {
        toast.error(error);
        return;
      }
    }

    const optionsList = (product.optionCategories || []).map((cat, index) => {
      const catId = cat._id || `cat-${index}`;
      const chosen = selectedOptions[catId];
      if (!chosen) return null;
      return { category: cat.name, label: chosen.label, priceAdjustment: chosen.priceAdjustment || 0 };
    }).filter(Boolean);

    addItem(
      {
        _id: product._id,
        name: product.name,
        price: unitPrice,
        images: product.images,
        selectedOptions: optionsList,
        optionsKey: optionsKey(optionsList),
      },
      qty,
      showPersonalization ? personalization : null
    );
    toast.success('Added to basket');
  };

  if (!product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FCF9F9]">
        <p className="text-gray-400 text-sm">Loading product...</p>
      </div>
    );
  }

  const deliverySchedules = product.deliveryInfo || [];

  return (
    <div className="bg-[#FCF9F9] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <nav className="text-xs text-gray-500 mb-6 flex flex-wrap items-center gap-1.5">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary-600">Shop</Link>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link
                to={`/shop?category=${product.category._id || product.category}`}
                className="hover:text-primary-600"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-rose-100 bg-white relative">
              {gallery[activeImage] ? (
                <img
                  src={gallery[activeImage]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
              )}

              {product.isHamper && comboComponents.length > 0 && (
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-rose-100/60 max-w-[90%]">
                  <p className="text-[9px] uppercase tracking-wider font-extrabold text-rose-800 font-mono mb-2">
                    Combo includes ({comboComponents.length})
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {comboComponents.slice(0, 5).map((p, i) => {
                      const img = p.images?.find((x) => x.isPrimary) || p.images?.[0];
                      return (
                        <img
                          key={p._id || i}
                          src={img?.url}
                          alt={p.name}
                          title={p.name}
                          className="w-10 h-10 object-cover rounded-xl border border-rose-100 shadow-sm"
                        />
                      );
                    })}
                    {comboComponents.length > 5 && (
                      <span className="w-10 h-10 bg-rose-50 border border-rose-150 text-xs text-rose-800 font-bold flex items-center justify-center rounded-xl">
                        +{comboComponents.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {product.isHamper && (
                <span className="absolute top-3 left-3 bg-white/95 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm border border-rose-100 flex items-center gap-1">
                  Combo Gift
                </span>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {gallery.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImage === index
                        ? 'border-amber-500 ring-2 ring-amber-500/20 scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              {product.brand && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">{product.brand}</p>
              )}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{product.name}</h1>
              {product.category?.name && (
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-2">
                  Category: {product.category.name}
                </p>
              )}
            </div>

            {(product.shortDescription || product.description) && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.shortDescription || product.description}
              </p>
            )}

            <div className="p-4 rounded-2xl bg-white border border-rose-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Price</p>
                <div className="flex items-baseline flex-wrap gap-2">
                  {displayCompare != null && (
                    <span className="text-sm line-through text-slate-400 font-semibold">
                      {formatPriceNpr(displayCompare)}
                    </span>
                  )}
                  <span className="text-3xl font-black text-amber-500 font-mono">
                    {formatPriceNpr(unitPrice)}
                  </span>
                  {hasDiscount && (
                    <span className="bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">
                      {discountPct}% OFF
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 italic mt-1">(shipping calculated at checkout)</p>
              </div>
              <span
                className={`inline-block px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg border shrink-0 ${
                  soldOut
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                }`}
              >
                {soldOut ? 'Sold Out' : 'Available'}
              </span>
            </div>

            {lowStock && (
              <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Only {product.stock} left in stock
              </p>
            )}

            {(product.optionCategories || []).map((cat, index) => {
              const catId = cat._id || `cat-${index}`;
              const chosen = selectedOptions[catId];
              return (
                <div key={catId} className="p-4 rounded-xl bg-white border border-rose-100 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select {cat.name}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(cat.options || []).map((opt) => {
                      const active = chosen?.label === opt.label;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setSelectedOptions((prev) => ({ ...prev, [catId]: opt }))}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                            active
                              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                          {opt.priceAdjustment ? (
                            <span className="ml-1 font-mono text-[10px]">
                              {opt.priceAdjustment > 0 ? '+' : ''}
                              +{formatPriceNpr(opt.priceAdjustment)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {comboItems.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-amber-100 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">What&apos;s in this combo</h2>
                <ul className="space-y-2">
                  {comboItems.map((item, index) => {
                    const p = item.product;
                    const img = p?.images?.find((i) => i.isPrimary) || p?.images?.[0];
                    const componentOos = (p?.stock ?? 0) <= 0;
                    return (
                      <li
                        key={`${p?._id || index}`}
                        className={`flex items-center gap-3 text-sm rounded-lg p-2 ${
                          componentOos ? 'bg-red-50 border border-red-100' : 'bg-amber-50/50'
                        }`}
                      >
                        {img?.url ? (
                          <img src={img.url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          {p?.slug ? (
                            <Link to={`/shop/${p.slug}`} className="font-semibold text-slate-800 hover:text-primary-600">
                              {p.name}
                            </Link>
                          ) : (
                            <span className="font-semibold text-slate-800">{p?.name || 'Product'}</span>
                          )}
                          <p className={`text-xs ${componentOos ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                            {componentOos ? 'Out of stock' : `Stock: ${p.stock}`}
                            {item.quantity > 1 && ` · Qty ×${item.quantity}`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {showPersonalization && (
              <ProductPersonalization
                personalizationFields={fields}
                values={personalization}
                onChange={setPersonalization}
              />
            )}

            <div className="flex items-stretch gap-3">
              <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                <button
                  type="button"
                  className="px-3 py-3 text-slate-500 hover:bg-slate-50 font-bold"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={soldOut}
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock || 1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(product.stock || 1, Number(e.target.value) || 1)))}
                  className="w-12 text-center text-sm font-bold border-x border-slate-200 py-3 outline-none"
                  disabled={soldOut}
                />
                <button
                  type="button"
                  className="px-3 py-3 text-slate-500 hover:bg-slate-50 font-bold"
                  onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                  disabled={soldOut}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={soldOut}
                className="flex-1 bg-[#e11d48] hover:bg-[#be123c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl px-6 py-3 text-sm uppercase tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>+</span> Basket
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              {product.sku && (
                <p>
                  <span className="font-semibold text-slate-600">SKU:</span> {product.sku}
                </p>
              )}
              {product.standardSize && (
                <p>
                  <span className="font-semibold text-slate-600">Size:</span> {product.standardSize}
                </p>
              )}
              {product.weight != null && (
                <p>
                  <span className="font-semibold text-slate-600">Weight:</span> {product.weight} kg
                </p>
              )}
              {!soldOut && (
                <p>
                  <span className="font-semibold text-slate-600">Stock:</span> {product.stock}
                  {product.isHamper && ' (from components)'}
                </p>
              )}
            </div>

            {product.additionalNote && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold uppercase tracking-wide text-[10px] block mb-1">Important note</span>
                {product.additionalNote}
              </div>
            )}
          </div>
        </div>

        <section className="mt-10 space-y-5 max-w-5xl">
          <ProductPageAlert message={settings.product_page_alert_message} />
          {product.deliveryScheduleNote && (
            <ProductPageAlert message={product.deliveryScheduleNote} />
          )}
          <ProductDeliverySchedule
            schedules={deliverySchedules}
            disclaimer={settings.product_delivery_schedule_disclaimer}
            tierLabel={settings.product_delivery_location_tier_label || 'Location Tier'}
          />
          <ProductWhatsappHelp settings={settings} />
          <ProductShortTerms terms={settings.product_page_short_terms} />
        </section>

        {product.longDescription && (
          <section className="mt-12 pt-8 border-t border-rose-100/60">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-4">
              Product details
            </h2>
            <div className="p-5 rounded-xl bg-white border border-rose-100 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {product.longDescription}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-rose-100/60">
            <h2 className="text-xl font-bold text-slate-900 mb-6">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-8">
          <Link to="/shop" className="text-sm text-primary-600 hover:underline font-medium">
            ← Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
