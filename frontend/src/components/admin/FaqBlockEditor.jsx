export default function FaqBlockEditor({
  title = '',
  subtitle = '',
  settings = {},
  onTitleChange,
  onSubtitleChange,
  onSettingChange,
}) {
  const items = settings.items || [];

  const updateItems = (next) => onSettingChange('items', next);

  const addItem = () => updateItems([...items, { q: '', a: '' }]);

  const updateItem = (index, patch) => {
    updateItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
          FAQ
        </span>
        <span className="font-semibold text-gray-800">FAQ Guidance Accordion</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Primary Heading Text</label>
          <input
            className="input-field"
            placeholder="FAQ Guidance Accordion"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Secondary Subtitle / Message</label>
          <input
            className="input-field"
            placeholder="Optional subtitle for visitors"
            value={subtitle}
            onChange={(e) => onSubtitleChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-gray-400 mb-2">FAQ Inquiries List</p>
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
              No questions yet. Add your first FAQ item below.
            </p>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 space-y-3 shadow-sm"
              >
                <div>
                  <label className="sr-only">Question</label>
                  <input
                    className="input-field"
                    placeholder="What is sample question?"
                    value={item.q || ''}
                    onChange={(e) => updateItem(index, { q: e.target.value })}
                  />
                </div>
                <div>
                  <label className="sr-only">Answer</label>
                  <textarea
                    className="input-field"
                    rows={2}
                    placeholder="This is beautiful visual builder answer."
                    value={item.a || ''}
                    onChange={(e) => updateItem(index, { a: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-xs text-red-500 hover:underline font-medium"
                >
                  Delete FAQ
                </button>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 text-sm font-semibold text-primary-600 hover:underline"
        >
          + Add Question Item
        </button>
      </div>
    </div>
  );
}
