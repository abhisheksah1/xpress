import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { getInventoryTrackingCategories } from '../../utils/optionInventory.js';

export default function StockAdjustModal({ product, onClose, onSaved }) {
  const trackingCats = useMemo(() => getInventoryTrackingCategories(product), [product]);
  const tracksOptions = trackingCats.length > 0;

  const [categoryName, setCategoryName] = useState(trackingCats[0]?.name || '');
  const [optionLabel, setOptionLabel] = useState(trackingCats[0]?.options?.[0]?.label || '');
  const selectedOptionStock = useMemo(() => {
    if (!tracksOptions) return product.stock;
    const cat = trackingCats.find((c) => c.name === categoryName);
    const opt = (cat?.options || []).find((o) => o.label === optionLabel);
    return Number(opt?.stock) || 0;
  }, [tracksOptions, trackingCats, categoryName, optionLabel, product.stock]);

  const [quantity, setQuantity] = useState(selectedOptionStock);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCategoryChange = (name) => {
    setCategoryName(name);
    const cat = trackingCats.find((c) => c.name === name);
    const nextLabel = cat?.options?.[0]?.label || '';
    setOptionLabel(nextLabel);
    const opt = (cat?.options || []).find((o) => o.label === nextLabel);
    setQuantity(Number(opt?.stock) || 0);
  };

  const handleOptionChange = (label) => {
    setOptionLabel(label);
    const cat = trackingCats.find((c) => c.name === categoryName);
    const opt = (cat?.options || []).find((o) => o.label === label);
    setQuantity(Number(opt?.stock) || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        productId: product._id,
        type: 'adjustment',
        quantity: Number(quantity),
        reason: reason || 'Manual adjustment',
      };
      if (tracksOptions) {
        if (!categoryName || !optionLabel) {
          toast.error('Select a variation to adjust');
          setSaving(false);
          return;
        }
        payload.selectedOptions = [{ category: categoryName, label: optionLabel }];
      }
      await adminApi.adjustStock(payload);
      toast.success('Stock updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Adjust Stock</h2>
          <p className="text-sm text-gray-500 mt-1">{product.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tracksOptions && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Variation category</label>
                <select
                  className="input-field"
                  value={categoryName}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {trackingCats.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Option</label>
                <select
                  className="input-field"
                  value={optionLabel}
                  onChange={(e) => handleOptionChange(e.target.value)}
                >
                  {(trackingCats.find((c) => c.name === categoryName)?.options || []).map((opt) => (
                    <option key={opt.label} value={opt.label}>
                      {opt.label} (stock {opt.stock ?? 0})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Current stock</label>
            <p className="text-2xl font-bold text-gray-800">{selectedOptionStock} units</p>
            {tracksOptions && (
              <p className="text-xs text-gray-500 mt-1">
                Product total across variations: {product.stock ?? 0}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New stock level</label>
            <input
              type="number"
              min="0"
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason (optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Restocked from supplier"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
