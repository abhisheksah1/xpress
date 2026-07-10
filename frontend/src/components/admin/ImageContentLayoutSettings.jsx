import {
  IMAGE_CONTENT_LAYOUTS,
  OVERLAY_POSITIONS,
  BUTTON_LAYOUTS,
  BUTTON_ALIGNS,
  TEXT_ALIGNS,
  BUTTON_STYLES,
} from '../../utils/imageContentLayout.js';

function ButtonFields({ label, textKey, linkKey, styleKey, settings, set }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-white p-3 space-y-2">
      <p className="text-xs font-bold uppercase text-indigo-800">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">Button text</label>
          <input
            className="input-field text-sm"
            placeholder="e.g. Shop now"
            value={settings[textKey] || ''}
            onChange={(e) => set(textKey, e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">Button URL</label>
          <input
            className="input-field text-sm"
            placeholder="/shop or https://..."
            value={settings[linkKey] || ''}
            onChange={(e) => set(linkKey, e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase text-gray-400 mb-1">Button style</label>
        <select
          className="input-field text-sm"
          value={settings[styleKey] || (styleKey === 'button2Style' ? 'secondary' : 'primary')}
          onChange={(e) => set(styleKey, e.target.value)}
        >
          {BUTTON_STYLES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-indigo-100">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Text alignment</label>
          <select
            className="input-field"
            value={settings.textAlign || 'left'}
            onChange={(e) => set('textAlign', e.target.value)}
          >
            {TEXT_ALIGNS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Buttons layout</label>
          <select
            className="input-field"
            value={settings.buttonLayout || 'row'}
            onChange={(e) => set('buttonLayout', e.target.value)}
          >
            {BUTTON_LAYOUTS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Buttons alignment</label>
          <select
            className="input-field"
            value={settings.buttonAlign || 'left'}
            onChange={(e) => set('buttonAlign', e.target.value)}
          >
            {BUTTON_ALIGNS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 pt-1 border-t border-indigo-100">
        <p className="text-xs font-bold uppercase text-indigo-800">Call-to-action buttons</p>
        <p className="text-xs text-gray-500 -mt-1">
          Add up to 2 buttons below the text. Leave a button blank to hide it.
        </p>
        <ButtonFields
          label="Button 1"
          textKey="button1Text"
          linkKey="button1Link"
          styleKey="button1Style"
          settings={settings}
          set={set}
        />
        <ButtonFields
          label="Button 2"
          textKey="button2Text"
          linkKey="button2Link"
          styleKey="button2Style"
          settings={settings}
          set={set}
        />
      </div>

      {layout !== 'overlay' && (
        <p className="text-xs text-gray-500">
          Side-by-side layouts stack on mobile. Overlay places text and buttons on top of the image.
        </p>
      )}
    </div>
  );
}
