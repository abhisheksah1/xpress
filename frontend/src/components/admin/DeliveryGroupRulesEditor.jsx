import { useEffect, useState } from 'react';

const emptyGroup = () => ({
  name: '',
  description: '',
  province: '',
  deliveryFee: 100,
  freeShippingThreshold: 0,
  sameDayAvailable: false,
  isActive: true,
  sortOrder: 0,
  estimatedDays: { min: 1, max: 3 },
  locations: [],
});

const emptyLocation = () => ({ name: '', district: '', deliveryFee: '', isActive: true });

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="font-medium block">{label}</span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </span>
    </label>
  );
}

function isGroupSameDayCapable(group) {
  return group?.estimatedDays?.min === 0 || group?.estimatedHours != null;
}

function formatGroupDefaultLabel(group) {
  const min = group?.estimatedDays?.min ?? 0;
  const max = group?.estimatedDays?.max ?? 1;
  const sameDayHint = isGroupSameDayCapable(group) ? ' · same-day OK' : '';
  return `${min}–${max} days${sameDayHint}`;
}

export default function DeliveryGroupRulesEditor({ groups, scope, onScopeChange, rules, onRulesChange }) {
  const getRule = (groupId) =>
    rules.find((r) => String(r.group) === String(groupId)) || {
      group: String(groupId),
      available: false,
      sameDay: false,
      estimatedDays: { min: '', max: '' },
    };

  const updateRule = (groupId, patch) => {
    const existing = getRule(groupId);
    const next = rules.filter((r) => String(r.group) !== String(groupId));
    onRulesChange([...next, { ...existing, group: String(groupId), ...patch }]);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Delivery Scope</label>
        <select className="input-field" value={scope} onChange={(e) => onScopeChange(e.target.value)}>
          <option value="inherit">Inherit from category (default)</option>
          <option value="all">Deliver to all groups</option>
          <option value="selected">Only selected groups below</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Use &quot;Selected groups&quot; for products that only ship to specific areas (e.g. fresh cakes in Kathmandu Valley only).
        </p>
      </div>

      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Group</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Available</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Same-day</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Min days</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Max days</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-500">Group default</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groups.map((group) => {
              const rule = getRule(group._id);
              const sameDayCapable = isGroupSameDayCapable(group);
              return (
                <tr key={group._id}>
                  <td className="px-3 py-2">
                    <span className="font-medium block">{group.name}</span>
                    {group.code && <span className="text-xs text-gray-400">{group.code}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {scope === 'selected' ? (
                      <input
                        type="checkbox"
                        checked={!!rule.available}
                        onChange={(e) => updateRule(group._id, { available: e.target.checked })}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">
                        {scope === 'all' ? 'All groups' : 'From category'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!rule.sameDay}
                      onChange={(e) => updateRule(group._id, { sameDay: e.target.checked })}
                      title={
                        sameDayCapable
                          ? 'Enable same-day for this product in this group'
                          : 'Enable same-day for this product (even if the group default is not same-day)'
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      className="input-field w-20 py-1 text-sm"
                      placeholder={String(group.estimatedDays?.min ?? '')}
                      value={rule.estimatedDays?.min ?? ''}
                      onChange={(e) =>
                        updateRule(group._id, {
                          estimatedDays: {
                            ...rule.estimatedDays,
                            min: e.target.value === '' ? '' : Number(e.target.value),
                          },
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      className="input-field w-20 py-1 text-sm"
                      placeholder={String(group.estimatedDays?.max ?? '')}
                      value={rule.estimatedDays?.max ?? ''}
                      onChange={(e) =>
                        updateRule(group._id, {
                          estimatedDays: {
                            ...rule.estimatedDays,
                            max: e.target.value === '' ? '' : Number(e.target.value),
                          },
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">
                    {formatGroupDefaultLabel(group)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CategoryDeliveryRulesEditor({ groups, category, onSave }) {
  const [scope, setScope] = useState(category.deliveryScope || 'all');
  const [rules, setRules] = useState([]);
  const [saving, setSaving] = useState(false);

  const getRule = (groupId) =>
    rules.find((r) => String(r.group) === String(groupId)) || {
      group: groupId,
      available: false,
      sameDay: false,
      estimatedDays: { min: '', max: '' },
    };

  const updateRule = (groupId, patch) => {
    const existing = getRule(groupId);
    const next = rules.filter((r) => String(r.group) !== String(groupId));
    setRules([...next, { ...existing, group: groupId, ...patch }]);
  };

  useEffect(() => {
    setScope(category.deliveryScope || 'all');
    setRules(
      (category.deliveryGroupRules || []).map((r) => ({
        ...r,
        group: r.group?._id || r.group,
        estimatedDays: r.estimatedDays || { min: '', max: '' },
      }))
    );
  }, [category]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        deliveryScope: scope,
        deliveryGroupRules: rules
          .filter((r) => (scope === 'selected' ? r.available : r.sameDay || r.estimatedDays?.min != null || r.estimatedDays?.max != null))
          .map((r) => ({
            group: r.group,
            available: scope === 'selected' ? !!r.available : true,
            sameDay: !!r.sameDay,
            estimatedDays: {
              min: r.estimatedDays?.min === '' || r.estimatedDays?.min == null ? undefined : Number(r.estimatedDays.min),
              max: r.estimatedDays?.max === '' || r.estimatedDays?.max == null ? undefined : Number(r.estimatedDays.max),
            },
          })),
      };
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Category Delivery Scope</label>
        <select className="input-field" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">All delivery groups (products inherit unless overridden)</option>
          <option value="selected">Only selected groups below</option>
        </select>
      </div>
      <div className="overflow-x-auto border border-gray-100 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Group</th>
              {scope === 'selected' && <th className="text-left px-3 py-2">Available</th>}
              <th className="text-left px-3 py-2">Same-day</th>
              <th className="text-left px-3 py-2">Min days</th>
              <th className="text-left px-3 py-2">Max days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groups.map((group) => {
              const rule = getRule(group._id);
              return (
                <tr key={group._id}>
                  <td className="px-3 py-2 font-medium">{group.name}</td>
                  {scope === 'selected' && (
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={!!rule.available} onChange={(e) => updateRule(group._id, { available: e.target.checked })} />
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!rule.sameDay}
                      onChange={(e) => updateRule(group._id, { sameDay: e.target.checked })}
                      title={
                        isGroupSameDayCapable(group)
                          ? 'Enable same-day for this category in this group'
                          : 'Enable same-day for this category (even if the group default is not same-day)'
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" className="input-field w-20 py-1 text-sm" value={rule.estimatedDays?.min ?? ''} onChange={(e) => updateRule(group._id, { estimatedDays: { ...rule.estimatedDays, min: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" min="0" className="input-field w-20 py-1 text-sm" value={rule.estimatedDays?.max ?? ''} onChange={(e) => updateRule(group._id, { estimatedDays: { ...rule.estimatedDays, max: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-sm">
        {saving ? 'Saving...' : 'Save Category Delivery Rules'}
      </button>
    </div>
  );
}

export { Toggle, emptyGroup, emptyLocation };
