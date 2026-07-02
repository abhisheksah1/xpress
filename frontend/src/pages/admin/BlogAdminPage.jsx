import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const emptyBlog = { title: '', excerpt: '', content: '', isPublished: false, tags: '' };

export default function BlogAdminPage() {
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState(emptyBlog);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await adminApi.getBlogs({ limit: 50 });
    setBlogs(data.data.blogs || []);
  };

  useEffect(() => { load(); }, []);

  const openEdit = async (blog) => {
    const { data } = await adminApi.getBlog(blog._id);
    const b = data.data;
    setEditing(b._id);
    setForm({ title: b.title, excerpt: b.excerpt || '', content: b.content, isPublished: b.isPublished, tags: (b.tags || []).join(', ') });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()) : [],
      };
      if (editing) {
        await adminApi.updateBlog(editing, payload);
        toast.success('Blog updated');
      } else {
        await adminApi.createBlog(payload);
        toast.success('Blog created');
      }
      setForm(emptyBlog);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this post?')) return;
    await adminApi.deleteBlog(id);
    toast.success('Deleted');
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Blog Manager</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">{editing ? 'Edit Post' : 'New Post'}</h2>
          <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className="input-field" placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
          <textarea className="input-field" rows={8} placeholder="Content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
          <input className="input-field" placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} />
            Published
          </label>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Post'}</button>
            {editing && <button onClick={() => { setEditing(null); setForm(emptyBlog); }} className="btn-secondary">Cancel</button>}
          </div>
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm">All Posts</div>
          {blogs.map((b) => (
            <div key={b._id} className="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{b.title}</p>
                <p className="text-xs text-gray-400">{b.isPublished ? 'Published' : 'Draft'} · /blog/{b.slug}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(b)} className="text-xs text-primary-600">Edit</button>
                <button onClick={() => handleDelete(b._id)} className="text-xs text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
