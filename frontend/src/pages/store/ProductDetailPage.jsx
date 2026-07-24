import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import { useCartStore } from '../../store/cartStore.js';
import SeoHead from '../../components/store/SeoHead.jsx';
import { categoryShopPath, mergeProductSeo } from '../../utils/seoMeta.js';
import { isProductSoldOut, resolveOrderableQuantity } from '../../utils/comboItems.js';
import ProductCard from '../../components/store/ProductCard.jsx';
import ProductPersonalization from '../../components/store/ProductPersonalization.jsx';
import {
  emptyPersonalization,
  hasPersonalization,
  validatePersonalization,
  serializePersonalization,
  normalizePersonalizationFields,
  mergePersonalization,
  persistProductPrintUpload,
} from '../../utils/personalization.js';
import {
  ProductDeliverySchedule,
  ProductWhatsappHelp,
  ProductShortTerms,
} from '../../components/store/ProductPageInfo.jsx';
import {
  HamperProductInfoSections,
  quickAddToBasket,
} from '../../components/store/HamperProductSections.jsx';
import ProductAssociatedCategories from '../../components/store/ProductAssociatedCategories.jsx';
import ProductRichText from '../../components/store/ProductRichText.jsx';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

function buildGallery(product, comboComponents) {
  const base = product?.images?.length
    ? [...product.images]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((i) => resolveMediaUrl(i.url))
        .filter(Boolean)
    : [];
  if (!product?.isHamper || !comboComponents.length) return base;

  const urls = new Set(base);
  for (const p of comboComponents) {
    const img = p?.images?.find((i) => i.isPrimary) || p?.images?.[0];
    const resolved = img?.url ? resolveMediaUrl(img.url) : '';
    if (resolved && !urls.has(resolved)) {
      base.push(resolved);
      urls.add(resolved);
    }
  }
  return base;
}

function optionsKey(selectedOptions) {
  if (!selectedOptions?.length) return '';
  return selectedOptions.map((o) => `${o.category}:${o.label}`).sort().join('|');
}

function ProductGallery({ product, gallery, comboComponents, activeImage, onSelectImage }) {
  return (
    <div className="lg:col-span-7 w-full min-w-0 space-y-4">
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
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 max-w-[85%]">
            <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-700 mb-2">
              Combo includes ({comboComponents.length})
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {comboComponents.slice(0, 6).map((p, i) => {
                const img = p.images?.find((x) => x.isPrimary) || p.images?.[0];
                return (
                  <img
                    key={p._id || i}
                    src={img?.url}
                    alt={p.name}
                    title={p.name}
                    className="w-10 h-10 object-cover rounded-lg border border-slate-100 shadow-sm"
                  />
                );
              })}
              {comboComponents.length > 6 && (
                <span className="w-10 h-10 bg-slate-100 border border-slate-200 text-xs text-slate-700 font-bold flex items-center justify-center rounded-lg">
                  +{comboComponents.length - 6}
                </span>
              )}
            </div>
          </div>
        )}

        {product.isHamper && (
          <span className="absolute top-3 left-3 bg-white/95 text-rose-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm border border-rose-100">
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
              onClick={() => onSelectImage(index)}
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
  );
}

function BuyPanelExtended({
  product,
  isHamper,
  shortTerms,
  storeSettings,
  deliverySchedules,
  deliveryDisclaimer,
  deliveryTierLabel,
}) {
  const blockClass = 'w-full max-w-none min-w-0';

  if (isHamper) return null;

  const hasDelivery = (deliverySchedules || []).length > 0;
  const hasLongDescription = product.longDescription || (!product.shortDescriptionEnabled && product.description);
  const hasContent =
    hasDelivery ||
    product.additionalNote ||
    shortTerms ||
    storeSettings ||
    hasLongDescription;

  if (!hasContent) return null;

  return (
    <div className={`lg:col-span-12 w-full max-w-none min-w-0 space-y-4 sm:space-y-5 pt-2 lg:pt-4`}>
      {hasDelivery && (
        <ProductDeliverySchedule
          className={blockClass}
          schedules={deliverySchedules}
          disclaimer={deliveryDisclaimer}
          tierLabel={deliveryTierLabel || 'Location Tier'}
          compact
        />
      )}

      {product.additionalNote && (
        <div className={`${blockClass} p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs sm:text-sm text-amber-900 leading-relaxed`}>
          <span className="font-bold uppercase tracking-wide text-[10px] block mb-1">Important note</span>
          {product.additionalNote}
        </div>
      )}

      {shortTerms && <ProductShortTerms terms={shortTerms} className={blockClass} />}

      {storeSettings && <ProductWhatsappHelp settings={storeSettings} className={blockClass} />}

      {hasLongDescription && (
        <section className={blockClass}>
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-800 mb-3">
            Product details
          </h2>
          <div className="p-3 sm:p-5 lg:p-6 rounded-xl bg-white border border-rose-100 w-full min-w-0 overflow-hidden">
            <ProductRichText content={product.longDescription || product.description} />
          </div>
        </section>
      )}
    </div>
  );
}

