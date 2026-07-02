export default function CheckoutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Shipping Address</h2>
          <input className="input-field" placeholder="Full Name" />
          <input className="input-field" placeholder="Phone" />
          <input className="input-field" placeholder="Email (for guest checkout)" />
          <select className="input-field"><option>Select Province</option></select>
          <input className="input-field" placeholder="District" />
          <input className="input-field" placeholder="Street Address" />
        </div>
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">Payment Method</h2>
          {['Khalti', 'eSewa', 'Fonepay', 'Card (Visa/Mastercard)', 'Cash on Delivery'].map((m) => (
            <label key={m} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary-300">
              <input type="radio" name="payment" className="text-primary-600" />
              <span className="text-sm">{m}</span>
            </label>
          ))}
          <button className="btn-primary w-full mt-4">Place Order</button>
        </div>
      </div>
    </div>
  );
}
