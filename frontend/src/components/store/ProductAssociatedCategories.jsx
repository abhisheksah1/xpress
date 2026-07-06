import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { getProductCategoryLinks } from '../../utils/productCategories.js';

export default function ProductAssociatedCategories({ product }) {
  const categories = useMemo(() => getProductCategoryLinks(product), [product]);

  if (!categories.length) return null;

  return (
    <section className="mt-10 pt-8 border-t border-rose-100/60 w-full">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {categories.map((cat) => (
          <h3 key={cat._id} className="m-0 text-base sm:text-lg font-bold leading-snug">
            <Link
              to={`/shop?category=${cat._id}`}
              className="text-slate-800 hover:text-primary-600 transition-colors"
            >
              {cat.name}
            </Link>
          </h3>
        ))}
      </div>
    </section>
  );
}
