export default function OrderHistoryPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <p className="text-gray-500 mb-6">Login to view your order history, or track a guest order below.</p>
      <div className="card mb-8">
        <h2 className="font-semibold mb-4">Track Guest Order</h2>
        <div className="flex gap-4">
          <input className="input-field" placeholder="Order Number (e.g. KX-...)" />
          <input className="input-field" placeholder="Email used at checkout" />
          <button className="btn-primary whitespace-nowrap">Track</button>
        </div>
      </div>
    </div>
  );
}
