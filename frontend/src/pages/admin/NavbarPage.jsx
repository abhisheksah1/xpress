import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

export default function NavbarPage() {
  const [navbars, setNavbars] = useState([]);
  const [selected, setSelected] = useState(null);
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
    setItems(data.data.items || []);
  };

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { label: 'New Link', link: '/', sortOrder: prev.length, isActive: true }]);
  };

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApi.updateNavItems(selected._id, items);
      toast.success('Navigation saved');
      load();
    } catch {
      toast.error('Failed to save navigation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Navigation</h1>
      <p className="text-sm text-gray-500 mb-6">Manage header and footer menu links shown on the storefront.</p>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-0 overflow-hidden">
          {navbars.map((nav) => (
            <button
              key={nav._id}
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
              <div className="card flex justify-between items-center">
                <h2 className="font-bold">{selected.name} <span className="text-sm font-normal text-gray-400">({selected.location})</span></h2>
                <div className="flex gap-2">
                  <button onClick={addItem} className="btn-secondary text-sm">+ Add Link</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save Menu'}</button>
                </div>
              </div>
              {items.map((item, i) => (
                <div key={item._id || i} className="card grid grid-cols-12 gap-3 items-center">
                  <input className="input-field col-span-3 text-sm" placeholder="Label" value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)} />
                  <input className="input-field col-span-5 text-sm" placeholder="/shop or https://..." value={item.link} onChange={(e) => updateItem(i, 'link', e.target.value)} />
                  <input type="number" className="input-field col-span-2 text-sm" placeholder="Order" value={item.sortOrder ?? i} onChange={(e) => updateItem(i, 'sortOrder', Number(e.target.value))} />
                  <label className="col-span-1 flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={item.isActive !== false} onChange={(e) => updateItem(i, 'isActive', e.target.checked)} />
                    On
                  </label>
                  <button onClick={() => removeItem(i)} className="col-span-1 text-red-500 text-xs">Del</button>
                </div>
              ))}
            </>
          ) : (
            <div className="card text-center text-gray-400 py-12">Select a menu to edit</div>
          )}
        </div>
      </div>
    </div>
  );
}
