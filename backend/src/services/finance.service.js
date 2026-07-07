import {
  Order,
  Product,
  Vendor,
  SupplierPurchase,
  OverheadExpense,
  TreasuryAccount,
  TreasuryTransaction,
} from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import * as inventoryService from './inventory.service.js';

const parseDateRange = (startDate, endDate) => {
  const range = {};
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    range.$gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return Object.keys(range).length ? range : null;
};

const nextPurchaseNumber = async () => {
  const count = await SupplierPurchase.countDocuments();
  const seq = String(count + 1).padStart(5, '0');
  return `PO-${seq}`;
};

const PURCHASE_TYPE_VAT = {
  vat_13: 0.13,
  non_vat: 0,
  zero_rated: 0,
  pan_bill: 0,
  normal_bill: 0,
};

const normalizePurchaseItems = (items = []) =>
  items.map((item) => {
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost) || 0;
    return {
      product: item.product || undefined,
      name: String(item.name || '').trim(),
      sku: item.sku?.trim() || undefined,
      quantity: qty,
      unitCost,
      lineTotal: qty * unitCost,
    };
  }).filter((item) => item.name && item.quantity > 0);

const sumPurchaseTotals = (items, { tax, shipping, purchaseType, vatRate } = {}) => {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const rate = vatRate ?? PURCHASE_TYPE_VAT[purchaseType] ?? 0;
  const computedTax =
    tax !== undefined && tax !== null && tax !== ''
      ? Number(tax) || 0
      : Math.round(subtotal * rate * 100) / 100;
  const total = subtotal + computedTax + Number(shipping || 0);
  return { subtotal, tax: computedTax, vatRate: rate, total };
};

const recordTreasuryMovement = async ({
  accountId,
  type,
  amount,
  description,
  reference,
  relatedModel,
  relatedId,
  transactionDate,
  userId,
}) => {
  const account = await TreasuryAccount.findById(accountId);
  if (!account) throw new ApiError(404, 'Treasury account not found');
  if (!account.isActive) throw new ApiError(400, 'Treasury account is inactive');

  const value = Number(amount) || 0;
  if (value <= 0) throw new ApiError(400, 'Amount must be greater than zero');

  const isInflow = type === 'deposit' || type === 'transfer_in' || type === 'adjustment_in';
  const isOutflow = type === 'withdrawal' || type === 'transfer_out' || type === 'adjustment_out';

  if (isOutflow && account.currentBalance < value) {
    throw new ApiError(400, 'Insufficient treasury balance');
  }

  const balanceAfter = isInflow
    ? account.currentBalance + value
    : account.currentBalance - value;

  account.currentBalance = balanceAfter;
  await account.save();

  const tx = await TreasuryTransaction.create({
    account: accountId,
    type,
    amount: value,
    description,
    reference,
    relatedModel: relatedModel || 'Manual',
    relatedId,
    balanceAfter,
    transactionDate: transactionDate || new Date(),
    performedBy: userId,
  });

  return { account, transaction: tx };
};

const applyPurchaseStock = async (items, purchaseNumber, userId) => {
  for (const item of items) {
    if (!item.product) continue;
    await inventoryService.adjustStock({
      productId: item.product,
      type: 'in',
      quantity: item.quantity,
      reason: 'Supplier wholesale purchase',
      reference: purchaseNumber,
      userId,
    });

    const product = await Product.findById(item.product);
    if (product && item.unitCost > 0) {
      product.costPrice = item.unitCost;
      await product.save({ validateBeforeSave: false });
    }
  }
};

// ——— Vendors ———

