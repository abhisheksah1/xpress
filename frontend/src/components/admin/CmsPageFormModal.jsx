import { useEffect, useState } from 'react';
import SeoMetaEditor, { emptySeoMeta } from './SeoMetaEditor.jsx';
import { mergeEntitySeoForEditor } from '../../utils/seoMeta.js';

export const PAGE_TYPES = [
  { value: 'home', label: 'Homepage', hint: 'Shown at /' },
  { value: 'about', label: 'About', hint: 'Shown at /about' },
  { value: 'contact', label: 'Contact', hint: 'Shown at /contact' },
  { value: 'faq', label: 'FAQ', hint: 'Shown at /p/faq (or link in footer)' },
  { value: 'terms', label: 'Terms', hint: 'Shown at /p/terms' },
  { value: 'privacy', label: 'Privacy', hint: 'Shown at /p/privacy' },
  { value: 'custom', label: 'Custom page', hint: 'Shown at /p/your-slug' },
];

const SINGLETON_TYPES = new Set(['home', 'about', 'contact', 'faq', 'terms', 'privacy']);

export const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const storeUrlForPage = (page) => {
  if (!page) return '';
  if (page.pageType === 'home') return '/';
  if (page.pageType === 'about') return '/about';
  if (page.pageType === 'contact') return '/contact';
  return `/p/${page.slug}`;
};

const defaultForm = () => ({
  title: '',
  slug: '',
  pageType: 'custom',
  isPublished: true,
  seo: emptySeoMeta(),
});

const slugForType = (pageType, title) => {
  if (pageType === 'home') return 'home';
  if (pageType === 'about') return 'about';
  if (pageType === 'contact') return 'contact';
  if (pageType === 'faq') return 'faq';
  if (pageType === 'terms') return 'terms';
  if (pageType === 'privacy') return 'privacy';
  return slugify(title);
};

const suggestCloneSlug = (slug) => `${slugify(slug || 'page').replace(/-copy(-\d+)?$/, '')}-copy`;

export default function CmsPageFormModal({
  open,
  mode = 'create',
  initial,
  takenTypes = [],
  onClose,
  onSave,
  saving,
}) {
  const [form, setForm] = useState(defaultForm());
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'clone' && initial) {
      setForm({
        title: `${initial.title || ''} (Copy)`.trim(),
        slug: suggestCloneSlug(initial.slug),
        pageType: SINGLETON_TYPES.has(initial.pageType) ? 'custom' : (initial.pageType || 'custom'),
        isPublished: false,
        seo: mergeEntitySeoForEditor(initial),
      });
      setSlugTouched(true);
      return;
    }
    if (initial) {
      setForm({
        title: initial.title || '',
        slug: initial.slug || '',
        pageType: initial.pageType || 'custom',
        isPublished: initial.isPublished !== false,
        seo: mergeEntitySeoForEditor(initial),
      });
      setSlugTouched(true);
    } else {
      setForm(defaultForm());
      setSlugTouched(false);
    }
  }, [open, initial, mode]);

  if (!open) return null;

  const isClone = mode === 'clone';

  const setField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'pageType') {
        if (!slugTouched || SINGLETON_TYPES.has(value)) {
          next.slug = slugForType(value, f.title);
        }
      }
      if (key === 'title' && !slugTouched) {
        next.slug = slugForType(f.pageType, value);
      }
      return next;
    });
    if (key === 'slug') setSlugTouched(true);
  };

  const typeBlocked =
    !isClone
    && mode === 'create'
    && SINGLETON_TYPES.has(form.pageType)
    && takenTypes.includes(form.pageType);

  const previewPath = storeUrlForPage(form);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-semibold text-lg">
          {mode === 'create' ? 'Create page' : mode === 'clone' ? 'Clone page' : 'Edit page'}
        </h3>

        {isClone && (
          <p className="text-sm text-gray-500">
            Copies all content blocks from <strong>{initial?.title}</strong>. The clone starts as a draft.
            {SINGLETON_TYPES.has(initial?.pageType) && (
              <> Singleton page types (home, about, etc.) are saved as <strong>custom</strong> pages.</>
            )}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input className="input-field" required value={form.title} onChange={(e) => setField('title', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Page type</label>
          <select
            className="input-field"
            value={form.pageType}
            onChange={(e) => setField('pageType', e.target.value)}
            disabled={isClone && SINGLETON_TYPES.has(initial?.pageType)}
          >
            {PAGE_TYPES.map((t) => (
              <option
                key={t.value}
                value={t.value}
                disabled={SINGLETON_TYPES.has(t.value) && takenTypes.includes(t.value) && mode !== 'edit'}
              >
                {t.label}{SINGLETON_TYPES.has(t.value) && takenTypes.includes(t.value) && mode !== 'edit' ? ' (exists)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            {PAGE_TYPES.find((t) => t.value === form.pageType)?.hint}
          </p>
          {typeBlocked && (
            <p className="text-xs text-red-600 mt-1">A {form.pageType} page already exists. Choose another type or edit the existing page.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL slug</label>
          <input
            className="input-field font-mono text-sm"
            required
            value={form.slug}
            onChange={(e) => setField('slug', slugify(e.target.value))}
            disabled={SINGLETON_TYPES.has(form.pageType)}
          />
          <p className="text-xs text-gray-400 mt-1">Storefront URL: <span className="font-mono">{previewPath}</span></p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.isPublished} onChange={(e) => setField('isPublished', e.target.checked)} />
          Published (visible on storefront)
        </label>

        <SeoMetaEditor
          value={form.seo}
          onChange={(seo) => setField('seo', seo)}
          pageTitle={form.title}
          canonicalPreview={storeUrlForPage(form)}
          defaultSchemaType={
            form.pageType === 'faq'
              ? 'FAQPage'
              : form.pageType === 'about'
                ? 'AboutPage'
                : form.pageType === 'contact'
                  ? 'ContactPage'
                  : 'WebPage'
          }
        />

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || typeBlocked || !form.slug} className="btn-primary">
            {saving ? 'Saving...' : mode === 'create' ? 'Create page' : mode === 'clone' ? 'Clone page' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
