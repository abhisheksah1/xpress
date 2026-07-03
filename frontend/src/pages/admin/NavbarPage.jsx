import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import HeaderNavbarEditor from '../../components/admin/HeaderNavbarEditor.jsx';
import FooterNavbarEditor from '../../components/admin/FooterNavbarEditor.jsx';
import { DEFAULT_FOOTER_LAYOUT, DEFAULT_FOOTER_OPTIONS, resolveFooterOptions } from '../../utils/footerLayout.js';
import { DEFAULT_BRAND_LOGO } from '../../config/brandLogo.js';

export default function NavbarPage() {
  const [navbars, setNavbars] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await adminApi.getNavbars();
    setNavbars(data.data);
  };

  useEffect(() => { load(); }, []);

  const selectNavbar = async (nav) => {
    const { data } = await adminApi.getNavbar(nav._id);
    setSelected(data.data);
    setDraft({
      announcement: data.data.announcement,
      headerOptions: data.data.headerOptions,
      menuBar: data.data.menuBar,
      footerOptions: resolveFooterOptions(data.data.footerOptions || {}),
      footerLayout: data.data.footerLayout?.linkColumns?.length
        ? data.data.footerLayout
        : DEFAULT_FOOTER_LAYOUT,
      logo: data.data.logo?.url ? data.data.logo : DEFAULT_BRAND_LOGO,
    });
    setItems(data.data.items || []);
  };

  const handleNavbarPatch = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if ((selected.location === 'header' || selected.location === 'footer') && draft) {
        await adminApi.updateNavbar(selected._id, draft);
      }
      if (selected.location === 'header') {
        await adminApi.updateNavItems(selected._id, items);
      }
      toast.success('Navigation saved');
      await load();
      await selectNavbar({ _id: selected._id });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save navigation');
    } finally {
      setSaving(false);
    }
  };

  const isHeader = selected?.location === 'header';
  const isFooter = selected?.location === 'footer';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Navigation</h1>
      <p className="text-sm text-gray-500 mb-6">
        Customize the storefront header and footer: announcement bar, logo, menus, link columns, and company info.
      </p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-0 overflow-hidden">
          {navbars.map((nav) => (
            <button
              key={nav._id}
              type="button"
              onClick={() => selectNavbar(nav)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${
                selected?._id === nav._id ? 'bg-primary-50' : ''
              }`}
            >
              <span className="font-medium text-sm">{nav.name}</span>
              <span className="block text-xs text-gray-400 capitalize">{nav.location}</span>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="card flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h2 className="font-bold">{selected.name}</h2>
                  <p className="text-xs text-gray-400 capitalize">{selected.location} navigation</p>
                </div>
                <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-sm shrink-0">
                  {saving ? 'Saving...' : 'Save navigation'}
                </button>
              </div>

              {isHeader ? (
                <HeaderNavbarEditor
                  navbar={{ ...selected, ...draft }}
                  items={items}
                  onNavbarChange={handleNavbarPatch}
                  onItemsChange={setItems}
                />
              ) : isFooter ? (
                <FooterNavbarEditor
                  footerOptions={draft?.footerOptions || selected.footerOptions}
                  footerLayout={draft?.footerLayout || selected.footerLayout}
                  logo={draft?.logo || selected.logo}
                  onFooterChange={(footerOptions) => handleNavbarPatch({ footerOptions })}
                  onFooterLayoutChange={(footerLayout) => handleNavbarPatch({ footerLayout })}
                  onLogoChange={(logo) => handleNavbarPatch({ logo })}
                />
              ) : (
                <p className="text-sm text-gray-500 card">No editor available for this menu type.</p>
              )}
            </>
          ) : (
            <div className="card text-center text-gray-400 py-12">Select a menu to edit</div>
          )}
        </div>
      </div>
    </div>
  );
}
