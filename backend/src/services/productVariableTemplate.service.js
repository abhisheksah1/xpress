import { ProductVariableTemplate } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .map((opt) => ({
      label: String(opt.label || '').trim(),
      priceAdjustment: Number(opt.priceAdjustment) || 0,
    }))
    .filter((opt) => opt.label);

export const listTemplates = async ({ includeInactive = false } = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  return ProductVariableTemplate.find(filter).sort({ sortOrder: 1, name: 1 });
};

export const getTemplateById = async (id) => {
  const template = await ProductVariableTemplate.findById(id);
  if (!template) throw new ApiError(404, 'Variable preset not found');
  return template;
};

export const createTemplate = async (data, userId) => {
  const name = String(data.name || '').trim();
  if (!name) throw new ApiError(400, 'Variable name is required');

  const options = normalizeOptions(data.options);
  if (!options.length) throw new ApiError(400, 'Add at least one option (e.g. 1 pound, 2 pound)');

  const existing = await ProductVariableTemplate.findOne({
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
  });
  if (existing) throw new ApiError(400, `Variable preset "${name}" already exists`);

  return ProductVariableTemplate.create({
    name,
    tracksInventory: data.tracksInventory !== false,
    options,
    isActive: data.isActive !== false,
    sortOrder: Number(data.sortOrder) || 0,
    createdBy: userId,
  });
};

export const updateTemplate = async (id, data) => {
  const template = await ProductVariableTemplate.findById(id);
  if (!template) throw new ApiError(404, 'Variable preset not found');

  if (data.name != null) {
    const name = String(data.name).trim();
    if (!name) throw new ApiError(400, 'Variable name is required');
    const clash = await ProductVariableTemplate.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (clash) throw new ApiError(400, `Variable preset "${name}" already exists`);
    template.name = name;
  }

  if (data.options != null) {
    const options = normalizeOptions(data.options);
    if (!options.length) throw new ApiError(400, 'Add at least one option');
    template.options = options;
  }

  if (data.tracksInventory != null) template.tracksInventory = Boolean(data.tracksInventory);
  if (data.isActive != null) template.isActive = Boolean(data.isActive);
  if (data.sortOrder != null) template.sortOrder = Number(data.sortOrder) || 0;

  await template.save();
  return template;
};

export const deleteTemplate = async (id) => {
  const template = await ProductVariableTemplate.findByIdAndDelete(id);
  if (!template) throw new ApiError(404, 'Variable preset not found');
  return template;
};

/** Shape applied onto a product.optionCategories entry (stock starts at 0). */
export const templateToProductCategory = (template) => ({
  name: template.name,
  tracksInventory: Boolean(template.tracksInventory),
  options: (template.options || []).map((opt) => ({
    label: opt.label,
    priceAdjustment: Number(opt.priceAdjustment) || 0,
    stock: 0,
  })),
});
