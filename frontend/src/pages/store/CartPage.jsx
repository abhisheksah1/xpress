import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useCartStore, getCartItemMaxQuantity } from '../../store/cartStore.js';
import { PersonalizationSummary } from '../../components/store/ProductPersonalization.jsx';
import { resolveCartItemPersonalization } from '../../utils/personalization.js';
import { storeApi } from '../../api/store.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { useStore } from '../../context/StoreContext.jsx';
import { allowsBackorder, resolveProductStock } from '../../utils/comboItems.js';

function QuantityStepper({ value, min = 1, max, onChange, ariaLabel }) {
  const decDisabled = value <= min;
  const incDisabled = max != null && value >= max;

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={decDisabled}
        onClick={() => onChange(value - 1)}
        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none touch-manipulation"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={ariaLabel || 'Quantity'}
        onChange={(e) => onChange(e.target.value)}
        className="w-11 h-10 sm:h-9 text-center text-sm font-semibold tabular-nums border-x border-slate-200 outline-none focus:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={incDisabled}
        onClick={() => onChange(value + 1)}
        className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none touch-manipulation"
      >
        +
      </button>
    </div>
  );
}

export default function CartPage() {
  const { formatPriceNpr } = useStore();
  const { items, updateQuantity, removeItem, total, coupon, setCoupon, clearCoupon, grandTotal, syncItemStock } = useCartStore();
  const [code, setCode] = useState(coupon?.coupon?.code || '');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const ids = [...new Set(items.map((i) => i.productId).filter(Boolean))];
    if (!ids.length) return;
    const idKey = ids.join(',');

    storeApi
      .getProducts({ ids: idKey, limit: ids.length })
      .then((res) => {
        const products = res.data?.data?.products || [];
        const stockByProductId = {};
        products.forEach((p) => {
          stockByProductId[String(p._id)] = {
            stock: resolveProductStock(p),
            allowBackorder: allowsBackorder(p),
          };
        });
        if (Object.keys(stockByProductId).length) {
          syncItemStock(stockByProductId);
        }
      })
      .catch(() => {
        /* keep existing cart stock meta */
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when cart product set changes
  }, [items.map((i) => i.productId).join(',')]);

  const applyCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setApplying(true);
    try {
      const { data } = await storeApi.validateCoupon({
        code: code.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          selectedOptions: (item.selectedOptions || [])
            .filter((o) => o?.label)
            .map((o) => ({
              category: o.category || undefined,
              categoryId: o.categoryId || undefined,
              label: String(o.label),
              priceAdjustment: Number(o.priceAdjustment) || 0,
            })),
        })),
      });
      setCoupon(data.data);
      toast.success(data.data.message || 'Coupon applied');
    } catch (err) {
      clearCoupon();
      toast.error(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    clearCoupon();
    setCode('');
    toast.success('Coupon removed');
  };

  const handleQuantityChange = (item, rawValue) => {
    const requested = Number(rawValue);
    if (!Number.isFinite(requested) || requested < 1) {
      updateQuantity(item.cartItemId || item.productId, 1);
      return;
    }
    const result = updateQuantity(item.cartItemId || item.productId, requested);
    if (result?.capped) {
      toast.error(`Only ${result.max} in stock for "${item.name}"`);
    }
  };

  if (!items.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
        <a href="/shop" className="btn-primary inline-block">Continue Shopping</a>
      </div>
    );
  }

  const subtotal = total();
  const discount = coupon?.subtotalDiscount ?? coupon?.discount ?? 0;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Shopping Cart</h1>
      <div className="space-y-3 sm:space-y-4">
        {items.map((item) => {
          const resolvedPersonalization = resolveCartItemPersonalization(item, useCartStore.getState().productUploads);
          const maxQty = getCartItemMaxQuantity(item, items);
          const showStockLimit = !item.allowBackorder && item.stock != null;
          const lineTotal = item.price * item.quantity;
          const itemKey = item.cartItemId || item.productId;

          return (
            <div key={itemKey} className="card !p-3 sm:!p-4">
              <div className="flex gap-3 sm:gap-4">
                {item.image ? (
                  <img
                    src={resolveMediaUrl(item.image)}
                    alt={item.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0 border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-100 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="flex-1 min-w-0 text-sm sm:text-base font-semibold text-slate-900 leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeItem(itemKey)}
                      className="shrink-0 text-xs sm:text-sm font-medium text-red-500 hover:text-red-600 hover:underline py-0.5"
                    >
                      Remove
                    </button>
                  </div>

                  <p className="mt-1 text-sm font-semibold text-primary-600 whitespace-nowrap tabular-nums">
                    {formatPriceNpr(item.price)}
                    <span className="text-slate-400 font-normal"> each</span>
                  </p>

                  {item.selectedOptions?.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                      {item.selectedOptions.map((o) => `${o.category}: ${o.label}`).join(' · ')}
                    </p>
                  )}
                  {showStockLimit && (
                    <p className="text-xs text-slate-400 mt-1">
                      {item.stock <= 0 ? 'Out of stock' : `${item.stock} available`}
                    </p>
                  )}
                  <PersonalizationSummary personalization={resolvedPersonalization} className="mt-2" />
                  {resolvedPersonalization?.printImageUrl && (
                    <img
                      src={resolveMediaUrl(resolvedPersonalization.printImageUrl)}
                      alt="Custom design"
                      className="mt-2 h-14 w-auto object-contain border rounded"
                    />
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <QuantityStepper
                  value={item.quantity}
                  max={maxQty}
                  ariaLabel={`Quantity for ${item.name}`}
                  onChange={(next) => handleQuantityChange(item, next)}
                />
                <p className="text-sm sm:text-base font-bold text-slate-900 whitespace-nowrap tabular-nums text-right">
                  {formatPriceNpr(lineTotal)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card mt-5 sm:mt-6 space-y-4 !p-3 sm:!p-5">
        <form onSubmit={applyCoupon} className="flex flex-col sm:flex-row gap-2">
          <input
            className="input-field flex-1 uppercase min-w-0"
            placeholder="Coupon code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={applying} className="btn-secondary shrink-0 w-full sm:w-auto">
            {applying ? '...' : 'Apply'}
          </button>
        </form>
        {coupon && (
          <div className="flex items-start sm:items-center justify-between gap-3 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <span className="text-green-700 min-w-0">
              <span className="font-mono font-bold">{coupon.coupon?.code}</span> — {coupon.message}
            </span>
            <button type="button" onClick={removeCoupon} className="text-red-500 text-xs shrink-0">Remove</button>
          </div>
        )}
        {coupon?.appliesTo === 'shipping' && (
          <p className="text-xs text-amber-600">Delivery discount will be applied at checkout after you select a location.</p>
        )}
        {coupon?.appliesTo === 'payment_gateway' && (
          <p className="text-xs text-amber-600">Select an eligible payment method at checkout to use this coupon.</p>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-gray-500">Subtotal</span>
            <span className="whitespace-nowrap tabular-nums">{formatPriceNpr(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between gap-3 text-green-600">
              <span>Discount</span>
              <span className="whitespace-nowrap tabular-nums">- {formatPriceNpr(discount)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 text-base sm:text-lg font-semibold pt-2">
            <span>Estimated total</span>
            <span className="whitespace-nowrap tabular-nums">{formatPriceNpr(grandTotal())}</span>
          </div>
        </div>

        <a href="/checkout" className="btn-primary w-full text-center block min-h-[48px] flex items-center justify-center">
          Proceed to Checkout
        </a>
      </div>
    </div>
  );
}
