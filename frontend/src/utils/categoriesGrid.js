export const CATEGORY_SORT_OPTIONS = [
  { value: 'custom', label: 'Custom hierarchy order' },
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: 'newest', label: 'Newest first' },
];

export const defaultCategoriesGridSettings = () => ({
  sortBy: 'custom',
  limit: 20,
  hideEmpty: false,
  categoryIds: [],
  cols: 4,
});

export function applyCategoriesGridRules(categories, settings = {}) {
  const sortBy = settings.sortBy || 'custom';
  const limit = Math.max(1, Number(settings.limit) || 20);
  const hideEmpty = settings.hideEmpty === true;
  const selectedIds = (settings.categoryIds || []).map(String);
  const cols = settings.cols || 4;

  let list = [...(categories || [])];

  if (selectedIds.length) {
    const order = new Map(selectedIds.map((id, idx) => [id, idx]));
    list = list.filter((c) => order.has(String(c._id)));
    if (sortBy === 'custom') {
      list.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    }
  }

  if (hideEmpty) {
    list = list.filter((c) => (c.productCount ?? 0) > 0);
  }

  if (!selectedIds.length || sortBy !== 'custom') {
    switch (sortBy) {
      case 'name_desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'custom':
      default:
        list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
        break;
    }
  }

  return { items: list.slice(0, limit), cols };
}
