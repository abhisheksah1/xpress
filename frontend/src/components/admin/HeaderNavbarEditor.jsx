import CmsImagePicker from './CmsImagePicker.jsx';
import { DEFAULT_BRAND_LOGO } from '../../config/brandLogo.js';

const emptyChild = () => ({ label: 'Sub link', link: '/shop', isActive: true });

export default function HeaderNavbarEditor({
  navbar,
  items,
  onNavbarChange,
  onItemsChange,
}) {
  const announcement = {
    enabled: true,
    text: '',
    backgroundColor: '#22c55e',
    textColor: '#ffffff',
    ...(navbar?.announcement || {}),
  };
  const headerOptions = {
    showSearch: true,
    showCart: true,
    showCurrency: true,
    showLogin: true,
    showReminders: true,
    showLogo: true,
    searchPlaceholder: 'Search gifts & flowers...',
    ...(navbar?.headerOptions || {}),
  };
  const menuBar = {
    enabled: true,
    backgroundColor: '#f3f4f6',
    ...(navbar?.menuBar || {}),
  };

  const setAnnouncement = (patch) => onNavbarChange({ announcement: { ...announcement, ...patch } });
  const setHeaderOptions = (patch) => onNavbarChange({ headerOptions: { ...headerOptions, ...patch } });
  const setMenuBar = (patch) => onNavbarChange({ menuBar: { ...menuBar, ...patch } });

  const updateItem = (index, patch) => {
    onItemsChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    onItemsChange([
      ...items,
      { label: 'New Menu', link: '/shop', type: 'link', children: [], sortOrder: items.length, isActive: true },
    ]);
  };

  const removeItem = (index) => onItemsChange(items.filter((_, i) => i !== index));

  const updateChild = (itemIndex, childIndex, patch) => {
    const item = items[itemIndex];
    const children = [...(item.children || [])];
    children[childIndex] = { ...children[childIndex], ...patch };
    updateItem(itemIndex, { children });
  };

  const addChild = (itemIndex) => {
    const item = items[itemIndex];
    updateItem(itemIndex, {
      type: 'dropdown',
      children: [...(item.children || []), emptyChild()],
    });
  };

  const removeChild = (itemIndex, childIndex) => {
    const item = items[itemIndex];
    updateItem(itemIndex, {
      children: (item.children || []).filter((_, i) => i !== childIndex),
    });
  };

  const logoImages = navbar?.logo?.url
    ? [{ url: navbar.logo.url, alt: navbar.logo.alt || '' }]
    : [{ url: DEFAULT_BRAND_LOGO.url, alt: DEFAULT_BRAND_LOGO.alt }];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-green-100 bg-green-50/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-green-900">Top announcement bar</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={announcement.enabled !== false}
            onChange={(e) => setAnnouncement({ enabled: e.target.checked })}
          />
          Show announcement bar
        </label>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Announcement text</label>
          <textarea
            className="input-field"
            rows={2}
            value={announcement.text || ''}
            onChange={(e) => setAnnouncement({ text: e.target.value })}
            placeholder="Same-Day Flowers & Cake Delivery Available..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Background color</label>
            <div className="flex gap-2">
              <input type="color" className="h-10 w-12 rounded border border-gray-200" value={announcement.backgroundColor} onChange={(e) => setAnnouncement({ backgroundColor: e.target.value })} />
              <input className="input-field font-mono text-sm" value={announcement.backgroundColor} onChange={(e) => setAnnouncement({ backgroundColor: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Text color</label>
            <div className="flex gap-2">
              <input type="color" className="h-10 w-12 rounded border border-gray-200" value={announcement.textColor} onChange={(e) => setAnnouncement({ textColor: e.target.value })} />
              <input className="input-field font-mono text-sm" value={announcement.textColor} onChange={(e) => setAnnouncement({ textColor: e.target.value })} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Main header row</h3>
        <CmsImagePicker
          mode="single"
          images={logoImages}
          onChange={(imgs) => {
            const first = imgs[0];
            onNavbarChange({
              logo: first ? { url: first.url, alt: first.alt || navbar?.name || 'Logo' } : undefined,
            });
          }}
          alt={navbar?.logo?.alt || 'Store logo'}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={headerOptions.showLogo !== false} onChange={(e) => setHeaderOptions({ showLogo: e.target.checked })} />
            Show logo (center)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={headerOptions.showSearch !== false} onChange={(e) => setHeaderOptions({ showSearch: e.target.checked })} />
            Show search icon
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={headerOptions.showReminders !== false} onChange={(e) => setHeaderOptions({ showReminders: e.target.checked })} />
            Show reminders icon
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={headerOptions.showLogin !== false} onChange={(e) => setHeaderOptions({ showLogin: e.target.checked })} />
            Show login icon
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={headerOptions.showCart !== false} onChange={(e) => setHeaderOptions({ showCart: e.target.checked })} />
            Show cart icon
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={headerOptions.showCurrency !== false} onChange={(e) => setHeaderOptions({ showCurrency: e.target.checked })} />
            Show currency selector
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Search placeholder</label>
          <input
            className="input-field"
            value={headerOptions.searchPlaceholder || ''}
            onChange={(e) => setHeaderOptions({ searchPlaceholder: e.target.value })}
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-gray-900">Bottom menu bar (desktop)</h3>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={menuBar.enabled !== false} onChange={(e) => setMenuBar({ enabled: e.target.checked })} />
            Enable menu bar
          </label>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Menu bar background</label>
          <div className="flex gap-2 max-w-xs">
            <input type="color" className="h-10 w-12 rounded border border-gray-200" value={menuBar.backgroundColor} onChange={(e) => setMenuBar({ backgroundColor: e.target.value })} />
            <input className="input-field font-mono text-sm" value={menuBar.backgroundColor} onChange={(e) => setMenuBar({ backgroundColor: e.target.value })} />
          </div>
        </div>

        <p className="text-xs text-gray-500">Menu links appear centered below the logo on desktop. On mobile they move into the hamburger menu.</p>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item._id || i} className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <input className="input-field sm:col-span-3 text-sm" placeholder="Label" value={item.label} onChange={(e) => updateItem(i, { label: e.target.value })} />
                <input className="input-field sm:col-span-4 text-sm" placeholder="/shop or URL" value={item.link} onChange={(e) => updateItem(i, { link: e.target.value })} />
                <select className="input-field sm:col-span-2 text-sm" value={item.type || 'link'} onChange={(e) => updateItem(i, { type: e.target.value })}>
                  <option value="link">Link</option>
                  <option value="dropdown">Dropdown</option>
                </select>
                <input type="number" className="input-field sm:col-span-1 text-sm" placeholder="#" value={item.sortOrder ?? i} onChange={(e) => updateItem(i, { sortOrder: Number(e.target.value) })} />
                <label className="sm:col-span-1 flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={item.isActive !== false} onChange={(e) => updateItem(i, { isActive: e.target.checked })} />
                  On
                </label>
                <button type="button" onClick={() => removeItem(i)} className="sm:col-span-1 text-red-500 text-xs text-left">Del</button>
              </div>

              {(item.type === 'dropdown' || (item.children || []).length > 0) && (
                <div className="pl-3 border-l-2 border-primary-100 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase">Dropdown items</p>
                  {(item.children || []).map((child, ci) => (
                    <div key={ci} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input className="input-field sm:col-span-5 text-sm" placeholder="Sub label" value={child.label || ''} onChange={(e) => updateChild(i, ci, { label: e.target.value })} />
                      <input className="input-field sm:col-span-5 text-sm" placeholder="/shop?category=..." value={child.link || ''} onChange={(e) => updateChild(i, ci, { link: e.target.value })} />
                      <button type="button" onClick={() => removeChild(i, ci)} className="sm:col-span-2 text-red-500 text-xs">Remove</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addChild(i)} className="text-xs text-primary-600 font-semibold hover:underline">+ Add dropdown link</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={addItem} className="btn-secondary text-sm">+ Add menu item</button>
      </section>
    </div>
  );
}
