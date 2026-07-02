import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
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
                <td className="px-4 py-3 text-right space-x-2">
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
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No categories yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
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

  const parseCsv = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const vals = line.match(/(".*?"|[^,]+)/g)?.map((v) => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()) || [];
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i]; });
      return {
        name: row.name,
        sku: row.sku,
        categoryName: row.category,
        price: row.price,
        stock: row.stock,
        isActive: row.isactive ?? row.isactive,
        description: row.description,
        tags: row.tags,
      };
    }).filter((r) => r.name);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const products = parseCsv(text);
      const { data } = await adminApi.importProducts(products);
      const { created, failed } = data.data;
      toast.success(`Imported ${created} product(s)${failed.length ? `, ${failed.length} failed` : ''}`);
      refresh();
    } catch {
      toast.error('Import failed');
    }
    e.target.value = '';
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
              <button onClick={handleExport} className="btn-secondary text-sm">Export CSV</button>
              <button onClick={() => importRef.current?.click()} className="btn-secondary text-sm">Import CSV</button>
              <input ref={importRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
              <button onClick={() => navigate('/admin/products/new')} className="btn-primary text-sm">
                + Add Product
              </button>
            </div>
          </div>

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
                          <p className="font-medium text-gray-900">{product.name}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{product.category?.name || '—'}</td>
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
