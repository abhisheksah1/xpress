import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import AdminImageDropzone from '../../components/admin/AdminImageDropzone.jsx';
import SeoMetaEditor, { emptySeoMeta } from '../../components/admin/SeoMetaEditor.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const emptyBlog = () => ({
  title: '',
  excerpt: '',
  content: '',
  category: '',
  isPublished: false,
  tags: '',
  featuredImage: { url: '', alt: '' },
  seo: emptySeoMeta({ schemaType: 'BlogPosting' }),
});

export default function BlogAdminPage() {
  const [blogs, setBlogs] = useState([]);
  const [form, setForm] = useState(emptyBlog());
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await adminApi.getBlogs({ limit: 50 });
    setBlogs(data.data.blogs || []);
  };

  useEffect(() => { load(); }, []);

  const openEdit = async (blog) => {
    const { data } = await adminApi.getBlog(blog._id);
    const b = data.data;
    setEditing(b._id);
    setForm({
      title: b.title,
      excerpt: b.excerpt || '',
      content: b.content,
      category: b.category || '',
      isPublished: b.isPublished,
      tags: (b.tags || []).join(', '),
      featuredImage: b.featuredImage || { url: '', alt: '' },
      seo: mergeEntitySeo({ ...b, seo: { ...mergeEntitySeo(b), schemaType: b.seo?.schemaType || 'BlogPosting' } }),
    });
  };

  const handleFeaturedUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await adminApi.uploadImage(file);
      const image = data.data;
      setForm((f) => ({
        ...f,
        featuredImage: { url: image.url, publicId: image.publicId, alt: f.title },
        seo: {
          ...f.seo,
          ogImage: f.seo?.ogImage?.url
            ? f.seo.ogImage
            : { url: image.url, alt: f.title },
        },
      }));
      toast.success('Featured image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = () => ({
    title: form.title,
    excerpt: form.excerpt,
    content: form.content,
    category: form.category || undefined,
    isPublished: form.isPublished,
    tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    featuredImage: form.featuredImage?.url ? form.featuredImage : undefined,
    metaTitle: form.seo?.metaTitle,
    metaDescription: form.seo?.metaDescription,
    seo: form.seo,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing) {
        await adminApi.updateBlog(editing, payload);
        toast.success('Blog updated');
      } else {
        await adminApi.createBlog(payload);
        toast.success('Blog created');
      }
      setForm(emptyBlog());
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
      <h1 className="text-2xl font-bold mb-2">Blog Manager</h1>
      <p className="text-sm text-gray-500 mb-6">Write posts and configure SEO, Open Graph, schema, and GEO metadata for each article.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="font-semibold">{editing ? 'Edit Post' : 'New Post'}</h2>
            <input className="input-field" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <input className="input-field" placeholder="Excerpt" value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
            <textarea className="input-field" rows={8} placeholder="Content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
            <input className="input-field" placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Featured image</label>
              <AdminImageDropzone
                guideKey="blogFeatured"
                multiple={false}
                uploading={uploading}
                onFilesSelected={async (files) => handleFeaturedUpload(files[0])}
                title="Drag & drop featured image"
                hint="Crop to 16:9 before upload"
                className="p-5"
              />
              <input
                className="input-field text-sm flex-1 mt-3"
                placeholder="Or paste image URL"
                value={form.featuredImage?.url || ''}
                onChange={(e) => setForm((f) => ({ ...f, featuredImage: { ...f.featuredImage, url: e.target.value } }))}
              />
              {form.featuredImage?.url && (
                <img src={resolveMediaUrl(form.featuredImage.url)} alt="" className="mt-2 h-28 object-cover rounded border" />
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} />
              Published
            </label>
          </div>

          <div className="card">
            <SeoMetaEditor
              value={form.seo}
              onChange={(seo) => setForm((f) => ({ ...f, seo }))}
              pageTitle={form.title}
              pageDescription={form.excerpt || form.content}
              canonicalPreview={form.title ? `/blog/${form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}` : '/blog'}
              defaultSchemaType="BlogPosting"
              onUploadImage={async (file) => {
                const { data } = await adminApi.uploadImage(file);
                return data.data;
              }}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Post'}</button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(emptyBlog()); }} className="btn-secondary">Cancel</button>
            )}
          </div>
        </div>

        <div className="card p-0 overflow-hidden h-fit">
          <div className="px-4 py-3 border-b font-semibold text-sm">All Posts</div>
          {blogs.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400">No blog posts yet.</p>
          ) : (
            blogs.map((b) => (
              <div key={b._id} className="px-4 py-3 border-b border-gray-50 flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{b.title}</p>
                  <p className="text-xs text-gray-400">{b.isPublished ? 'Published' : 'Draft'} · /blog/{b.slug}</p>
                  {(b.seo?.metaTitle || b.metaTitle) && (
                    <p className="text-xs text-green-700 mt-0.5 truncate">SEO: {b.seo?.metaTitle || b.metaTitle}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(b)} className="text-xs text-primary-600">Edit</button>
                  <button onClick={() => handleDelete(b._id)} className="text-xs text-red-500">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
