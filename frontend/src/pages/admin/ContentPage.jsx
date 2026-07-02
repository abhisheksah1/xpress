import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const BLOCK_TYPES = ['hero', 'text', 'cta', 'faq', 'testimonial', 'image'];

export default function ContentPage() {
  const [pages, setPages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await adminApi.getCmsPages();
    setPages(data.data);
  };

  useEffect(() => { load(); }, []);

  const selectPage = async (page) => {
    const { data } = await adminApi.getCmsPage(page._id);
    setSelected(data.data);
    setBlocks(data.data.blocks || []);
  };

  const updateBlock = (index, field, value) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
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
                  <input className="input-field" placeholder="Title" value={block.title || ''} onChange={(e) => updateBlock(i, 'title', e.target.value)} />
                  <textarea className="input-field" rows={3} placeholder="Content" value={block.content || ''} onChange={(e) => updateBlock(i, 'content', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input-field text-sm" placeholder="Button text" value={block.buttonText || ''} onChange={(e) => updateBlock(i, 'buttonText', e.target.value)} />
                    <input className="input-field text-sm" placeholder="Button link" value={block.buttonLink || ''} onChange={(e) => updateBlock(i, 'buttonLink', e.target.value)} />
                  </div>
                  {(block.type === 'text' || block.type === 'faq') && (
                    <textarea
                      className="input-field text-xs font-mono"
                      rows={4}
                      placeholder='Settings JSON e.g. {"features":[{"title":"...","desc":"..."}]}'
                      value={block.settings ? JSON.stringify(block.settings, null, 2) : ''}
                      onChange={(e) => {
                        try { updateBlock(i, 'settings', JSON.parse(e.target.value)); } catch { /* typing */ }
                      }}
                    />
                  )}
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
