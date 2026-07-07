import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import ProductCard from '../../components/store/ProductCard.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function ShopPage() {
  const { settings } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const category = searchParams.get('category') || '';
  const page = Number(searchParams.get('page') || 1);
  const sort = searchParams.get('sort') || 'newest';

  const activeCategory = useMemo(
    () => categories.find((cat) => cat._id === category),
    [categories, category]
  );

  useEffect(() => {
    storeApi.getCategories().then((res) => setCategories(res.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20, sort };
    if (category) params.category = category;
    if (search) params.search = search;
    storeApi.getProducts(params).then((res) => {
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    }).finally(() => setLoading(false));
  }, [category, page, search, sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search) next.set('search', search);
    else next.delete('search');
    next.delete('page');
    setSearchParams(next);
  };

  const handleSortChange = (e) => {
    const next = new URLSearchParams(searchParams);
    const value = e.target.value;
    if (value && value !== 'newest') next.set('sort', value);
    else next.delete('sort');
    next.delete('page');
    setSearchParams(next);
  };

  const categorySeo = activeCategory ? mergeEntitySeo(activeCategory) : null;
  const pageTitle = activeCategory ? activeCategory.name : 'Shop Gifts';
  const pageDescription = activeCategory?.description
    || (activeCategory ? `Browse ${activeCategory.name} gifts and products at KoseliXpress Nepal.` : 'Browse gifts and products at KoseliXpress Nepal.');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoHead
        seo={categorySeo || undefined}
        siteSettings={settings}
        fallbacks={{
          title: activeCategory ? `${activeCategory.name} | Shop Gifts` : 'Shop Gifts | KoseliXpress',
          description: pageDescription,
          image: activeCategory?.image?.url,
          path: activeCategory ? `/shop?category=${activeCategory._id}` : '/shop',
          schemaType: activeCategory ? 'CollectionPage' : 'CollectionPage',
        }}
        jsonLdContext={{ title: pageTitle, path: activeCategory ? `/shop?category=${activeCategory._id}` : '/shop' }}
        jsonLdId="shop-json-ld"
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        {activeCategory?.description && (
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">{activeCategory.description}</p>
        )}
        {activeCategory?.image?.url && (
          <img
            src={resolveMediaUrl(activeCategory.image.url)}
            alt={activeCategory.image.alt || activeCategory.name}
            className="mt-4 h-36 w-full max-w-xl object-cover rounded-xl border"
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="md:w-48 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Categories</p>
          <button
            onClick={() => setSearchParams({})}
            className={`block w-full text-left text-sm py-1.5 ${!category ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSearchParams({ category: cat._id })}
              className={`block w-full text-left text-sm py-1.5 ${category === cat._id ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <form onSubmit={handleSearch} className="flex-1 min-w-0">
              <input
                className="input-field w-full sm:max-w-md"
                placeholder="Search gifts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="shop-sort" className="text-sm text-gray-500 whitespace-nowrap">
                Sort by
              </label>
              <select
                id="shop-sort"
                className="input-field text-sm py-2 min-w-[11rem]"
                value={sort}
                onChange={handleSortChange}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-400">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-400">No products found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>
              {pagination.pages > 1 && (
                <div className="flex gap-2 mt-8 justify-center">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const next = new URLSearchParams(searchParams);
                        next.set('page', String(p));
                        setSearchParams(next);
                      }}
                      className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
