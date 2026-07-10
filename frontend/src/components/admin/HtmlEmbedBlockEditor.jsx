export default function HtmlEmbedBlockEditor({
  title = '',
  content = '',
  settings = {},
  onTitleChange,
  onContentChange,
  onSettingChange,
}) {
  return (
    <div className="space-y-4 rounded-xl border border-violet-100 bg-violet-50/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-100 text-violet-800">
          HTML embed
        </span>
        <span className="text-sm text-gray-600">Paste HTML, CSS, or embed snippets (iframes, widgets, etc.)</span>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Optional title</label>
        <input
          className="input-field"
          placeholder="Section title (optional)"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Width</label>
          <select
            className="input-field"
            value={settings.width || 'contained'}
            onChange={(e) => onSettingChange('width', e.target.value)}
          >
            <option value="contained">Contained (same as product grid)</option>
            <option value="full">Full page width</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={settings.showBorder !== false}
              onChange={(e) => onSettingChange('showBorder', e.target.checked)}
            />
            Show border around embed
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">HTML code</label>
        <textarea
          className="input-field font-mono text-xs sm:text-sm min-h-[160px]"
          rows={8}
          spellCheck={false}
          placeholder={'<div class="my-widget">\n  Hello world\n</div>\n\n<!-- or paste an iframe / embed snippet -->'}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">CSS code (optional)</label>
        <textarea
          className="input-field font-mono text-xs sm:text-sm min-h-[120px]"
          rows={6}
          spellCheck={false}
          placeholder={'.my-widget {\n  padding: 1rem;\n  background: #f8fafc;\n}'}
          value={settings.css || ''}
          onChange={(e) => onSettingChange('css', e.target.value)}
        />
        <p className="text-[11px] text-gray-500 mt-1">
          CSS is scoped to this block. You can also include a <code className="font-mono">&lt;style&gt;</code> tag inside the HTML field.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Custom JavaScript (optional)</label>
        <textarea
          className="input-field font-mono text-xs sm:text-sm min-h-[100px]"
          rows={5}
          spellCheck={false}
          placeholder={'// Runs after the embed mounts\nconsole.log("embed ready");'}
          value={settings.js || ''}
          onChange={(e) => onSettingChange('js', e.target.value)}
        />
        <p className="text-[11px] text-amber-700 mt-1">
          Only add trusted scripts. Malicious JS can affect the storefront.
        </p>
      </div>
    </div>
  );
}
