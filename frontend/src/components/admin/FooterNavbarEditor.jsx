import CmsImagePicker from './CmsImagePicker.jsx';
import { DEFAULT_FOOTER_LAYOUT, DEFAULT_FOOTER_OPTIONS, resolveFooterOptions } from '../../utils/footerLayout.js';
import { DEFAULT_BRAND_LOGO_URL } from '../../config/brandLogo.js';

const emptyLink = () => ({ label: '', link: '/' });
const emptyInfo = () => ({ label: '', value: '' });

export default function FooterNavbarEditor({
  footerOptions = {},
  footerLayout = {},
  logo,
  onFooterChange,
  onFooterLayoutChange,
  onLogoChange,
}) {
  const opts = resolveFooterOptions(footerOptions);
  const layout = {
    ...DEFAULT_FOOTER_LAYOUT,
    ...footerLayout,
    linkColumns: footerLayout?.linkColumns?.length
      ? footerLayout.linkColumns
      : DEFAULT_FOOTER_LAYOUT.linkColumns,
    infoColumns: footerLayout?.infoColumns?.length
      ? footerLayout.infoColumns
      : DEFAULT_FOOTER_LAYOUT.infoColumns,
  };

  const setOpts = (patch) => onFooterChange({ ...opts, ...patch });
  const setLayout = (patch) => onFooterLayoutChange({ ...layout, ...patch });

  const updateLinkColumn = (colIndex, patch) => {
    const linkColumns = layout.linkColumns.map((col, i) => (i === colIndex ? { ...col, ...patch } : col));
    setLayout({ linkColumns });
  };

  const updateLinkItem = (colIndex, itemIndex, patch) => {
    const items = layout.linkColumns[colIndex].items.map((item, i) =>
      i === itemIndex ? { ...item, ...patch } : item
    );
    updateLinkColumn(colIndex, { items });
  };

  const addLinkColumn = () => {
    setLayout({
      linkColumns: [...layout.linkColumns, { title: 'New Column', items: [emptyLink()] }],
    });
  };

  const removeLinkColumn = (colIndex) => {
    setLayout({ linkColumns: layout.linkColumns.filter((_, i) => i !== colIndex) });
  };

  const addLinkItem = (colIndex) => {
    const items = [...(layout.linkColumns[colIndex].items || []), emptyLink()];
    updateLinkColumn(colIndex, { items });
  };

  const removeLinkItem = (colIndex, itemIndex) => {
    const items = layout.linkColumns[colIndex].items.filter((_, i) => i !== itemIndex);
    updateLinkColumn(colIndex, { items });
  };

  const updateInfoColumn = (colIndex, items) => {
    const infoColumns = layout.infoColumns.map((col, i) => (i === colIndex ? { items } : col));
    setLayout({ infoColumns });
  };

  const updateInfoItem = (colIndex, itemIndex, patch) => {
    const items = layout.infoColumns[colIndex].items.map((item, i) =>
      i === itemIndex ? { ...item, ...patch } : item
    );
    updateInfoColumn(colIndex, items);
  };

  const addInfoColumn = () => {
    setLayout({
      infoColumns: [...layout.infoColumns, { items: [emptyInfo()] }],
    });
  };

  const removeInfoColumn = (colIndex) => {
    setLayout({ infoColumns: layout.infoColumns.filter((_, i) => i !== colIndex) });
  };

  const addInfoItem = (colIndex) => {
    const items = [...(layout.infoColumns[colIndex].items || []), emptyInfo()];
    updateInfoColumn(colIndex, items);
  };

  const removeInfoItem = (colIndex, itemIndex) => {
    const items = layout.infoColumns[colIndex].items.filter((_, i) => i !== itemIndex);
    updateInfoColumn(colIndex, items);
  };

  const logoImages = logo?.url
    ? [{ url: logo.url, alt: logo.alt || '' }]
    : [{ url: DEFAULT_BRAND_LOGO_URL, alt: 'Koseli Xpress' }];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Footer colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['backgroundColor', 'Background'],
            ['textColor', 'Text'],
            ['headingColor', 'Headings'],
            ['borderColor', 'Divider'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">{label}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 rounded border border-gray-200 shrink-0"
                  value={opts[key]}
                  onChange={(e) => setOpts({ [key]: e.target.value })}
                />
                <input
                  className="input-field font-mono text-sm"
                  value={opts[key]}
                  onChange={(e) => setOpts({ [key]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Footer logo</h3>
        <label className="flex items-center gap-2 text-sm mb-2">
          <input
            type="checkbox"
            checked={layout.showLogo !== false}
            onChange={(e) => setLayout({ showLogo: e.target.checked })}
          />
          Show logo in footer
        </label>
        <CmsImagePicker
          mode="single"
          guideKey="logo"
          images={logoImages}
          onChange={(imgs) => {
            const first = imgs[0];
            onLogoChange(first ? { url: first.url, alt: first.alt || 'Footer logo' } : undefined);
          }}
          alt={logo?.alt || 'Footer logo'}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-gray-900">Link columns (top section)</h3>
          <button type="button" onClick={addLinkColumn} className="btn-secondary text-sm">+ Add column</button>
        </div>
        {layout.linkColumns.map((col, ci) => (
          <div key={ci} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50/50">
            <div className="flex gap-2 items-center">
              <input
                className="input-field flex-1 font-semibold"
                placeholder="Column title"
                value={col.title || ''}
                onChange={(e) => updateLinkColumn(ci, { title: e.target.value })}
              />
              <button type="button" onClick={() => removeLinkColumn(ci)} className="text-red-500 text-xs shrink-0">Remove column</button>
            </div>
            {(col.items || []).map((item, ii) => (
              <div key={ii} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <input className="input-field sm:col-span-4 text-sm" placeholder="Link label" value={item.label || ''} onChange={(e) => updateLinkItem(ci, ii, { label: e.target.value })} />
                <input className="input-field sm:col-span-6 text-sm" placeholder="/about or https://..." value={item.link || ''} onChange={(e) => updateLinkItem(ci, ii, { link: e.target.value })} />
                <button type="button" onClick={() => removeLinkItem(ci, ii)} className="sm:col-span-2 text-red-500 text-xs text-left">Del</button>
              </div>
            ))}
            <button type="button" onClick={() => addLinkItem(ci)} className="text-xs text-primary-600 font-semibold hover:underline">+ Add link</button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-gray-900">Company info (bottom section)</h3>
          <button type="button" onClick={addInfoColumn} className="btn-secondary text-sm">+ Add column</button>
        </div>
        {layout.infoColumns.map((col, ci) => (
          <div key={ci} className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50/50">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold uppercase text-gray-400">Column {ci + 1}</p>
              <button type="button" onClick={() => removeInfoColumn(ci)} className="text-red-500 text-xs">Remove column</button>
            </div>
            {(col.items || []).map((item, ii) => (
              <div key={ii} className="space-y-1.5 rounded border border-gray-100 bg-white p-3">
                <input className="input-field text-sm font-semibold" placeholder="Label (e.g. Registered Business Name)" value={item.label || ''} onChange={(e) => updateInfoItem(ci, ii, { label: e.target.value })} />
                <textarea className="input-field text-sm" rows={2} placeholder="Value" value={item.value || ''} onChange={(e) => updateInfoItem(ci, ii, { value: e.target.value })} />
                <button type="button" onClick={() => removeInfoItem(ci, ii)} className="text-red-500 text-xs">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => addInfoItem(ci)} className="text-xs text-primary-600 font-semibold hover:underline">+ Add info field</button>
          </div>
        ))}
      </section>
    </div>
  );
}
