import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import { useCartStore } from '../../store/cartStore.js';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { settings } = useStore();
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    storeApi.getProduct(slug)
      .then((res) => setProduct(res.data.data))
      .catch(() => toast.error('Product not found'));
  }, [slug]);

  if (!product) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Loading...</div>;
  }

  const currency = settings.currency_symbol || 'Rs.';
  const image = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;

  const handleAddToCart = () => {
    addItem({ _id: product._id, name: product.name, price: product.price, images: product.images }, qty);
    toast.success('Added to cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
          {image ? (
            <img src={image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
          )}
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">{product.category?.name}</p>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-2xl font-semibold text-primary-600 mb-4">
            {currency} {Number(product.price).toLocaleString('en-NP')}
          </p>
          {product.compareAtPrice > product.price && (
            <p className="text-gray-400 line-through text-sm mb-4">
              {currency} {Number(product.compareAtPrice).toLocaleString('en-NP')}
            </p>
          )}
          {product.shortDescription && <p className="text-gray-600 mb-4">{product.shortDescription}</p>}
          {product.description && (
            <div className="text-gray-600 text-sm mb-6 whitespace-pre-line">{product.description}</div>
          )}
          {product.additionalNote && (
            <p className="text-sm bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-6">{product.additionalNote}</p>
          )}
          <div className="flex items-center gap-4 mb-6">
            <input
              type="number"
              min="1"
              max={product.stock}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="input-field w-20"
            />
            <button onClick={handleAddToCart} className="btn-primary flex-1" disabled={product.stock <= 0}>
              {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
          <p className="text-sm text-gray-500">{product.stock} in stock</p>
          <Link to="/shop" className="text-sm text-primary-600 hover:underline mt-4 inline-block">&larr; Back to shop</Link>
        </div>
      </div>
      {product.longDescription && (
        <div className="mt-12 max-w-3xl prose text-gray-600 whitespace-pre-line">{product.longDescription}</div>
      )}
    </div>
  );
}
