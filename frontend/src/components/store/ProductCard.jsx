import { Link } from 'react-router-dom';

export default function ProductCard({ product, currency = 'Rs.' }) {
  const image = product.images?.find((i) => i.isPrimary)?.url || product.images?.[0]?.url;
  const price = Number(product.price).toLocaleString('en-NP');

  return (
    <Link to={`/shop/${product.slug}`} className="card group hover:shadow-md transition-shadow p-0 overflow-hidden">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {image ? (
          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">{product.category?.name}</p>
        <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
        <p className="text-primary-600 font-semibold mt-2">{currency} {price}</p>
      </div>
    </Link>
  );
}
