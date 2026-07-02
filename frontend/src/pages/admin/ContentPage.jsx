import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

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
    setSelected(data.data);
    setBlocks(data.data.blocks || []);
  };

  const updateBlock = (index, field, value) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
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
    setBlocks((prev) => [...prev, { type, title: '', content: '', sortOrder: prev.length, isActive: true }]);
  };

  const removeBlock = (index) => setBlocks((prev) => prev.filter((_, i) => i !== index));

  const handleSaveBlocks = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApi.updateCmsBlocks(selected._id, blocks);
      toast.success('Page content saved');
      load();
    } catch {
      toast.error('Failed to save');
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

  const categoryOptions = useMemo(
    () => [{ _id: '', name: 'All Categories' }, ...categories],
    [categories]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Content Manager</h1>
      <p className="text-sm text-gray-500 mb-6">Edit homepage, about, contact, FAQ, and all CMS pages.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Pages</div>
          <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
            {pages.map((p) => (
              <button
                key={p._id}
                onClick={() => selectPage(p)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 ${
                  selected?._id === p._id ? 'bg-primary-50 text-primary-700' : ''
                }`}
              >
                <span className="font-medium">{p.title}</span>
                <span className="block text-xs text-gray-400">{p.pageType} · /{p.slug}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="card flex justify-between items-center">
                <div>
                  <h2 className="font-bold">{selected.title}</h2>
                  <p className="text-sm text-gray-500">/{selected.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={togglePublish} className="btn-secondary text-sm">
                    {selected.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={handleSaveBlocks} disabled={saving} className="btn-primary text-sm">
                    {saving ? 'Saving...' : 'Save Content'}
                  </button>
                </div>
              </div>

              <div className="card space-y-3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">SEO</h3>
                <input
                  className="input-field"
                  placeholder="Meta title (optional)"
                  value={selected.metaTitle || ''}
                  onChange={(e) => setSelected((p) => ({ ...p, metaTitle: e.target.value }))}
                />
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Meta description (optional)"
                  value={selected.metaDescription || ''}
                  onChange={(e) => setSelected((p) => ({ ...p, metaDescription: e.target.value }))}
                />
                <button
                  onClick={async () => {
                    try {
                      await adminApi.updateCmsPage(selected._id, {
                        metaTitle: selected.metaTitle,
                        metaDescription: selected.metaDescription,
                      });
                      toast.success('SEO saved');
                      load();
                    } catch {
                      toast.error('Failed to save SEO');
                    }
                  }}
                  className="btn-secondary text-sm"
                >
                  Save SEO
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {BLOCK_TYPES.map((t) => (
                  <button key={t} onClick={() => addBlock(t)} className="btn-secondary text-xs capitalize">+ {t}</button>
                ))}
              </div>

              {blocks.map((block, i) => (
                <div key={block._id || i} className="card space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase text-gray-400">{block.type} block</span>
                    <button onClick={() => removeBlock(i)} className="text-red-500 text-xs">Remove</button>
                  </div>

                  {(block.type === 'hero' || block.type === 'banner' || block.type === 'slider' || block.type === 'text' || block.type === 'cta' || block.type === 'testimonial' || block.type === 'image_content' || block.type === 'product_grid' || block.type === 'categories_grid' || block.type === 'google_reviews' || block.type === 'delivery_countdown' || block.type === 'video') && (
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

                  {(block.type === 'image' || block.type === 'banner' || block.type === 'image_content') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Image URL</label>
                        <input
                          className="input-field"
                          placeholder="https://..."
                          value={block.image?.url || ''}
                          onChange={(e) => updateBlock(i, 'image', { ...(block.image || {}), url: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Alt text</label>
                        <input
                          className="input-field"
                          placeholder="Describe the image"
                          value={block.image?.alt || ''}
                          onChange={(e) => updateBlock(i, 'image', { ...(block.image || {}), alt: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {(block.type === 'slider') && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase text-gray-400">Slider images (one URL per line)</label>
                      <textarea
                        className="input-field"
                        rows={4}
                        placeholder="https://image1...\nhttps://image2..."
                        value={(block.images || []).map((img) => img.url).join('\n')}
                        onChange={(e) => {
                          const urls = e.target.value
                            .split('\n')
                            .map((x) => x.trim())
                            .filter(Boolean);
                          updateBlock(i, 'images', urls.map((url) => ({ url })));
                        }}
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
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Video embed URL</label>
                      <input
                        className="input-field"
                        placeholder="https://www.youtube.com/embed/...."
                        value={block.settings?.url || ''}
                        onChange={(e) => updateBlockSetting(i, 'url', e.target.value)}
                      />
                      <p className="text-xs text-gray-400 mt-1">Use an embed URL (not a normal watch link).</p>
                    </div>
                  )}

                  {(block.type === 'google_reviews') && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Google reviews iframe URL</label>
                      <input
                        className="input-field"
                        placeholder="https://..."
                        value={block.settings?.iframeUrl || ''}
                        onChange={(e) => updateBlockSetting(i, 'iframeUrl', e.target.value)}
                      />
                    </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Columns (2–6)</label>
                        <input
                          type="number"
                          min="2"
                          max="6"
                          className="input-field"
                          value={block.settings?.cols || 4}
                          onChange={(e) => updateBlockSetting(i, 'cols', Math.max(2, Math.min(6, Number(e.target.value) || 4)))}
                        />
                      </div>
                    </div>
                  )}

                  {(block.type === 'faq') && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase text-gray-400">FAQ items (Q and A)</label>
                      <textarea
                        className="input-field"
                        rows={6}
                        placeholder="Q: What is your delivery window?\nA: Same-day within Kathmandu Valley...\n\nQ: ...\nA: ..."
                        value={block.content || ''}
                        onChange={(e) => {
                          updateBlock(i, 'content', e.target.value);
                          const text = e.target.value;
                          const chunks = text.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);
                          const items = chunks.map((chunk) => {
                            const q = (chunk.match(/^Q:\s*(.*)$/m)?.[1] || '').trim();
                            const a = (chunk.match(/^A:\s*([\s\S]*)$/m)?.[1] || '').trim();
                            return q && a ? { q, a } : null;
                          }).filter(Boolean);
                          updateBlockSetting(i, 'items', items);
                        }}
                      />
                      <p className="text-xs text-gray-400">Tip: write as “Q:” and “A:” pairs. We auto-convert to FAQ cards.</p>
                    </div>
                  )}

                  {(block.type === 'delivery_countdown') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Cut-off time (HH:MM)</label>
                        <input
                          className="input-field"
                          placeholder="16:00"
                          value={block.settings?.cutoffTime || '16:00'}
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
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Heading before cutoff</label>
                        <input
                          className="input-field"
                          value={block.settings?.headingBefore || ''}
                          onChange={(e) => updateBlockSetting(i, 'headingBefore', e.target.value)}
                          placeholder="Same-day order closing in..."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Heading after cutoff</label>
                        <input
                          className="input-field"
                          value={block.settings?.headingAfter || ''}
                          onChange={(e) => updateBlockSetting(i, 'headingAfter', e.target.value)}
                          placeholder="Next cut-off in..."
                        />
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
            <div className="card text-gray-400 text-center py-12">Select a page to edit its content blocks</div>
          )}
        </div>
      </div>
    </div>
  );
}
