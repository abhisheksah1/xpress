import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { CATEGORY_OPTIONS } from '../../components/admin/MediaLibraryModal.jsx';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

export default function MediaLibraryPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ alt: '', category: '', sourceLabel: '', tags: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getMedia({
        page,
        limit: 30,
        q: search.trim() || undefined,
        category: category || undefined,
      });
      const result = data.data || {};
      setItems(result.items || []);
      setCategories(result.categories || []);
      setPagination(result.pagination || { pages: 1, total: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load media');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    load();
  }, [page, category, load]);

  const openEdit = (item) => {
    setEditing(item._id);
    setEditForm({
      alt: item.alt || '',
      category: item.category || '',
      sourceLabel: item.sourceLabel || '',
      tags: (item.tags || []).join(', '),
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.updateMedia(editing, editForm);
      toast.success('Media updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    const label = item.sourceLabel || item.alt || item.filename || 'this image';
    if (!window.confirm(`Delete ${label} from the media library?`)) return;
    try {
      await adminApi.deleteMedia(item._id);
      toast.success('Media deleted');
      if (editing === item._id) setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied');
    } catch {
      toast.error('Could not copy URL');
    }
  };

  const categoryOptions = [
    ...CATEGORY_OPTIONS.filter((opt) => opt.value),
    ...categories
      .filter((value) => !CATEGORY_OPTIONS.some((opt) => opt.value === value))
      .map((value) => ({ value, label: value })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Media library</h1>
        <p className="text-sm text-gray-500 mt-1">
          All uploaded images are saved here. Search by product name, category, tags, or filename and reuse them across content.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-field flex-1"
          placeholder="Search by name, product, category, tags..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input-field sm:w-48"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No media yet. Upload images from products, CMS pages, or blog posts — they will appear here automatically.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => {
              const label = item.sourceLabel || item.alt || item.filename || 'Untitled';
              const isActive = editing === item._id;
              return (
                <div
                  key={item._id}
                  className={`card overflow-hidden cursor-pointer transition ring-2 ${
                    isActive ? 'ring-primary-500' : 'ring-transparent hover:ring-slate-200'
                  }`}
                  onClick={() => openEdit(item)}
                >
                  <div className="aspect-square bg-slate-100">
                    <img
                      src={resolveMediaUrl(item.url)}
                      alt={item.alt || label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-gray-800 truncate">{label}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {[item.category, ...(item.tags || []).slice(0, 2)].filter(Boolean).join(' · ') || 'No tags'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-4 h-fit sticky top-4">
            {editing ? (
              <div className="space-y-3">
                <h2 className="font-semibold text-gray-900">Edit media</h2>
                <div>
                  <label className="label">Alt text</label>
                  <input
                    className="input-field"
                    value={editForm.alt}
                    onChange={(e) => setEditForm((f) => ({ ...f, alt: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Label / product name</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Rose bouquet, Summer sale banner"
                    value={editForm.sourceLabel}
                    onChange={(e) => setEditForm((f) => ({ ...f, sourceLabel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input-field"
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">Uncategorized</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tags (comma separated)</label>
                  <input
                    className="input-field"
                    placeholder="rose, valentine, hero"
                    value={editForm.tags}
                    onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" className="btn-primary text-sm" disabled={saving} onClick={saveEdit}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => {
                      const item = items.find((entry) => entry._id === editing);
                      if (item) copyUrl(item.url);
                    }}
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm text-red-600"
                    onClick={() => {
                      const item = items.find((entry) => entry._id === editing);
                      if (item) removeItem(item);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select an image to edit tags, category, or label.</p>
            )}
          </div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