export const listVendors = async ({ page = 1, limit = 50, search = '', status } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (search?.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { companyName: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
    ];
  }

  const skip = (page - 1) * limit;
  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Vendor.countDocuments(filter),
  ]);

  return { vendors, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

export const getVendorById = async (id) => {
  const vendor = await Vendor.findById(id);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  return vendor;
};

export const createVendor = async (data, userId) => {
  return Vendor.create({ ...data, createdBy: userId });
};

export const updateVendor = async (id, data) => {
  const vendor = await Vendor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  return vendor;
};

export const deleteVendor = async (id) => {
  const inUse = await SupplierPurchase.exists({ vendor: id });
  if (inUse) throw new ApiError(400, 'Vendor has purchase records and cannot be deleted');
  const vendor = await Vendor.findByIdAndDelete(id);
  if (!vendor) throw new ApiError(404, 'Vendor not found');
};

// ——— Supplier purchases ———

export const listPurchases = async ({ page = 1, limit = 20, vendorId, startDate, endDate, paymentStatus } = {}) => {
  const filter = {};
  if (vendorId) filter.vendor = vendorId;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  const dateRange = parseDateRange(startDate, endDate);
  if (dateRange) filter.purchaseDate = dateRange;

  const skip = (page - 1) * limit;
  const [purchases, total] = await Promise.all([
    SupplierPurchase.find(filter)
      .populate('vendor', 'name companyName')
      .populate('treasuryAccount', 'name type')
      .populate('items.product', 'name sku')
      .sort({ purchaseDate: -1 })
      .skip(skip)
      .limit(limit),
    SupplierPurchase.countDocuments(filter),
  ]);

  return { purchases, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

export const getPurchaseById = async (id) => {
  const purchase = await SupplierPurchase.findById(id)
    .populate('vendor')
    .populate('treasuryAccount')
    .populate('items.product', 'name sku stock costPrice');
  if (!purchase) throw new ApiError(404, 'Purchase not found');
  return purchase;
};

export const createPurchase = async (data, userId) => {
  const items = normalizePurchaseItems(data.items);
  if (!items.length) throw new ApiError(400, 'At least one purchase line item is required');

  const { subtotal, tax, vatRate, total } = sumPurchaseTotals(items, data);
  const treasuryAccount = data.treasuryAccount || undefined;
  let paidAmount = Number(data.paidAmount);
  if (!Number.isFinite(paidAmount) && treasuryAccount) paidAmount = total;
  if (!Number.isFinite(paidAmount)) paidAmount = 0;

  let paymentStatus = data.paymentStatus || 'pending';
  if (paidAmount >= total && total > 0) paymentStatus = 'paid';
  else if (paidAmount > 0) paymentStatus = 'partial';

  const purchase = await SupplierPurchase.create({
    purchaseNumber: await nextPurchaseNumber(),
    vendor: data.vendor,
    purchaseDate: data.purchaseDate || new Date(),
    items,
    subtotal,
    purchaseType: data.purchaseType || 'vat_13',
    vatRate,
    tax,
    shipping: Number(data.shipping) || 0,
    total,
    paymentStatus,
    paidAmount,
    treasuryAccount,
    invoiceRef: data.invoiceRef,
    notes: data.notes,
    stockReceived: data.stockReceived !== false,
    createdBy: userId,
  });

  if (purchase.stockReceived) {
    await applyPurchaseStock(items, purchase.purchaseNumber, userId);
  }

  if (treasuryAccount && paidAmount > 0) {
    await recordTreasuryMovement({
      accountId: treasuryAccount,
      type: 'withdrawal',
      amount: paidAmount,
      description: `Supplier purchase ${purchase.purchaseNumber}`,
      reference: purchase.invoiceRef || purchase.purchaseNumber,
      relatedModel: 'SupplierPurchase',
      relatedId: purchase._id,
      transactionDate: purchase.purchaseDate,
      userId,
    });
  }

  return getPurchaseById(purchase._id);
};

export const deletePurchase = async (id) => {
  const purchase = await SupplierPurchase.findByIdAndDelete(id);
  if (!purchase) throw new ApiError(404, 'Purchase not found');
};

export const getPurchaseReport = async ({ startDate, endDate, vendorId } = {}) => {
  const filter = {};
  if (vendorId) filter.vendor = vendorId;
  const dateRange = parseDateRange(startDate, endDate);
  if (dateRange) filter.purchaseDate = dateRange;

  const purchases = await SupplierPurchase.find(filter)
    .populate('vendor', 'name companyName')
    .populate('treasuryAccount', 'name type')
    .sort({ purchaseDate: -1 });

  const summary = purchases.reduce(
    (acc, p) => {
      const items = p.items || [];
      const units = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      acc.billCount += 1;
      acc.productLines += items.length;
      acc.totalUnits += units;
      acc.subtotal += p.subtotal || 0;
      acc.vatTotal += p.tax || 0;
      acc.grandTotal += p.total || 0;
      acc.paidTotal += p.paidAmount || 0;
      const type = p.purchaseType || 'vat_13';
      acc.byType[type] = (acc.byType[type] || 0) + 1;
      return acc;
    },
    {
      billCount: 0,
      productLines: 0,
      totalUnits: 0,
      subtotal: 0,
      vatTotal: 0,
      grandTotal: 0,
      paidTotal: 0,
      byType: {},
    }
  );

  return {
    period: { startDate: startDate || null, endDate: endDate || null },
    summary,
    purchases,
  };
};

// ——— Overhead expenses ———

export const listExpenses = async ({ page = 1, limit = 20, category, startDate, endDate, paymentStatus } = {}) => {
  const filter = {};
  if (category) filter.category = category;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  const dateRange = parseDateRange(startDate, endDate);
  if (dateRange) filter.expenseDate = dateRange;

  const skip = (page - 1) * limit;
  const [expenses, total] = await Promise.all([
    OverheadExpense.find(filter)
      .populate('vendor', 'name companyName')
      .populate('treasuryAccount', 'name type')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(limit),
    OverheadExpense.countDocuments(filter),
  ]);

  return { expenses, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

export const createExpense = async (data, userId) => {
  const expense = await OverheadExpense.create({
    ...data,
    amount: Number(data.amount) || 0,
    createdBy: userId,
  });

  if (data.treasuryAccount && data.paymentStatus === 'paid' && expense.amount > 0) {
    await recordTreasuryMovement({
      accountId: data.treasuryAccount,
      type: 'withdrawal',
      amount: expense.amount,
      description: `Overhead: ${expense.title}`,
      reference: expense.reference,
      relatedModel: 'OverheadExpense',
      relatedId: expense._id,
      transactionDate: expense.expenseDate,
      userId,
    });
  }

  return OverheadExpense.findById(expense._id).populate('vendor', 'name').populate('treasuryAccount', 'name');
};

export const updateExpense = async (id, data) => {
  const expense = await OverheadExpense.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('vendor', 'name')
    .populate('treasuryAccount', 'name');
  if (!expense) throw new ApiError(404, 'Expense not found');
  return expense;
};

export const deleteExpense = async (id) => {
  const expense = await OverheadExpense.findByIdAndDelete(id);
  if (!expense) throw new ApiError(404, 'Expense not found');
};

// ——— Treasury ———

export const listTreasuryAccounts = async () => {
  const accounts = await TreasuryAccount.find().sort({ name: 1 });
  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
  return { accounts, totalBalance };
};

export const createTreasuryAccount = async (data, userId) => {
  const opening = Number(data.openingBalance) || 0;
  return TreasuryAccount.create({
    ...data,
    openingBalance: opening,
    currentBalance: opening,
    createdBy: userId,
  });
};

export const updateTreasuryAccount = async (id, data) => {
  const account = await TreasuryAccount.findById(id);
  if (!account) throw new ApiError(404, 'Treasury account not found');

  const fields = ['name', 'type', 'bankName', 'accountNumber', 'currency', 'isActive', 'notes'];
  fields.forEach((key) => {
    if (data[key] !== undefined) account[key] = data[key];
  });

  if (data.openingBalance !== undefined && account.currentBalance === account.openingBalance) {
    const opening = Number(data.openingBalance) || 0;
    account.openingBalance = opening;
    account.currentBalance = opening;
  }

  await account.save();
  return account;
};

export const listTreasuryTransactions = async ({
  accountId,
  page = 1,
  limit = 30,
  startDate,
  endDate,
} = {}) => {
  const filter = {};
  if (accountId) filter.account = accountId;
  const dateRange = parseDateRange(startDate, endDate);
  if (dateRange) filter.transactionDate = dateRange;

  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    TreasuryTransaction.find(filter)
      .populate('account', 'name type')
      .populate('performedBy', 'name email')
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit),
    TreasuryTransaction.countDocuments(filter),
  ]);

  const summary = await TreasuryTransaction.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const inflow = summary
    .filter((s) => s._id === 'deposit' || s._id === 'transfer_in' || s._id === 'adjustment_in')
    .reduce((sum, s) => sum + s.total, 0);
  const outflow = summary
    .filter((s) => s._id === 'withdrawal' || s._id === 'transfer_out' || s._id === 'adjustment_out')
    .reduce((sum, s) => sum + s.total, 0);

  return {
    transactions,
    summary: { inflow, outflow, net: inflow - outflow },
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const createTreasuryTransaction = async (data, userId) => {
  return recordTreasuryMovement({ ...data, userId });
};

export const adjustTreasuryBalance = async (
  accountId,
  { mode, amount, newBalance, reason, transactionDate },
  userId
) => {
  const account = await TreasuryAccount.findById(accountId);
  if (!account) throw new ApiError(404, 'Treasury account not found');
  if (!account.isActive) throw new ApiError(400, 'Treasury account is inactive');

  const previous = Number(account.currentBalance) || 0;
  let delta = 0;

  if (mode === 'set') {
    const target = Number(newBalance);
    if (!Number.isFinite(target) || target < 0) {
      throw new ApiError(400, 'New balance must be zero or greater');
    }
    delta = target - previous;
    if (delta === 0) throw new ApiError(400, 'New balance is the same as the current balance');
  } else if (mode === 'increase') {
    delta = Number(amount);
    if (!Number.isFinite(delta) || delta <= 0) {
      throw new ApiError(400, 'Increase amount must be greater than zero');
    }
  } else if (mode === 'decrease') {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      throw new ApiError(400, 'Decrease amount must be greater than zero');
    }
    delta = -value;
  } else {
    throw new ApiError(400, 'Invalid adjustment mode');
  }

  const absAmount = Math.abs(delta);
  const balanceAfter = previous + delta;
  if (balanceAfter < 0) throw new ApiError(400, 'Adjustment would make balance negative');

  account.currentBalance = balanceAfter;
  await account.save();

  const type = delta > 0 ? 'adjustment_in' : 'adjustment_out';
  const transaction = await TreasuryTransaction.create({
    account: accountId,
    type,
    amount: absAmount,
    description: reason?.trim() || 'Balance adjustment',
    reference: `ADJ-${Date.now()}`,
    relatedModel: 'Manual',
    balanceAfter,
    transactionDate: transactionDate || new Date(),
    performedBy: userId,
  });

  return {
    account,
    transaction,
    previousBalance: previous,
    newBalance: balanceAfter,
  };
};

// ——— Stock report ———

export const getStockReport = async ({ search, lowStockOnly } = {}) => {
  const filter = { isActive: true };
  if (search?.trim()) {
    const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(q, 'i') }, { sku: new RegExp(q, 'i') }];
  }

  let products = await Product.find(filter)
    .populate('category', 'name')
    .select('name sku stock costPrice price lowStockThreshold isHamper category')
    .sort({ name: 1 });

  if (lowStockOnly === 'true' || lowStockOnly === true) {
    products = products.filter(
      (p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 5)
    );
  }

  const rows = products.map((p) => {
    const stock = Number(p.stock) || 0;
    const costPrice = Number(p.costPrice) || 0;
    const retailPrice = Number(p.price) || 0;
    return {
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name,
      stock,
      costPrice,
      retailPrice,
      costValue: stock * costPrice,
      retailValue: stock * retailPrice,
      isLowStock: stock <= (p.lowStockThreshold ?? 5),
      isHamper: p.isHamper,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      totalUnits: acc.totalUnits + row.stock,
      totalCostValue: acc.totalCostValue + row.costValue,
      totalRetailValue: acc.totalRetailValue + row.retailValue,
      skuCount: acc.skuCount + 1,
      lowStockCount: acc.lowStockCount + (row.isLowStock ? 1 : 0),
    }),
    { totalUnits: 0, totalCostValue: 0, totalRetailValue: 0, skuCount: 0, lowStockCount: 0 }
  );

  return { rows, totals };
};

// ——— Profit & Loss ———

export const getProfitAndLoss = async ({ startDate, endDate } = {}) => {
  const orderFilter = { 'payment.status': 'paid' };
  const dateRange = parseDateRange(startDate, endDate);
  if (dateRange) orderFilter.createdAt = dateRange;

  const expenseFilter = { paymentStatus: { $in: ['paid', 'pending'] } };
  if (dateRange) expenseFilter.expenseDate = dateRange;

  const purchaseFilter = {};
  if (dateRange) purchaseFilter.purchaseDate = dateRange;

  const [revenueAgg, orders, expenses, purchases, cogsRows] = await Promise.all([
    Order.aggregate([
      { $match: orderFilter },
      { $group: { _id: null, revenue: { $sum: '$total' }, orderCount: { $sum: 1 } } },
    ]),
    Order.find(orderFilter).select('total subtotal shippingFee discount createdAt orderNumber'),
    OverheadExpense.find(expenseFilter),
    SupplierPurchase.find(purchaseFilter),
    Order.aggregate([
      { $match: orderFilter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          cogs: {
            $sum: {
              $multiply: [
                '$items.quantity',
                { $ifNull: ['$productDoc.costPrice', 0] },
              ],
            },
          },
          unitsSold: { $sum: '$items.quantity' },
        },
      },
    ]),
  ]);

  const revenue = revenueAgg[0]?.revenue || 0;
  const orderCount = revenueAgg[0]?.orderCount || 0;
  const cogs = cogsRows[0]?.cogs || 0;
  const unitsSold = cogsRows[0]?.unitsSold || 0;

  const operatingExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const wholesalePurchases = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - operatingExpenses;

  const expensesByCategory = expenses.reduce((acc, e) => {
    const key = e.category || 'other';
    acc[key] = (acc[key] || 0) + (e.amount || 0);
    return acc;
  }, {});

  return {
    period: { startDate: startDate || null, endDate: endDate || null },
    revenue,
    orderCount,
    unitsSold,
    costOfGoodsSold: cogs,
    grossProfit,
    operatingExpenses,
    expensesByCategory,
    wholesalePurchases,
    netProfit,
    grossMarginPct: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0',
    netMarginPct: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0',
    recentOrders: orders.slice(0, 10),
  };
};
