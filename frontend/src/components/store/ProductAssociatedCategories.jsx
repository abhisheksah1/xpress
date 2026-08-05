import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { getProductCategoryLinks } from '../../utils/productCategories.js';
import { categoryShopPath } from '../../utils/seoMeta.js';

export default function ProductAssociatedCategories({ product }) {
  const categories = useMemo(() => getProductCategoryLinks(product), [product]);

  if (!categories.length) return null;

  return (
    <section className="mt-10 pt-8 border-t border-rose-100/60 w-full" aria-labelledby="related-categories-heading">
      <h2 id="related-categories-heading" className="text-base sm:text-lg font-bold text-slate-900 mb-4">
        Related categories
      </h2>
      <nav aria-label="Related categories">
        <ul className="flex flex-wrap gap-x-8 gap-y-3 list-none m-0 p-0">
          {categories.map((cat) => (
            <li key={cat._id} className="m-0">
              <Link
                to={categoryShopPath(cat)}
                className="text-base sm:text-lg font-bold leading-snug text-slate-800 hover:text-primary-600 transition-colors"
              >
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
