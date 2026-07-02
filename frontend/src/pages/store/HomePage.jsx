import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import CmsBlockRenderer from '../../components/store/CmsBlockRenderer.jsx';
import ProductCard from '../../components/store/ProductCard.jsx';

export default function HomePage() {
  const { settings } = useStore();
  const [homePage, setHomePage] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      storeApi.getPageByType('home').catch(() => null),
      storeApi.getProducts({ isFeatured: true, limit: 8 }),
      storeApi.getCategories(),
    ]).then(([pageRes, productsRes, catsRes]) => {
      if (pageRes) setHomePage(pageRes.data.data);
      setFeatured(productsRes.data.data.products || []);
      setCategories(catsRes.data.data || []);
    });
  }, []);

  const currency = settings.currency_symbol || 'Rs.';

  return (
    <div>
      {homePage ? (
        <CmsBlockRenderer blocks={homePage.blocks} />
      ) : (
        <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-24 text-center">
          <h1 className="text-4xl font-bold">{settings.store_name || 'KoseliXpress'}</h1>
          <p className="mt-4 text-primary-100">{settings.store_tagline || 'Gifts Delivered Across Nepal'}</p>
        </section>
      )}

      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/shop?category=${cat._id}`}
                className="card text-center py-6 hover:border-primary-300 transition-colors"
              >
                <span className="font-medium text-sm">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16 bg-gray-50">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Featured Gifts</h2>
            <Link to="/shop" className="text-primary-600 text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featured.map((p) => (
              <ProductCard key={p._id} product={p} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
