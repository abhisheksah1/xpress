import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import CmsImagePicker from '../../components/admin/CmsImagePicker.jsx';
import CmsPageFormModal, { storeUrlForPage } from '../../components/admin/CmsPageFormModal.jsx';
import SeoMetaEditor, { emptySeoMeta } from '../../components/admin/SeoMetaEditor.jsx';
import { mergeEntitySeo } from '../../utils/seoMeta.js';
import CategoriesGridBlockEditor from '../../components/admin/CategoriesGridBlockEditor.jsx';
import ImageContentLayoutSettings from '../../components/admin/ImageContentLayoutSettings.jsx';
import GoogleReviewsBlockEditor from '../../components/admin/GoogleReviewsBlockEditor.jsx';
import FaqBlockEditor from '../../components/admin/FaqBlockEditor.jsx';
import VideoBlockEditor from '../../components/admin/VideoBlockEditor.jsx';

const BLOCK_TYPES = [
  'hero',
  'banner',
  'slider',
  'categories_grid',
  'product_grid',
  'image',
  'image_content',
  'video',
  'faq',
  'google_reviews',
  'delivery_countdown',
  'text',
  'cta',
  'testimonial',
];

export default function ContentPage() {
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [pageModal, setPageModal] = useState({ open: false, mode: 'create' });
  const [pageSaving, setPageSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingUpHome, setSettingUpHome] = useState(false);

  const hasHomePage = useMemo(
    () => pages.some((p) => p.pageType === 'home'),
    [pages]
  );

  const load = async () => {
    const { data } = await adminApi.getCmsPages();
    setPages(data.data);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    adminApi.getCategories().then((res) => setCategories(res.data.data || [])).catch(() => setCategories([]));
  }, []);

  const selectPage = async (page) => {
    const { data } = await adminApi.getCmsPage(page._id);
    const pageData = data.data;
    setSelected({ ...pageData, seo: mergeEntitySeo(pageData) });
    setBlocks(pageData.blocks || []);
  };

  const updateBlock = (index, field, value) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const updateBlockImages = (index, images) => {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const first = images[0];
        return {
          ...b,
          images,
          image: first ? { url: first.url, alt: first.alt || b.image?.alt || '' } : undefined,
        };
      })
    );
  };

  const updateBlockImageAlt = (index, alt) => {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const url = b.image?.url || b.images?.[0]?.url || '';
        return {
          ...b,
          image: { url, alt },
          images: url ? [{ url, alt }] : b.images,
        };
      })
    );
  };

  const updateBlockSetting = (index, key, value) => {
    setBlocks((prev) =>
      prev.map((b, i) =>
        i === index
          ? { ...b, settings: { ...(b.settings || {}), [key]: value } }
          : b
      )
    );
  };

  const addBlock = (type) => {
    setBlocks((prev) => {
      const base = { type, title: '', content: '', sortOrder: prev.length, isActive: true };
      if (type === 'categories_grid') {
        base.title = 'Browse Store Occasions';
        base.settings = { sortBy: 'custom', limit: 20, hideEmpty: false, categoryIds: [], cols: 4 };
      }
      if (type === 'image_content') {
        base.settings = { layout: 'left', overlayPosition: 'center', overlayStyle: 'dark' };
      }
      if (type === 'google_reviews') {
        base.title = 'Google Reviews';
        base.buttonText = 'View on Google';
        base.settings = { placeId: '', reviews: [], intervalMs: 6000 };
      }
      if (type === 'faq') {
        base.title = 'FAQ Guidance Accordion';
        base.content = '';
        base.settings = {
          items: [
            { q: 'What is sample question?', a: 'This is beautiful visual builder answer.' },
          ],
        };
      }
      return [...prev, base];
    });
  };

  const moveBlock = (index, direction) => {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((b, i) => ({ ...b, sortOrder: i }));
    });
  };

  const removeBlock = (index) => setBlocks((prev) => prev.filter((_, i) => i !== index));

  const handleSaveBlocks = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await adminApi.updateCmsBlocks(selected._id, blocks);
      const updated = data.data;
      setSelected((p) => ({ ...p, isPublished: true, blocks: updated?.blocks || blocks }));
      toast.success('Content saved and published to storefront');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    await adminApi.updateCmsPage(selected._id, { isPublished: !selected.isPublished });
    toast.success(selected.isPublished ? 'Unpublished' : 'Published');
    selectPage({ _id: selected._id });
    load();
  };

  const takenPageTypes = useMemo(
    () => pages
      .filter((p) => !(pageModal.mode === 'edit' && selected && p._id === selected._id))
      .map((p) => p.pageType)
      .filter(Boolean),
    [pages, pageModal.mode, selected]
  );

  const handleSetupHomePage = async () => {
    setSettingUpHome(true);
    try {
      const { data } = await adminApi.setupHomePage();
      toast.success(data.message || 'Homepage ready');
      await load();
      if (data.data?._id) await selectPage(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set up homepage');
    } finally {
      setSettingUpHome(false);
    }
  };

  const handleCreatePage = async (form) => {
    setPageSaving(true);
    try {
      const { data } = await adminApi.createCmsPage(form);
      toast.success('Page created');
      setPageModal({ open: false, mode: 'create' });
      await load();
      if (data.data?._id) await selectPage(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create page');
    } finally {
      setPageSaving(false);
    }
  };

  const handleUpdatePage = async (form) => {
    if (!selected) return;
    setPageSaving(true);
    try {
      await adminApi.updateCmsPage(selected._id, form);
      toast.success('Page updated');
      setPageModal({ open: false, mode: 'create' });
      await load();
      await selectPage({ _id: selected._id });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update page');
    } finally {
      setPageSaving(false);
    }
  };

  const handleClonePage = async (form) => {
    if (!selected) return;
    setPageSaving(true);
    try {
      const { data } = await adminApi.cloneCmsPage(selected._id, form);
      toast.success('Page cloned');
      setPageModal({ open: false, mode: 'create' });
      await load();
      if (data.data?._id) await selectPage(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clone page');
    } finally {
      setPageSaving(false);
    }
  };

  const handleDeletePage = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await adminApi.deleteCmsPage(selected._id);
      toast.success('Page deleted');
      setSelected(null);
      setBlocks([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete page');
    } finally {
      setDeleting(false);
    }
  };

  const savePageSettings = async () => {
    if (!selected) return;
    setPageSaving(true);
    try {
      await adminApi.updateCmsPage(selected._id, {
        title: selected.title,
        slug: selected.slug,
        pageType: selected.pageType,
        metaTitle: selected.seo?.metaTitle,
        metaDescription: selected.seo?.metaDescription,
        seo: selected.seo,
      });
      toast.success('Page settings saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save page settings');
    } finally {
      setPageSaving(false);
    }
  };

  const categoryOptions = useMemo(
    () => [{ _id: '', name: 'All Categories' }, ...categories],
    [categories]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Content Manager</h1>
      <p className="text-sm text-gray-500 mb-6">Create, edit, and delete CMS pages. Build each page with content blocks.</p>

      {!hasHomePage && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-900">No homepage configured</p>
            <p className="text-sm text-amber-800 mt-1">
              The storefront at <strong>/</strong> needs a published page with type <strong>home</strong> and at least one content block.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSetupHomePage}
            disabled={settingUpHome}
            className="btn-primary shrink-0"
          >
            {settingUpHome ? 'Creating…' : 'Create default homepage'}
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">Pages</span>
            <button
              type="button"
              onClick={() => setPageModal({ open: true, mode: 'create' })}
              className="btn-primary text-xs py-1 px-2"
            >
              + New page
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {pages.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No pages yet. Create your homepage or other pages.</p>
            ) : pages.map((p) => (
              <button
                key={p._id}
                onClick={() => selectPage(p)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${
                  selected?._id === p._id ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{p.title}</span>
                  {p.isPublished ? (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Live</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Draft</span>
                  )}
                </span>
                <span className="block text-xs text-gray-400">{p.pageType} · {storeUrlForPage(p)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              {!selected.isPublished && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  This page is a <strong>draft</strong> and is hidden from customers. Click <strong>Save &amp; publish blocks</strong> or <strong>Publish</strong> to make it live.
                </div>
              )}

              {selected.pageType !== 'home' && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  This page type is <strong>{selected.pageType}</strong>. The storefront homepage at <strong>/</strong> only shows pages with type <strong>home</strong>.
                </div>
              )}

              <div className="card flex flex-wrap justify-between items-center gap-3">
                <div>
                  <h2 className="font-bold">{selected.title}</h2>
                  <p className="text-sm text-gray-500">{storeUrlForPage(selected)} · {selected.pageType}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPageModal({ open: true, mode: 'edit' })} className="btn-secondary text-sm">
                    Edit page
                  </button>
                  <button type="button" onClick={() => setPageModal({ open: true, mode: 'clone' })} className="btn-secondary text-sm">
                    Clone page
                  </button>
                  <button type="button" onClick={togglePublish} className="btn-secondary text-sm">
                    {selected.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button type="button" onClick={handleDeletePage} disabled={deleting} className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button onClick={handleSaveBlocks} disabled={saving} className="btn-primary text-sm">
                    {saving ? 'Saving...' : 'Save & publish blocks'}
                  </button>
                  <a
                    href={storeUrlForPage({ ...selected, isPublished: true })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    View on store
                  </a>
                </div>
              </div>

              <div className="card space-y-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Page settings</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Title</label>
                    <input className="input-field" value={selected.title || ''} onChange={(e) => setSelected((p) => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Slug</label>
                    <input className="input-field font-mono text-sm" value={selected.slug || ''} onChange={(e) => setSelected((p) => ({ ...p, slug: e.target.value }))} />
                  </div>
                </div>
                <SeoMetaEditor
                  value={selected.seo || emptySeoMeta()}
                  onChange={(seo) => setSelected((p) => ({ ...p, seo }))}
                  pageTitle={selected.title}
                  pageDescription={blocks.find((b) => b.content)?.content || ''}
                  canonicalPreview={storeUrlForPage(selected)}
                  defaultSchemaType={
                    selected.pageType === 'faq'
                      ? 'FAQPage'
                      : selected.pageType === 'about'
                        ? 'AboutPage'
                        : selected.pageType === 'contact'
                          ? 'ContactPage'
                          : 'WebPage'
                  }
                  onUploadImage={async (file) => {
                    const { data } = await adminApi.uploadImage(file);
                    return data.data;
                  }}
                />
                <button onClick={savePageSettings} disabled={pageSaving} className="btn-secondary text-sm">
                  {pageSaving ? 'Saving...' : 'Save page settings'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((t) => (
                  <button key={t} onClick={() => addBlock(t)} className="btn-secondary text-xs capitalize">+ {t}</button>
                ))}
              </div>

              {blocks.map((block, i) => (
                <div key={block._id || i} className="card space-y-3">
                  {block.type !== 'categories_grid' && block.type !== 'faq' && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase text-gray-400">{block.type} block</span>
                      <button onClick={() => removeBlock(i)} className="text-red-500 text-xs">Remove</button>
                    </div>
                  )}

                  {(block.type === 'categories_grid' || block.type === 'faq') && (
                    <div className="flex justify-end -mb-2">
                      <button onClick={() => removeBlock(i)} className="text-red-500 text-xs">Remove block</button>
                    </div>
                  )}

                  {(block.type === 'hero' || block.type === 'banner' || block.type === 'slider' || block.type === 'text' || block.type === 'cta' || block.type === 'testimonial' || block.type === 'image_content' || block.type === 'product_grid' || block.type === 'google_reviews' || block.type === 'delivery_countdown') && (
                    <input className="input-field" placeholder="Title" value={block.title || ''} onChange={(e) => updateBlock(i, 'title', e.target.value)} />
                  )}

                  {(block.type === 'text' || block.type === 'hero' || block.type === 'banner' || block.type === 'cta' || block.type === 'image_content' || block.type === 'product_grid' || block.type === 'delivery_countdown') && (
                    <textarea className="input-field" rows={3} placeholder="Text content" value={block.content || ''} onChange={(e) => updateBlock(i, 'content', e.target.value)} />
                  )}

                  {(block.type === 'hero' || block.type === 'banner' || block.type === 'cta' || block.type === 'image_content' || block.type === 'product_grid' || block.type === 'delivery_countdown' || block.type === 'google_reviews') && (
                    <div className="grid grid-cols-2 gap-3">
                      <input className="input-field text-sm" placeholder="Button text" value={block.buttonText || ''} onChange={(e) => updateBlock(i, 'buttonText', e.target.value)} />
                      <input className="input-field text-sm" placeholder="Button link (e.g. /shop)" value={block.buttonLink || ''} onChange={(e) => updateBlock(i, 'buttonLink', e.target.value)} />
                    </div>
                  )}

                  {(block.type === 'text') && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Text style</label>
                        <select
                          className="input-field"
                          value={block.settings?.headingLevel || 'p'}
                          onChange={(e) => updateBlockSetting(i, 'headingLevel', e.target.value)}
                        >
                          <option value="h1">Heading H1</option>
                          <option value="h2">Heading H2</option>
                          <option value="h3">Heading H3</option>
                          <option value="p">Paragraph</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Optional link</label>
                        <input
                          className="input-field"
                          placeholder="https://... or /shop"
                          value={block.settings?.linkUrl || ''}
                          onChange={(e) => updateBlockSetting(i, 'linkUrl', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {(block.type === 'hero' || block.type === 'image' || block.type === 'banner' || block.type === 'image_content') && (
                    <div className="space-y-3">
                      <CmsImagePicker
                        mode="single"
                        images={
                          block.images?.length
                            ? block.images
                            : block.image?.url
                              ? [{ url: block.image.url, alt: block.image.alt || '' }]
                              : []
                        }
                        onChange={(imgs) => updateBlockImages(i, imgs)}
                        alt={block.image?.alt || block.title || ''}
                      />
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Alt text</label>
                        <input
                          className="input-field"
                          placeholder="Describe the image for accessibility"
                          value={block.image?.alt || ''}
                          onChange={(e) => updateBlockImageAlt(i, e.target.value)}
                        />
                      </div>
                      {block.type === 'image_content' && (
                        <ImageContentLayoutSettings
                          settings={block.settings || {}}
                          onChange={(key, value) => updateBlockSetting(i, key, value)}
                        />
                      )}
                    </div>
                  )}

                  {(block.type === 'slider') && (
                    <div className="space-y-3">
                      <CmsImagePicker
                        mode="slides"
                        images={block.images || []}
                        onChange={(imgs) => updateBlock(i, 'images', imgs)}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Auto slide (ms)</label>
                          <input
                            type="number"
                            min="1000"
                            className="input-field"
                            value={block.settings?.intervalMs || 5000}
                            onChange={(e) => updateBlockSetting(i, 'intervalMs', Number(e.target.value) || 5000)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(block.type === 'video') && (
                    <VideoBlockEditor
                      title={block.title || ''}
                      url={block.settings?.url || block.content || ''}
                      onTitleChange={(value) => updateBlock(i, 'title', value)}
                      onUrlChange={(value) => {
                        updateBlockSetting(i, 'url', value);
                        updateBlock(i, 'content', value);
                      }}
                    />
                  )}

                  {(block.type === 'google_reviews') && (
                    <GoogleReviewsBlockEditor
                      settings={block.settings || {}}
                      onChange={(key, value) => updateBlockSetting(i, key, value)}
                    />
                  )}

                  {(block.type === 'product_grid') && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Limit</label>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          value={block.settings?.limit || 8}
                          onChange={(e) => updateBlockSetting(i, 'limit', Number(e.target.value) || 8)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Category</label>
                        <select
                          className="input-field"
                          value={block.settings?.categoryId || ''}
                          onChange={(e) => updateBlockSetting(i, 'categoryId', e.target.value)}
                        >
                          {categoryOptions.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!block.settings?.isFeatured}
                            onChange={(e) => updateBlockSetting(i, 'isFeatured', e.target.checked)}
                          />
                          Featured only
                        </label>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Search (optional)</label>
                        <input
                          className="input-field"
                          placeholder="Search products..."
                          value={block.settings?.search || ''}
                          onChange={(e) => updateBlockSetting(i, 'search', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {(block.type === 'categories_grid') && (
                    <CategoriesGridBlockEditor
                      block={block}
                      categories={categories}
                      onTitleChange={(value) => updateBlock(i, 'title', value)}
                      onSettingChange={(key, value) => updateBlockSetting(i, key, value)}
                      onMoveUp={() => moveBlock(i, -1)}
                      onMoveDown={() => moveBlock(i, 1)}
                      canMoveUp={i > 0}
                      canMoveDown={i < blocks.length - 1}
                    />
                  )}

                  {(block.type === 'faq') && (
                    <FaqBlockEditor
                      title={block.title || ''}
                      subtitle={block.content || ''}
                      settings={block.settings || {}}
                      onTitleChange={(value) => updateBlock(i, 'title', value)}
                      onSubtitleChange={(value) => updateBlock(i, 'content', value)}
                      onSettingChange={(key, value) => updateBlockSetting(i, key, value)}
                    />
                  )}

                  {(block.type === 'delivery_countdown') && (
                    <div className="space-y-3 rounded-xl border border-rose-100 bg-rose-50/30 p-4">
                      <p className="text-xs text-rose-800">
                        <strong>Delivery cycle:</strong> From midnight NST until cut-off → &quot;today&quot; title and countdown to cut-off.
                        After cut-off until midnight NST → title switches to &quot;Tomorrow&quot; (auto from same-day title if next-day title is blank).
                      </p>
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase text-gray-500">Background image</p>
                        <CmsImagePicker
                          mode="single"
                          guideKey="cmsSlide"
                          images={
                            block.images?.length
                              ? block.images
                              : block.image?.url
                                ? [{ url: block.image.url, alt: block.image.alt || '' }]
                                : []
                          }
                          onChange={(imgs) => updateBlockImages(i, imgs)}
                          alt={block.image?.alt || block.title || 'Delivery countdown background'}
                        />
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Image alt text</label>
                          <input
                            className="input-field"
                            placeholder="Describe the background image"
                            value={block.image?.alt || ''}
                            onChange={(e) => updateBlockImageAlt(i, e.target.value)}
                          />
                        </div>
                        {block.image?.url && (
                          <div>
                            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                              Overlay darkness — {block.settings?.backgroundOverlayOpacity ?? 55}%
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={90}
                              step={5}
                              className="w-full accent-rose-600"
                              value={block.settings?.backgroundOverlayOpacity ?? 55}
                              onChange={(e) => updateBlockSetting(i, 'backgroundOverlayOpacity', Number(e.target.value))}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Lower = background image shows through more. Higher = darker overlay for clearer text.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Same-day cut-off (HH:MM)</label>
                          <input
                            className="input-field"
                            placeholder="17:00"
                            value={block.settings?.cutoffTime || '17:00'}
                            onChange={(e) => updateBlockSetting(i, 'cutoffTime', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Timezone</label>
                          <input
                            className="input-field"
                            value={block.settings?.timezone || 'Asia/Kathmandu'}
                            onChange={(e) => updateBlockSetting(i, 'timezone', e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Title — same-day window (midnight to cut-off)</label>
                          <input
                            className="input-field"
                            value={block.settings?.titleSameDay || ''}
                            onChange={(e) => updateBlockSetting(i, 'titleSameDay', e.target.value)}
                            placeholder={block.title || 'Need delivery today in Kathmandu Valley?'}
                          />
                          <p className="text-xs text-gray-400 mt-1">Leave blank to use the block title above.</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Title — next-day window (after cut-off to midnight)</label>
                          <input
                            className="input-field"
                            value={block.settings?.titleNextDay || ''}
                            onChange={(e) => updateBlockSetting(i, 'titleNextDay', e.target.value)}
                            placeholder="Need delivery Tomorrow in Kathmandu Valley?"
                          />
                          <p className="text-xs text-gray-400 mt-1">Leave blank to auto-change &quot;today&quot; to &quot;Tomorrow&quot; in the same-day title after cut-off.</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Countdown label (same-day)</label>
                          <input
                            className="input-field"
                            value={block.settings?.headingBefore || ''}
                            onChange={(e) => updateBlockSetting(i, 'headingBefore', e.target.value)}
                            placeholder="Order closing in..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Countdown label (next-day)</label>
                          <input
                            className="input-field"
                            value={block.settings?.headingAfter || ''}
                            onChange={(e) => updateBlockSetting(i, 'headingAfter', e.target.value)}
                            placeholder="Same-day delivery opens in..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                    <input
                      type="checkbox"
                      checked={block.isActive !== false}
                      onChange={(e) => updateBlock(i, 'isActive', e.target.checked)}
                    />
                    Enabled
                  </label>
                </div>
              ))}
            </>
          ) : (
            <div className="card text-gray-400 text-center py-12">
              Select a page to edit, or click <strong className="text-gray-600">+ New page</strong> to create one.
            </div>
          )}
        </div>
      </div>

      <CmsPageFormModal
        open={pageModal.open}
        mode={pageModal.mode}
        initial={pageModal.mode === 'edit' || pageModal.mode === 'clone' ? selected : null}
        takenTypes={takenPageTypes}
        onClose={() => setPageModal({ open: false, mode: 'create' })}
        onSave={
          pageModal.mode === 'edit'
            ? handleUpdatePage
            : pageModal.mode === 'clone'
              ? handleClonePage
              : handleCreatePage
        }
        saving={pageSaving}
      />
    </div>
  );
}
