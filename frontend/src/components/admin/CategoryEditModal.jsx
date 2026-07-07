import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import SeoMetaEditor, { emptySeoMeta } from './SeoMetaEditor.jsx';
import ImageSizeGuide from '../ImageSizeGuide.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function CategoryEditModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
    image: { url: '', alt: '' },
    seo: emptySeoMeta({ schemaType: 'CollectionPage' }),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!category) return;
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      isActive: category.isActive !== false,
      image: category.image || { url: '', alt: '' },
      seo: mergeEntitySeo({
        ...category,
        seo: { ...mergeEntitySeo(category), schemaType: category.seo?.schemaType || 'CollectionPage' },
      }),
    });
  }, [category]);

  if (!category) return null;

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await adminApi.uploadImage(file);
      const image = data.data;
      setForm((f) => ({
        ...f,
        image: { url: image.url, publicId: image.publicId, alt: f.name },
        seo: {
          ...f.seo,
          ogImage: f.seo?.ogImage?.url ? f.seo.ogImage : { url: image.url, alt: f.name },
        },
      }));
      toast.success('Category image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.updateCategory(category._id, {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || undefined,
        isActive: form.isActive,
        image: form.image?.url ? form.image : undefined,
        metaTitle: form.seo?.metaTitle,
        metaDescription: form.seo?.metaDescription,
        seo: form.seo,
      });
      toast.success('Category saved');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit category — {category.name}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Name</label>
            <input className="input-field" required value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Slug</label>
            <input
              className="input-field font-mono text-sm"
              value={form.slug}
              onChange={(e) => setField('slug', slugify(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Description</label>
          <textarea
            className="input-field"
            rows={3}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Shown on the shop category page and used for SEO context"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Category image</label>
          <ImageSizeGuide guide="category" variant="admin" className="rounded-lg border border-blue-100 mb-2" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-secondary text-xs cursor-pointer">
              {uploading ? 'Uploading...' : 'Upload image'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleImageUpload(e.target.files?.[0])} />
            </label>
            <input
              className="input-field text-sm flex-1 min-w-[200px]"
              placeholder="Image URL"
              value={form.image?.url || ''}
              onChange={(e) => setField('image', { ...form.image, url: e.target.value })}
            />
          </div>
          {form.image?.url && (
            <img src={resolveMediaUrl(form.image.url)} alt="" className="mt-2 h-24 object-cover rounded border" />
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setField('isActive', e.target.checked)} />
          Active (visible on storefront)
        </label>

        <SeoMetaEditor
          value={form.seo}
          onChange={(seo) => setField('seo', seo)}
          pageTitle={form.name}
          pageDescription={form.description}
          canonicalPreview={category.slug ? `/shop/category/${category.slug}` : `/shop?category=${category._id}`}
          defaultSchemaType="CollectionPage"
          onUploadImage={async (file) => {
            const { data } = await adminApi.uploadImage(file);
            return data.data;
          }}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save category'}</button>
        </div>
      </form>
    </div>
  );
}
