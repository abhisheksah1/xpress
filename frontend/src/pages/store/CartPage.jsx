import { useCartStore } from '../../store/cartStore';

export default function CartPage() {
  const { items, updateQuantity, removeItem, total } = useCartStore();

  if (!items.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
        <a href="/shop" className="btn-primary inline-block">Continue Shopping</a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shopping Cart</h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="card flex items-center gap-4">
            {item.image && <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />}
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-primary-600 font-semibold">Rs. {item.price}</p>
            </div>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
              className="input-field w-20"
            />
            <button onClick={() => removeItem(item.productId)} className="text-red-500 text-sm hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="card mt-6 flex justify-between items-center">
        <span className="text-lg font-semibold">Total: Rs. {total()}</span>
        <a href="/checkout" className="btn-primary">Proceed to Checkout</a>
      </div>
    </div>
  );
}
