import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCartStore } from '../../store/cartStore.js';
import { PersonalizationSummary } from '../../components/store/ProductPersonalization.jsx';
import { storeApi } from '../../api/store.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { useStore } from '../../context/StoreContext.jsx';

export default function CartPage() {
  const { formatPriceNpr } = useStore();
  const { items, updateQuantity, removeItem, total, coupon, setCoupon, clearCoupon, grandTotal } = useCartStore();
  const [code, setCode] = useState(coupon?.coupon?.code || '');
  const [applying, setApplying] = useState(false);

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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.cartItemId || item.productId} className="card flex items-start gap-4">
            {item.image && <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg shrink-0" />}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-primary-600 font-semibold">{formatPriceNpr(item.price)}</p>
              {item.selectedOptions?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {item.selectedOptions.map((o) => `${o.category}: ${o.label}`).join(' · ')}
                </p>
              )}
              <PersonalizationSummary personalization={item.personalization} className="mt-2" />
              {item.personalization?.printImageUrl && (
                <img
                  src={resolveMediaUrl(item.personalization.printImageUrl)}
                  alt="Custom design"
                  className="mt-2 h-16 w-auto object-contain border rounded"
                />
              )}
            </div>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.cartItemId || item.productId, Number(e.target.value))}
              className="input-field w-20"
            />
            <button
              onClick={() => removeItem(item.cartItemId || item.productId)}
              className="text-red-500 text-sm hover:underline shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="card mt-6 space-y-4">
        <form onSubmit={applyCoupon} className="flex gap-2">
          <input
            className="input-field flex-1 uppercase"
            placeholder="Coupon code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={applying} className="btn-secondary shrink-0">
            {applying ? '...' : 'Apply'}
          </button>
        </form>
        {coupon && (
          <div className="flex items-center justify-between text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <span className="text-green-700">
              <span className="font-mono font-bold">{coupon.coupon?.code}</span> — {coupon.message}
            </span>
            <button type="button" onClick={removeCoupon} className="text-red-500 text-xs">Remove</button>
          </div>
        )}
        {coupon?.appliesTo === 'shipping' && (
          <p className="text-xs text-amber-600">Delivery discount will be applied at checkout after you select a location.</p>
        )}
        {coupon?.appliesTo === 'payment_gateway' && (
          <p className="text-xs text-amber-600">Select an eligible payment method at checkout to use this coupon.</p>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPriceNpr(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- {formatPriceNpr(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2">
            <span>Estimated total</span>
            <span>{formatPriceNpr(grandTotal())}</span>
          </div>
        </div>

        <a href="/checkout" className="btn-primary w-full text-center block">Proceed to Checkout</a>
      </div>
    </div>
  );
}
