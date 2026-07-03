import { IMAGE_CONTENT_LAYOUTS, OVERLAY_POSITIONS } from '../../utils/imageContentLayout.js';

export default function ImageContentLayoutSettings({ settings = {}, onChange }) {
  const layout = settings.layout || settings.imagePosition || 'left';
  const overlayPosition = settings.overlayPosition || 'center';

  const set = (key, value) => onChange(key, value);

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase text-indigo-800 mb-2">Layout</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {IMAGE_CONTENT_LAYOUTS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                layout === opt.value
                  ? 'border-indigo-400 bg-white text-indigo-900 shadow-sm'
                  : 'border-gray-200 bg-white/80 text-gray-700 hover:border-indigo-200'
              }`}
            >
              <input
                type="radio"
                name="image-content-layout"
                className="shrink-0"
                checked={layout === opt.value}
                onChange={() => {
                  set('layout', opt.value);
                  if (opt.value !== 'overlay') {
                    set('imagePosition', opt.value === 'left' || opt.value === 'right' ? opt.value : undefined);
                  }
                }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {layout === 'overlay' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Content position on image</label>
            <select
              className="input-field"
              value={overlayPosition}
              onChange={(e) => set('overlayPosition', e.target.value)}
            >
              {OVERLAY_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Overlay style</label>
            <select
              className="input-field"
              value={settings.overlayStyle || 'dark'}
              onChange={(e) => set('overlayStyle', e.target.value)}
            >
              <option value="dark">Dark gradient (readable white text)</option>
              <option value="light">Light gradient</option>
              <option value="none">No overlay</option>
            </select>
          </div>
        </div>
      )}

      {layout !== 'overlay' && (
        <p className="text-xs text-gray-500">
          Use side-by-side layouts on desktop; stacked layouts show image and content in a single column on all screen sizes.
        </p>
      )}
    </div>
  );
}
