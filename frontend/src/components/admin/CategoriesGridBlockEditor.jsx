import { CATEGORY_SORT_OPTIONS } from '../../utils/categoriesGrid.js';

export default function CategoriesGridBlockEditor({
  block,
  categories,
  onTitleChange,
  onSettingChange,
}) {
  const settings = block.settings || {};
  const selectedIds = (settings.categoryIds || []).map(String);

  const toggleCategory = (id) => {
    const sid = String(id);
    const next = selectedIds.includes(sid)
      ? selectedIds.filter((x) => x !== sid)
      : [...selectedIds, sid];
    onSettingChange('categoryIds', next);
  };

  return (
    <div className="rounded-xl border border-pink-100 bg-pink-50/30 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-pink-100 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-pink-100 text-pink-800 shrink-0">
            Categories grid
          </span>
          <span className="text-sm font-medium text-gray-800 truncate">{block.title || 'Browse categories'}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Primary heading text</label>
          <input
            className="input-field"
            placeholder="Browse Store Occasions"
            value={block.title || ''}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Sort categories by</label>
            <select
              className="input-field"
              value={settings.sortBy || 'custom'}
              onChange={(e) => onSettingChange('sortBy', e.target.value)}
            >
              {CATEGORY_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Max display limit</label>
            <input
              type="number"
              min="1"
              max="100"
              className="input-field"
              value={settings.limit ?? 20}
              onChange={(e) => onSettingChange('limit', Math.max(1, Number(e.target.value) || 20))}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Desktop columns (2–6)</label>
            <input
              type="number"
              min="2"
              max="6"
              className="input-field"
              value={settings.cols ?? 4}
              onChange={(e) => onSettingChange('cols', Math.max(2, Math.min(6, Number(e.target.value) || 4)))}
            />
            <p className="text-[11px] text-gray-400 mt-1">Mobile always shows 2 per row.</p>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!settings.hideEmpty}
                onChange={(e) => onSettingChange('hideEmpty', e.target.checked)}
              />
              Hide empty categories
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Select categories to display</label>
          <p className="text-xs text-gray-400 mb-2">If none are checked, all categories will be shown according to rules.</p>
          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">No categories found. Add categories under Catalog first.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto rounded-lg border border-gray-100 bg-white p-3">
              {categories.map((cat) => (
                <label key={cat._id} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0"
                    checked={selectedIds.includes(String(cat._id))}
                    onChange={() => toggleCategory(cat._id)}
                  />
                  <span className="line-clamp-2 leading-snug">{cat.name}</span>
                </label>
              ))}
            </div>
          )}
          {selectedIds.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">{selectedIds.length} selected — custom order follows check order when sort is &quot;Custom hierarchy order&quot;.</p>
          )}
        </div>
      </div>
    </div>
  );
}
