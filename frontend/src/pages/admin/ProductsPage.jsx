import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { CategoryDeliveryRulesEditor } from '../../components/admin/DeliveryGroupRulesEditor.jsx';
import CategoryEditModal from '../../components/admin/CategoryEditModal.jsx';
import StockAdjustModal from '../../components/admin/StockAdjustModal.jsx';

const formatPrice = (n) => `Rs. ${Number(n).toLocaleString('en-NP')}`;

const getComposition = (product) =>
  product.isHamper || product.variants?.length > 0 || product.tags?.includes('hamper')
    ? 'HAMPER COMBO'
    : 'INDIVIDUAL';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card py-4">
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent || 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function CategoriesTab({ categories, onRefresh }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [deliveryCategory, setDeliveryCategory] = useState(null);
  const [seoCategory, setSeoCategory] = useState(null);
  const [deliveryGroups, setDeliveryGroups] = useState([]);

  useEffect(() => {
    adminApi.getDeliveryGroups().then(({ data }) => setDeliveryGroups(data.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await adminApi.createCategory({ name: name.trim() });
      toast.success('Category created');
      setName('');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleUpdate = async (id) => {
    try {
      await adminApi.updateCategory(id, { name: editName.trim() });
      toast.success('Category updated');
      setEditing(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id, catName) => {
    if (!confirm(`Delete category "${catName}"?`)) return;
    try {
      await adminApi.deleteCategory(id);
      toast.success('Category deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete category');
    }
  };

  const saveCategoryDelivery = async (payload) => {
    await adminApi.updateCategory(deliveryCategory._id, payload);
    toast.success('Category delivery rules saved');
    setDeliveryCategory(null);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="card flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">New Category</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gourmet Cakes" />
        </div>
        <button type="submit" className="btn-primary">Add Category</button>
      </form>
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Slug</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Delivery</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">SEO</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <tr key={cat._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  {editing === cat._id ? (
                    <input className="input-field py-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    <span className="font-medium">{cat.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{cat.slug}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {cat.deliveryScope === 'selected' ? 'Restricted groups' : 'All groups'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(cat.seo?.metaTitle || cat.metaTitle) ? (
                    <span className="text-xs text-green-700 truncate block max-w-[140px]" title={cat.seo?.metaTitle || cat.metaTitle}>
                      {cat.seo?.metaTitle || cat.metaTitle}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => setSeoCategory(cat)} className="text-primary-600 text-xs font-medium">SEO</button>
                  <button onClick={() => setDeliveryCategory(cat)} className="text-primary-600 text-xs font-medium">Delivery</button>
                  {editing === cat._id ? (
                    <>
                      <button onClick={() => handleUpdate(cat._id)} className="text-primary-600 text-xs font-medium">Save</button>
                      <button onClick={() => setEditing(null)} className="text-gray-400 text-xs">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditing(cat._id); setEditName(cat.name); }} className="text-primary-600 text-xs font-medium">Edit</button>
                      <button onClick={() => handleDelete(cat._id, cat.name)} className="text-red-500 text-xs font-medium">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No categories yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {seoCategory && (
        <CategoryEditModal
          category={seoCategory}
          onClose={() => setSeoCategory(null)}
          onSaved={onRefresh}
        />
      )}

      {deliveryCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Delivery rules — {deliveryCategory.name}</h3>
              <button type="button" onClick={() => setDeliveryCategory(null)} className="text-gray-400">✕</button>
            </div>
            <CategoryDeliveryRulesEditor
              groups={deliveryGroups}
              category={deliveryCategory}
              onSave={saveCategoryDelivery}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('products');
  const [stats, setStats] = useState({ total: 0, inStock: 0, outOfStock: 0, inactive: 0, orderableOverrides: 0 });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({
    search: '', category: '', stockStatus: '', composition: '', isActive: '',
  });
  const [stockProduct, setStockProduct] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const importRef = useRef(null);

  const loadCategories = useCallback(async () => {
    const { data } = await adminApi.getCategories();
    setCategories(data.data);
  }, []);

  const loadStats = useCallback(async () => {
    const { data } = await adminApi.getCatalogStats();
    setStats(data.data);
  }, []);

  const loadProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.stockStatus) params.stockStatus = filters.stockStatus;
      if (filters.composition) params.composition = filters.composition;
      if (filters.isActive !== '') params.isActive = filters.isActive;

      const { data } = await adminApi.getProducts(params);
      setProducts(data.data.products);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(1), 300);
    return () => clearTimeout(t);
  }, [filters, loadProducts]);

  const refresh = () => {
    loadProducts(pagination.page);
    loadStats();
    loadCategories();
  };

  const handleBulkDelete = async () => {
    if (!selected.length) return;
    const names = products
      .filter((p) => selected.includes(p._id))
      .map((p) => p.name)
      .slice(0, 5);
    const preview = names.join(', ');
    const more = selected.length > 5 ? ` and ${selected.length - 5} more` : '';
    if (!confirm(`Delete ${selected.length} selected product(s)?\n\n${preview}${more}`)) return;

    setBulkDeleting(true);
    try {
      const { data } = await adminApi.bulkDeleteProducts(selected);
      const { deleted, notFound } = data.data;
      toast.success(`Deleted ${deleted} product(s)${notFound ? ` (${notFound} not found)` : ''}`);
      setSelected([]);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    try {
      await adminApi.deleteProduct(product._id);
      toast.success('Product deleted');
      refresh();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleClone = async (product) => {
    try {
      await adminApi.cloneProduct(product._id);
      toast.success('Product cloned');
      refresh();
    } catch {
      toast.error('Failed to clone product');
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await adminApi.exportProducts();
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const { data } = await adminApi.downloadImportTemplate();
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const csv = await file.text();
      const { data } = await adminApi.importProducts({ csv });
      const result = data.data;
      setImportResult(result);
      const parts = [
        `${result.created} created`,
        result.updated ? `${result.updated} updated` : null,
        result.failed?.length ? `${result.failed.length} failed` : null,
      ].filter(Boolean);
      toast.success(`Import finished: ${parts.join(', ')}`);
      if (result.categoriesCreated?.length) {
        toast.success(`New categories: ${result.categoriesCreated.join(', ')}`, { duration: 5000 });
      }
      refresh();
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const toggleSelect = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleAll = () =>
    setSelected(selected.length === products.length ? [] : products.map((p) => p._id));

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catalog Registry</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add products, manage categories, and control inventory from one place.
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {['products', 'categories'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'categories' ? (
        <CategoriesTab categories={categories} onRefresh={loadCategories} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Items" value={stats.total} sub="Active Catalog" />
            <StatCard label="Normal Stock" value={stats.inStock} sub="In Stock" accent="text-green-600" />
            <StatCard label="Out of Stock" value={stats.outOfStock} sub="Sold Out" accent="text-red-500" />
            <StatCard label="Inactive" value={stats.inactive} sub="Unpublished" />
          </div>

          <div className="card mb-4 space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              CSV import supports Koseli Xpress export columns: <span className="font-mono">product_name, price, crossed_price, quantity, slug, status, product_category, images, product_description</span>, etc.
              Column <span className="font-mono">product_description</span> (column R) is imported as the product <strong>long description</strong>.
              Categories in <span className="font-mono">product_category</span> are comma-separated — the product is assigned to <strong>all</strong> of them (e.g. &quot;Red Rose Bouquet, Gift For Wife, Gift For Girlfriend&quot;). Existing categories are reused; missing ones are created automatically.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <input
                className="input-field flex-1 min-w-[200px]"
                placeholder="Search by name, slug or SKU"
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
              />
              <select className="input-field w-auto" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <select className="input-field w-auto" value={filters.stockStatus} onChange={(e) => setFilter('stockStatus', e.target.value)}>
                <option value="">All Stocks</option>
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="low_stock">Low Stock</option>
              </select>
              <select className="input-field w-auto" value={filters.composition} onChange={(e) => setFilter('composition', e.target.value)}>
                <option value="">All Compositions</option>
                <option value="hamper">Hamper Combo</option>
                <option value="individual">Individual</option>
              </select>
              <select className="input-field w-auto" value={filters.isActive} onChange={(e) => setFilter('isActive', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="true">Published</option>
                <option value="false">Unpublished</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={handleDownloadTemplate} className="btn-secondary text-sm">CSV Template</button>
              <button onClick={handleExport} className="btn-secondary text-sm">Export CSV</button>
              <button
                onClick={() => importRef.current?.click()}
                disabled={importing}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import CSV'}
              </button>
              <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
              <button onClick={() => navigate('/admin/products/new')} className="btn-primary text-sm">
                + Add Product
              </button>
            </div>
          </div>

          {importResult && (
            <div className="card mb-4 text-sm space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">Last CSV import</p>
                  <p className="text-gray-500 mt-1">
                    {importResult.created} created
                    {importResult.updated ? ` · ${importResult.updated} updated` : ''}
                    {importResult.failed?.length ? ` · ${importResult.failed.length} failed` : ''}
                  </p>
                  {importResult.categoriesCreated?.length > 0 && (
                    <p className="text-green-700 mt-1">
                      New categories: {importResult.categoriesCreated.join(', ')}
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">
                  Dismiss
                </button>
              </div>
              {importResult.failed?.length > 0 && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 max-h-40 overflow-y-auto">
                  {importResult.failed.map((item) => (
                    <p key={`${item.row}-${item.name}`} className="text-red-700 text-xs">
                      Row {item.row}{item.name ? ` (${item.name})` : ''}: {item.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {selected.length > 0 && (
            <div className="card mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-primary-200 bg-primary-50/50">
              <p className="text-sm font-medium text-gray-800">
                {selected.length} product{selected.length === 1 ? '' : 's'} selected
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="btn-secondary text-sm"
                  disabled={bulkDeleting}
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkDeleting ? 'Deleting...' : `Delete selected (${selected.length})`}
                </button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selected.length === products.length && products.length > 0} onChange={toggleAll} />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">SKU / Item</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Catalog Section</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Standard Rate</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Remaining Stock</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Composition</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 uppercase text-xs">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No products found. Add your first product!</td></tr>
                  ) : products.map((product) => {
                    const composition = getComposition(product);
                    return (
                      <tr key={product._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.includes(product._id)} onChange={() => toggleSelect(product._id)} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-400 font-mono">{product.sku}</p>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                            className="font-medium text-gray-900 text-left hover:text-primary-600 hover:underline"
                          >
                            {product.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {[...(product.categories || []), product.category]
                            .filter(Boolean)
                            .map((c) => c.name || c)
                            .filter((name, i, arr) => arr.indexOf(name) === i)
                            .join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 font-medium">{formatPrice(product.price)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={product.stock <= 0 ? 'text-red-500 font-medium' : ''}>
                              {product.stock} units
                            </span>
                            <button
                              onClick={() => setStockProduct(product)}
                              className="text-xs text-primary-600 border border-primary-200 px-2 py-0.5 rounded hover:bg-primary-50"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            composition === 'HAMPER COMBO' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {composition}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            product.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {product.isActive ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button onClick={() => handleClone(product)} className="text-xs text-gray-500 hover:text-gray-800">Clone</button>
                            <button
                              onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                              className="text-xs text-primary-600 font-medium hover:text-primary-800"
                            >
                              Edit
                            </button>
                            <button onClick={() => handleDelete(product)} className="text-red-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">{pagination.total} products total</p>
                <div className="flex gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => loadProducts(pagination.page - 1)}
                    className="btn-secondary text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-600">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => loadProducts(pagination.page + 1)}
                    className="btn-secondary text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {stockProduct && (
        <StockAdjustModal
          product={stockProduct}
          onClose={() => setStockProduct(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
