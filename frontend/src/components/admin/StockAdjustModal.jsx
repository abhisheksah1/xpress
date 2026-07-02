import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';

export default function StockAdjustModal({ product, onClose, onSaved }) {
  const [quantity, setQuantity] = useState(product.stock);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.adjustStock({
        productId: product._id,
        type: 'adjustment',
        quantity: Number(quantity),
        reason: reason || 'Manual adjustment',
      });
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
          <div>
            <label className="block text-sm font-medium mb-1">Current stock</label>
            <p className="text-2xl font-bold text-gray-800">{product.stock} units</p>
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
