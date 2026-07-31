import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

const emptyDraft = () => ({
  name: '',
  tracksInventory: true,
  optionsText: '1 pound\n2 pound',
});

function parseOptionsText(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ label, priceAdjustment: 0 }));
}

function optionsToText(options = []) {
  return (options || []).map((o) => o.label).join('\n');
}

export default function ProductVariablesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getProductVariableTemplates({ includeInactive: true })
      .then((res) => setTemplates(res.data.data || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetDraft = () => {
    setDraft(emptyDraft());
    setEditingId(null);
  };

  const startEdit = (tpl) => {
    setEditingId(tpl._id);
    setDraft({
      name: tpl.name,
      tracksInventory: Boolean(tpl.tracksInventory),
      optionsText: optionsToText(tpl.options),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = draft.name.trim();
    const options = parseOptionsText(draft.optionsText);
    if (!name) return toast.error('Enter a variable name (e.g. Cake Size)');
    if (!options.length) return toast.error('Add at least one option (one per line)');

    setSaving(true);
    try {
      const payload = {
        name,
        tracksInventory: draft.tracksInventory,
        options,
      };
      if (editingId) {
        await adminApi.updateProductVariableTemplate(editingId, payload);
        toast.success('Variable preset updated');
      } else {
        await adminApi.createProductVariableTemplate(payload);
        toast.success('Variable preset saved');
      }
      resetDraft();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save variable preset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`Delete variable preset "${tpl.name}"? Products already using it keep their options.`)) {
      return;
    }
    try {
      await adminApi.deleteProductVariableTemplate(tpl._id);
      toast.success('Variable preset deleted');
      if (editingId === tpl._id) resetDraft();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-5 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            {editingId ? 'Edit variable preset' : 'Save a reusable variable'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Define names once (Cake Size, Clothing Size) and reuse them on every similar product.
            Stock is set per product / purchase — not on the preset itself.
          </p>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
                Variable name *
              </label>
              <input
                className="input-field text-sm"
                placeholder="e.g. Cake Size"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.tracksInventory}
                  onChange={(e) => setDraft((d) => ({ ...d, tracksInventory: e.target.checked }))}
                />
                Track stock per option (recommended for size / weight)
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">
              Options (one per line) *
            </label>
            <textarea
              className="input-field text-sm min-h-[100px] font-mono"
              placeholder={'1 pound\n2 pound\n3 pound'}
              value={draft.optionsText}
              onChange={(e) => setDraft((d) => ({ ...d, optionsText: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : editingId ? 'Update preset' : 'Save preset'}
            </button>
            {editingId && (
              <button type="button" onClick={resetDraft} className="btn-secondary text-sm">
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Saved variables</h2>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-400">Loading...</p>
        ) : !templates.length ? (
          <p className="p-4 text-sm text-gray-500">
            No presets yet. Save &ldquo;Cake Size&rdquo; with 1 pound / 2 pound above, then apply it from the product form.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Options</th>
                <th className="px-4 py-2.5 font-semibold">Stock</th>
                <th className="px-4 py-2.5 font-semibold w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl._id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{tpl.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {(tpl.options || []).map((o) => o.label).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {tpl.tracksInventory ? 'Per option on product' : 'Price only'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(tpl)}
                        className="text-xs text-primary-600 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(tpl)}
                        className="text-xs text-red-600 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