function BuyPanel({
  product,
  isHamper,
  unitPrice,
  displayCompare,
  hasDiscount,
  discountPct,
  soldOut,
  availableStock,
  formatPriceNpr,
  selectedOptions,
  setSelectedOptions,
  showPersonalization,
  fields,
  personalization,
  setPersonalization,
  onImageUploaded,
  qty,
  setQty,
  onAddToCart,
}) {
  const blockClass = 'w-full max-w-none min-w-0';

  return (
    <div className={`lg:col-span-5 w-full max-w-none min-w-0 self-start space-y-4 sm:space-y-5`}>
      <div className={blockClass}>
        {product.brand && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">{product.brand}</p>
        )}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">{product.name}</h1>
      </div>

      <div
        className={`${blockClass} p-3 sm:p-4 rounded-2xl border ${
          isHamper ? 'bg-sky-50 border-sky-100' : 'bg-white border-rose-100'
        }`}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Price</p>
        <div className="flex items-baseline flex-wrap gap-2">
          {displayCompare != null && (
            <span className="text-sm line-through text-slate-400 font-semibold">
              {formatPriceNpr(displayCompare)}
            </span>
          )}
          <span className={`text-3xl font-black font-mono ${isHamper ? 'text-rose-600' : 'text-amber-500'}`}>
            {formatPriceNpr(unitPrice)}
          </span>
          {hasDiscount && (
            <span className="bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">
              {discountPct}% OFF
            </span>
          )}
        </div>
        {!isHamper && (
          <p className="text-[11px] text-slate-400 italic mt-1">(shipping calculated at checkout)</p>
        )}
      </div>

      {(product.optionCategories || []).map((cat, index) => {
        const catId = cat._id || `cat-${index}`;
        const chosen = selectedOptions[catId];
        return (
          <div key={catId} className={`${blockClass} p-3 sm:p-4 rounded-xl bg-white border border-rose-100 space-y-2`}>
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
                        {formatPriceNpr(opt.priceAdjustment)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {showPersonalization && (
        <div className={blockClass}>
          <ProductPersonalization
            personalizationFields={fields}
            values={personalization}
            onChange={setPersonalization}
            onImageUploaded={onImageUploaded}
          />
        </div>
      )}

      <div className={`${blockClass} flex flex-col sm:flex-row items-stretch gap-3`}>
        <div className="flex items-center justify-between border border-slate-200 rounded-xl bg-white overflow-hidden w-full sm:w-auto sm:shrink-0">
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
            max={availableStock || 1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(availableStock || 1, Number(e.target.value) || 1)))}
            className="w-16 sm:w-12 text-center text-sm font-bold border-x border-slate-200 py-3 outline-none"
            disabled={soldOut}
          />
          <button
            type="button"
            className="px-3 py-3 text-slate-500 hover:bg-slate-50 font-bold"
            onClick={() => setQty((q) => Math.min(availableStock || 1, q + 1))}
            disabled={soldOut}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={soldOut}
          className={`w-full sm:flex-1 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl px-6 py-3 text-sm uppercase tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2 ${
            isHamper
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-[#e11d48] hover:bg-[#be123c]'
          }`}
        >
          <span aria-hidden>🛒</span>
          {isHamper ? 'Add to Basket' : '+ Basket'}
        </button>
      </div>

      {!isHamper && (product.sku || product.standardSize) && (
        <div className={`${blockClass} grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500`}>
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
        </div>
      )}

      {!isHamper && product.shortDescriptionEnabled && (product.shortDescription || product.description) && (
        <div className={`${blockClass} text-sm sm:text-base text-slate-600 leading-relaxed`}>
          <ProductRichText content={product.shortDescription || product.description} />
        </div>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { settings, formatPriceNpr } = useStore();
  const addItem = useCartStore((s) => s.addItem);
  const setProductUpload = useCartStore((s) => s.setProductUpload);
  const uploadedPrintRef = useRef(null);
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
  const isHamper = Boolean(product?.isHamper);

  useEffect(() => {
    storeApi
      .getProduct(slug)
      .then((res) => {
        const p = res.data.data;
        setProduct(p);
        setPersonalization(emptyPersonalization(p.personalizationFields || {}));
        uploadedPrintRef.current = null;
        setActiveImage(0);
        setQty(1);

        const initial = {};
        (p.optionCategories || []).forEach((cat, index) => {
          const catId = cat._id || `cat-${index}`;
          if (cat.options?.[0]) initial[catId] = cat.options[0];
        });
        setSelectedOptions(initial);

        const catId = p.category?._id || p.category;
        if (catId) {
          storeApi
            .getProducts({ category: catId, limit: 8 })
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

  const optionAdjustment = useMemo(
    () => Object.values(selectedOptions).reduce((sum, opt) => sum + (opt?.priceAdjustment || 0), 0),
    [selectedOptions]
  );

  const basePrice = product?.price ?? 0;
  const comparePrice = product?.compareAtPrice ?? 0;
  const hasDiscount = comparePrice > basePrice;
  const unitPrice = basePrice + optionAdjustment;
  const displayCompare = hasDiscount ? comparePrice + optionAdjustment : null;
  const discountPct = hasDiscount ? Math.round(((comparePrice - basePrice) / comparePrice) * 100) : 0;
  const availableStock = resolveOrderableQuantity(product);
  const soldOut = isProductSoldOut(product);

  const handleAddToCart = () => {
    const mergedPersonalization = mergePersonalization(
      mergePersonalization(personalization, uploadedPrintRef.current),
      useCartStore.getState().productUploads[product?._id]
    );
    const snapshot = serializePersonalization(mergedPersonalization);

    if (showPersonalization) {
      const error = validatePersonalization(fields, mergedPersonalization);
      if (error) {
        toast.error(error);
        return;
      }

      const imageEnabled = normalizePersonalizationFields(fields).imagePrint?.enabled;
      if (imageEnabled && mergedPersonalization.printImageName && !snapshot?.printImageUrl) {
        toast.error('Image upload incomplete. Please upload the design image again.');
        return;
      }
    }

    const optionsList = (product.optionCategories || [])
      .map((cat, index) => {
        const catId = cat._id || `cat-${index}`;
        const chosen = selectedOptions[catId];
        if (!chosen) return null;
        return { category: cat.name, label: chosen.label, priceAdjustment: Number(chosen.priceAdjustment) || 0 };
      })
      .filter(Boolean);

    const result = addItem(
      {
        _id: product._id,
        name: product.name,
        price: unitPrice,
        images: product.images,
        selectedOptions: optionsList,
        optionsKey: optionsKey(optionsList),
        stock: product.stock,
        allowBackorder: product.allowBackorder,
        isHamper: product.isHamper,
        comboItems: product.comboItems,
      },
      qty,
      showPersonalization ? snapshot : null
    );
    uploadedPrintRef.current = null;
    if (result?.ok === false) {
      toast.error('Not enough stock available');
      return;
    }
    if (result?.capped) {
      toast.error(`Only ${result.max} in stock — added ${result.quantity}`);
      return;
    }
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
      <SeoHead
        seo={mergeProductSeo(product)}
        siteSettings={settings}
        fallbacks={{
          title: `${product.name} | Buy Online | KoseliXpress`,
          description: product.shortDescription || product.description,
          image: gallery[0],
          imageAlt: product.name,
          path: `/shop/${product.slug}`,
          schemaType: 'Product',
        }}
        jsonLdContext={{
          title: product.name,
          path: `/shop/${product.slug}`,
          product,
          price: unitPrice,
          priceCurrency: 'NPR',
          ogType: 'product',
        }}
        jsonLdId="product-json-ld"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <nav className="text-xs text-gray-500 mb-6 flex flex-wrap items-center gap-1.5">
          <Link to="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-primary-600">Shop</Link>
          {product.category?.name && (
            <>
              <span>/</span>
              <Link
                to={categoryShopPath(product.category)}
                className="hover:text-primary-600"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-gray-800 font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-start w-full">
          <ProductGallery
            product={product}
            gallery={gallery}
            comboComponents={comboComponents}
            activeImage={activeImage}
            onSelectImage={setActiveImage}
          />
          <BuyPanel
            product={product}
            isHamper={isHamper}
            unitPrice={unitPrice}
            displayCompare={displayCompare}
            hasDiscount={hasDiscount}
            discountPct={discountPct}
            soldOut={soldOut}
            availableStock={availableStock}
            formatPriceNpr={formatPriceNpr}
            selectedOptions={selectedOptions}
            setSelectedOptions={setSelectedOptions}
            showPersonalization={showPersonalization}
            fields={fields}
            personalization={personalization}
            setPersonalization={setPersonalization}
            onImageUploaded={(upload) => {
              uploadedPrintRef.current = upload;
              if (product?._id) {
                setProductUpload(product._id, upload);
                persistProductPrintUpload(product._id, upload);
              }
            }}
            qty={qty}
            setQty={setQty}
            onAddToCart={handleAddToCart}
          />
          <BuyPanelExtended
            product={product}
            isHamper={isHamper}
            shortTerms={settings.product_page_short_terms}
            storeSettings={settings}
            deliverySchedules={deliverySchedules}
            deliveryDisclaimer={settings.product_delivery_schedule_disclaimer}
            deliveryTierLabel={settings.product_delivery_location_tier_label}
          />
        </div>

        {isHamper ? (
          <HamperProductInfoSections
            product={product}
            settings={settings}
            comboItems={comboItems}
            related={related}
            formatPriceNpr={formatPriceNpr}
            onAddRelated={(p) => quickAddToBasket(addItem, p)}
          />
        ) : (
          <>
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
          </>
        )}

        <ProductAssociatedCategories product={product} />

        <div className="mt-8">
          <Link to="/shop" className="text-sm text-primary-600 hover:underline font-medium">
            ← Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
