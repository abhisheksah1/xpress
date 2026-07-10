import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { storeApi } from '../../api/store.js';
import { useStore } from '../../context/StoreContext.jsx';
import ProductCard from '../../components/store/ProductCard.jsx';
import SeoHead from '../../components/store/SeoHead.jsx';
import { categoryShopPath, mergeEntitySeo } from '../../utils/seoMeta.js';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function FilterIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 6h16M7 12h10M10 18h4"
      />
    </svg>
  );
}

function CategorySidebar({ categories, activeCategory, onNavigate, className = '' }) {
  return (
    <nav className={className}>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Categories</p>
      <Link
        to="/shop"
        onClick={onNavigate}
        className={`block w-full text-left text-sm py-1.5 ${!activeCategory ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
      >
        All Products
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat._id}
          to={categoryShopPath(cat)}
          onClick={onNavigate}
          className={`block w-full text-left text-sm py-1.5 ${activeCategory?._id === cat._id ? 'text-primary-600 font-medium' : 'text-gray-600'}`}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}

export default function ShopPage() {
  const { settings } = useStore();
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const legacyCategoryId = searchParams.get('category') || '';
  const page = Number(searchParams.get('page') || 1);
  const sort = searchParams.get('sort') || 'newest';

  const activeCategory = useMemo(() => {
    if (categorySlug) return categories.find((cat) => cat.slug === categorySlug);
    if (legacyCategoryId) return categories.find((cat) => cat._id === legacyCategoryId);
    return null;
  }, [categories, categorySlug, legacyCategoryId]);

  const resolvedCategoryId = activeCategory?._id || legacyCategoryId;

  useEffect(() => {
    storeApi.getCategories().then((res) => setCategories(res.data.data));
  }, []);

  useEffect(() => {
    if (categorySlug || !legacyCategoryId || !categories.length) return;
    const cat = categories.find((c) => c._id === legacyCategoryId);
    if (cat?.slug) {
      const next = new URLSearchParams(searchParams);
      next.delete('category');
      const suffix = next.toString() ? `?${next}` : '';
      navigate(`/shop/category/${cat.slug}${suffix}`, { replace: true });
    }
  }, [categorySlug, legacyCategoryId, categories, navigate, searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20, sort };
    if (resolvedCategoryId) params.category = resolvedCategoryId;
    if (search) params.search = search;
    storeApi.getProducts(params).then((res) => {
      setProducts(res.data.data.products);
      setPagination(res.data.data.pagination);
    }).finally(() => setLoading(false));
  }, [resolvedCategoryId, page, search, sort]);

  useEffect(() => {
    setFiltersOpen(false);
  }, [categorySlug, legacyCategoryId]);

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
  const categoryPath = activeCategory ? categoryShopPath(activeCategory) : '/shop';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-4 py-4 md:py-8">
      <SeoHead
        seo={categorySeo || undefined}
        siteSettings={settings}
        fallbacks={{
          title: activeCategory ? `${activeCategory.name} | Shop Gifts` : 'Shop Gifts | KoseliXpress',
          description: pageDescription,
          image: activeCategory?.image?.url,
          path: categoryPath,
          schemaType: 'CollectionPage',
        }}
        jsonLdContext={{ title: pageTitle, path: categoryPath }}
        jsonLdId="shop-json-ld"
      />

      <div className="md:hidden mb-4">
        <h1 className="text-xl font-bold text-center text-slate-900 px-2">{pageTitle}</h1>
        <div className="flex items-center justify-between gap-3 mt-4">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-slate-800"
          >
            <FilterIcon />
            Filters
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <label htmlFor="shop-sort-mobile" className="text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap">
              Sort by
            </label>
            <select
              id="shop-sort-mobile"
              className="input-field text-sm py-2 min-w-[7.5rem] max-w-[9rem]"
              value={sort}
              onChange={handleSortChange}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="hidden md:block mb-6">
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        {activeCategory?.description && (
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">{activeCategory.description}</p>
        )}
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[min(100%,300px)] bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-slate-900">Filters</h2>
              <button
                type="button"
                className="p-2 text-gray-500"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CategorySidebar
                categories={categories}
                activeCategory={activeCategory}
                onNavigate={() => setFiltersOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="hidden md:block md:w-48 flex-shrink-0">
          <CategorySidebar categories={categories} activeCategory={activeCategory} />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="hidden md:flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
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
            <p className="text-gray-400 py-8 text-center md:text-left">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-gray-400 py-8 text-center md:text-left">No products found.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} variant="catalog" />
                ))}
              </div>
              {pagination.pages > 1 && (
                <div className="flex gap-2 mt-8 justify-center">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
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
