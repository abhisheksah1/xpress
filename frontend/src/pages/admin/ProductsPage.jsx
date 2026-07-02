export default function ProductsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="btn-primary">Add Product</button>
      </div>
      <div className="card">
        <p className="text-gray-500">Product management with image upload (local + URL) and bulk price changes.</p>
      </div>
    </div>
  );
}
