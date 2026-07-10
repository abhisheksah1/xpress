import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import { useCartStore } from '../../store/cartStore.js';
import { canQuickAddProduct, quickAddProductToCart } from '../../utils/quickAddProduct.js';
import { isProductSoldOut } from '../../utils/comboItems.js';
import { resolveProductImageUrl } from '../../utils/mediaUrl.js';

function getListingPriceLabel(product, formatPriceNpr) {
  const base = product.price ?? 0;
  let min = base;
  let max = base;

  (product.optionCategories || []).forEach((cat) => {
    (cat.options || []).forEach((opt) => {
      const value = base + (opt.priceAdjustment || 0);
      min = Math.min(min, value);
      max = Math.max(max, value);
    });
  });

  (product.variants || []).forEach((variant) => {
    const value = variant.price ?? base;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });

  if (min !== max) {
    return `${formatPriceNpr(min)} – ${formatPriceNpr(max)}`;
  }
  return formatPriceNpr(base);
}

export default function ProductCard({
  product,
  currency,
  priceNpr,
  showQuickAdd = true,
  variant = 'default',
}) {
  const { formatPriceNpr } = useStore();
  const addItem = useCartStore((s) => s.addItem);
  const isCatalog = variant === 'catalog';

  const image = resolveProductImageUrl(product);
  const npr = priceNpr != null ? priceNpr : product.price;
  const priceLabel = currency
    ? `${currency} ${Number(npr).toLocaleString('en-NP')}`
    : isCatalog
      ? getListingPriceLabel(product, formatPriceNpr)
      : formatPriceNpr(npr);

  const soldOut = isProductSoldOut(product);
  const quickAdd = showQuickAdd && canQuickAddProduct(product);
  const productUrl = `/shop/${product.slug}`;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    quickAddProductToCart(addItem, product);
  };

  return (
    <article
      className={
        isCatalog
          ? 'group flex flex-col h-full min-w-0 md:card md:hover:shadow-md md:transition-shadow md:p-0 md:overflow-hidden'
          : 'card group hover:shadow-md transition-shadow p-0 overflow-hidden flex flex-col h-full'
      }
    >
      <Link to={productUrl} className="block shrink-0">
        <div
          className={
            isCatalog
              ? 'aspect-square bg-gray-50 overflow-hidden rounded-xl md:rounded-none md:bg-gray-100'
              : 'aspect-square bg-gray-100 overflow-hidden'
          }
        >
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
          )}
        </div>
      </Link>

      <div className={`flex flex-col flex-1 min-w-0 ${isCatalog ? 'pt-2.5 gap-1 md:p-4 md:gap-2' : 'p-3 sm:p-4 gap-2'}`}>
        <Link to={productUrl} className="min-w-0">
          <h3
            className={
              isCatalog
                ? 'font-semibold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-primary-600 transition-colors md:font-medium md:text-base'
                : 'font-medium text-gray-900 text-sm sm:text-base line-clamp-2 leading-snug hover:text-primary-600 transition-colors'
            }
          >
            {product.name}
          </h3>
        </Link>

        <p
          className={
            isCatalog
              ? 'text-green-600 font-semibold text-sm tabular-nums md:text-primary-600 md:text-base'
              : 'text-primary-600 font-semibold text-sm sm:text-base tabular-nums'
          }
        >
          {priceLabel}
        </p>

        {showQuickAdd && (
          <div className={isCatalog ? 'mt-auto pt-1 hidden md:block' : 'mt-auto pt-1'}>
            {soldOut ? (
              <button
                type="button"
                disabled
                className="w-full min-h-[44px] px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
              >
                Out of stock
              </button>
            ) : quickAdd ? (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-full min-h-[44px] px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-[#e11d48] text-white hover:bg-[#be123c] active:scale-[0.98] transition-all touch-manipulation"
                aria-label={`Add ${product.name} to basket`}
              >
                Add to basket
              </button>
            ) : (
              <Link
                to={productUrl}
                className="flex items-center justify-center w-full min-h-[44px] px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all touch-manipulation text-center"
              >
                View options
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
