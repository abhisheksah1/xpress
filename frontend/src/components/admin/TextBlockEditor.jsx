import RichTextEditor from './RichTextEditor.jsx';
import { getTextBlockHtml } from '../../utils/cmsHtml.js';

export default function TextBlockEditor({
  block,
  onSettingChange,
  onSettingsChange,
  onContentChange,
}) {
  const settings = block.settings || {};
  const html = getTextBlockHtml(block);

  const setHtml = (nextHtml) => {
    if (onSettingsChange) {
      onSettingsChange({ html: nextHtml, sections: [] });
    } else {
      onSettingChange('html', nextHtml);
      onSettingChange('sections', []);
    }
    onContentChange?.(nextHtml);
  };

  return (
    <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-emerald-800">Rich text editor</p>
          <p className="text-[11px] text-gray-500">
            Mix H1–H6, paragraphs, images (with alt), lists, tables, and CTA buttons in one box.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Block text position</label>
          <select
            className="input-field"
            value={settings.textAlign || 'left'}
            onChange={(e) => onSettingChange('textAlign', e.target.value)}
          >
            <option value="left">Left</option>
            <option value="center">Center / middle</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Background colour</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-12 rounded border border-gray-300 cursor-pointer bg-white p-1"
              value={settings.backgroundColor || '#ffffff'}
              onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
            />
            <input
              className="input-field font-mono text-sm"
              value={settings.backgroundColor || '#ffffff'}
              onChange={(e) => onSettingChange('backgroundColor', e.target.value)}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      <RichTextEditor
        value={html}
        onChange={setHtml}
        placeholder="Write your content — headings, paragraphs, images, buttons…"
      />

      <p className="text-[11px] text-gray-500">
        Tips: select text then click H1/H2/P · use image buttons for photos (you’ll be asked for alt text) · CTA inserts an action button with redirect link.
      </p>
    </div>
  );
}
