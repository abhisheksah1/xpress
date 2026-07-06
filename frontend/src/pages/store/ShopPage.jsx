import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import ProductCard from '../../components/store/ProductCard.jsx';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const category = searchParams.get('category') || '';
  const page = Number(searchParams.get('page') || 1);
  const sort = searchParams.get('sort') || 'newest';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Shop Gifts</h1>

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
