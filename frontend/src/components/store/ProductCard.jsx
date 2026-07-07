import { Link } from 'react-router-dom';
import { useStore } from '../../context/StoreContext.jsx';
import { useCartStore } from '../../store/cartStore.js';
import { canQuickAddProduct, quickAddProductToCart } from '../../utils/quickAddProduct.js';

export default function ProductCard({ product, currency, priceNpr, showQuickAdd = true }) {
  const { formatPriceNpr } = useStore();
  const addItem = useCartStore((s) => s.addItem);

  const image = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;
  const npr = priceNpr != null ? priceNpr : product.price;
  const priceLabel = currency
    ? `${currency} ${Number(npr).toLocaleString('en-NP')}`
    : formatPriceNpr(npr);

  const soldOut = (product.stock ?? 0) <= 0;
  const quickAdd = showQuickAdd && canQuickAddProduct(product);
  const productUrl = `/shop/${product.slug}`;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    quickAddProductToCart(addItem, product);
  };

  return (
    <article className="card group hover:shadow-md transition-shadow p-0 overflow-hidden flex flex-col h-full">
      <Link to={productUrl} className="block shrink-0">
        <div className="aspect-square bg-gray-100 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
          )}
        </div>
      </Link>

      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-2 min-w-0">
        {product.category?.name && (
          <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1">{product.category.name}</p>
        )}

        <Link to={productUrl} className="min-w-0">
          <h3 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 leading-snug hover:text-primary-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="text-primary-600 font-semibold text-sm sm:text-base tabular-nums">{priceLabel}</p>

        {showQuickAdd && (
          <div className="mt-auto pt-1">
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
