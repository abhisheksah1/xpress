import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'product', label: 'Products' },
  { value: 'category', label: 'Categories' },
  { value: 'cms', label: 'CMS / Pages' },
  { value: 'blog', label: 'Blog' },
  { value: 'branding', label: 'Branding' },
  { value: 'slider', label: 'Slider' },
  { value: 'other', label: 'Other' },
];

function MediaThumb({ item, selected, onToggle }) {
  const label = item.sourceLabel || item.alt || item.filename || 'Untitled';
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      className={`group relative rounded-lg overflow-hidden border-2 text-left transition-all ${
        selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-slate-200 hover:border-primary-300'
      }`}
      title={label}
    >
      <div className="aspect-square bg-slate-100">
        <img
          src={resolveMediaUrl(item.url)}
          alt={item.alt || label}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
        />
      </div>
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
          ✓
        </span>
      )}
      <div className="p-1.5 bg-white border-t border-slate-100">
        <p className="text-[10px] font-medium text-slate-700 truncate">{label}</p>
        {item.category && (
          <p className="text-[9px] text-slate-400 truncate capitalize">{item.category}</p>
        )}
      </div>
    </button>
  );
}

export default function MediaLibraryModal({
  open,
  onClose,
  mode = 'single',
  onSelect,
  title = 'Media library',
}) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getMedia({
        page,
        limit: 24,
        q: search.trim() || undefined,
        category: category || undefined,
      });
      const result = data.data || {};
      setItems(result.items || []);
      setCategories(result.categories || []);
      setPagination(result.pagination || { pages: 1, total: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load media library');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setPage(1);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [open, load, search]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, page, category, load]);

  const toggleSelect = (item) => {
    if (mode === 'single') {
      setSelected([item]);
      return;
    }
    setSelected((current) => {
      const exists = current.some((entry) => entry._id === item._id);
      if (exists) return current.filter((entry) => entry._id !== item._id);
      return [...current, item];
    });
  };

  const handleConfirm = () => {
    if (!selected.length) {
      toast.error('Select at least one image');
      return;
    }
    onSelect(
      selected.map((item) => ({
        _id: item._id,
        url: item.url,
        alt: item.alt || '',
        publicId: item.publicId,
      }))
    );
    onClose();
  };

  if (!open) return null;

  const categoryOptions = [
    ...CATEGORY_OPTIONS,
    ...categories
      .filter((value) => !CATEGORY_OPTIONS.some((opt) => opt.value === value))
      .map((value) => ({ value, label: value })),
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">
              Search by product name, category, tags, or filename
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <input
            className="input-field flex-1 text-sm"
            placeholder="Search media..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            autoFocus
          />
          <select
            className="input-field text-sm sm:w-44"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">Loading media...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">
              No media found. Upload images from any content section — they will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item) => (
                <MediaThumb
                  key={item._id}
                  item={item}
                  selected={selected.some((entry) => entry._id === item._id)}
                  onToggle={toggleSelect}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 bg-white">
          <p className="text-xs text-slate-500">
            {pagination.total} item{pagination.total === 1 ? '' : 's'}
            {selected.length > 0 && ` · ${selected.length} selected`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {pagination.page || page} of {pagination.pages || 1}
            </span>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={page >= (pagination.pages || 1) || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={!selected.length}
              onClick={handleConfirm}
            >
              {mode === 'single' ? 'Use image' : `Use ${selected.length || ''} image(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CATEGORY_OPTIONS };
