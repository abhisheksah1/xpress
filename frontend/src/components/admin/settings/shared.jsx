import toast from 'react-hot-toast';

export function SectionCard({ title, description, children, onSave, saving }) {
  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children}
      {onSave && (
        <button onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      )}
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>
        <span className="text-sm font-medium block">{label}</span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </span>
    </label>
  );
}

export async function saveSection(keys, values, setSaving) {
  setSaving(true);
  try {
    const { adminApi } = await import('../../../api/admin.js');
    await adminApi.bulkUpdateSettings(keys.map((key) => ({ key, value: values[key] })));
    toast.success('Settings saved');
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save');
  } finally {
    setSaving(false);
  }
}
