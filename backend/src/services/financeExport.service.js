import * as financeService from './finance.service.js';
import { rowsToCsv } from '../utils/csvExport.js';

const PURCHASE_TYPE_LABELS = {
  vat_13: 'VAT Bill',
  pan_bill: 'Pan Bill',
  normal_bill: 'Normal Bill',
  non_vat: 'Pan Bill',
  zero_rated: 'Normal Bill',
};

const VENDOR_BILL_LABELS = {
  pan: 'Pan Bill',
  vat: 'VAT Bill',
  normal: 'Normal Bill',
};

const fmtDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const buildPnlCsv = async (params) => {
  const data = await financeService.getProfitAndLoss(params);
  const rows = [
    ['Profit & Loss Report'],
    ['Period Start', data.period.startDate || ''],
    ['Period End', data.period.endDate || ''],
    [],
    ['Metric', 'Amount (NPR)'],
    ['Revenue', data.revenue],
    ['Order Count', data.orderCount],
    ['Units Sold', data.unitsSold],
    ['Cost of Goods Sold', data.costOfGoodsSold],
    ['Gross Profit', data.grossProfit],
    ['Gross Margin %', data.grossMarginPct],
    ['Operating Expenses', data.operatingExpenses],
    ['Wholesale Purchases (inventory)', data.wholesalePurchases],
    ['Net Profit', data.netProfit],
    ['Net Margin %', data.netMarginPct],
    [],
    ['Expense Category', 'Amount (NPR)'],
    ...Object.entries(data.expensesByCategory || {}).map(([cat, amount]) => [cat, amount]),
  ];
  return rowsToCsv(rows);
};

export const buildPurchaseReportCsv = async (params) => {
  const data = await financeService.getPurchaseReport(params);
  const rows = [
    ['Purchase Entry Report'],
    ['Period Start', data.period.startDate || ''],
    ['Period End', data.period.endDate || ''],
    ['Bills Lodged', data.summary.billCount],
    ['Product Lines', data.summary.productLines],
    ['Total Units', data.summary.totalUnits],
    ['Subtotal (NPR)', data.summary.subtotal],
    ['VAT Total (NPR)', data.summary.vatTotal],
    ['Grand Total (NPR)', data.summary.grandTotal],
    [],
    [
      'PO Number',
      'Invoice',
      'Date',
      'Supplier',
      'Bill Type',
      'Items',
      'Subtotal (NPR)',
      'VAT (NPR)',
      'Total (NPR)',
      'Treasury Account',
      'Payment Status',
      'Paid Amount (NPR)',
    ],
    ...(data.purchases || []).map((p) => [
      p.purchaseNumber,
      p.invoiceRef || '',
      fmtDate(p.purchaseDate),
      p.vendor?.name || '',
      PURCHASE_TYPE_LABELS[p.purchaseType] || p.purchaseType,
      p.items?.length || 0,
      p.subtotal,
      p.tax,
      p.total,
      p.treasuryAccount?.name || '',
      p.paymentStatus,
      p.paidAmount,
    ]),
  ];
  return rowsToCsv(rows);
};

export const buildExpensesCsv = async (params) => {
  const { expenses } = await financeService.listExpenses({ ...params, limit: 10000 });
  const rows = [
    ['Operational Overhead Expenses'],
    ['Period Start', params.startDate || ''],
    ['Period End', params.endDate || ''],
    [],
    ['Date', 'Title', 'Category', 'Amount (NPR)', 'Payment Status', 'Vendor', 'Treasury', 'Reference', 'Notes'],
    ...expenses.map((e) => [
      fmtDate(e.expenseDate),
      e.title,
      e.category,
      e.amount,
      e.paymentStatus,
      e.vendor?.name || '',
      e.treasuryAccount?.name || '',
      e.reference || '',
      e.notes || '',
    ]),
  ];
  return rowsToCsv(rows);
};

export const buildStockReportCsv = async (params) => {
  const data = await financeService.getStockReport(params);
  const rows = [
    ['Stock Report & Valuation'],
    ['Generated', new Date().toISOString().slice(0, 10)],
    ['SKU Count', data.totals.skuCount],
    ['Total Units', data.totals.totalUnits],
    ['Total Cost Value (NPR)', data.totals.totalCostValue],
    ['Total Retail Value (NPR)', data.totals.totalRetailValue],
    ['Low Stock SKUs', data.totals.lowStockCount],
    [],
    [
      'Product',
      'SKU',
      'Category',
      'Stock',
      'Cost Price (NPR)',
      'Retail Price (NPR)',
      'Cost Value (NPR)',
      'Retail Value (NPR)',
      'Low Stock',
    ],
    ...data.rows.map((r) => [
      r.name,
      r.sku || '',
      r.category || '',
      r.stock,
      r.costPrice,
      r.retailPrice,
      r.costValue,
      r.retailValue,
      r.isLowStock ? 'Yes' : 'No',
    ]),
  ];
  return rowsToCsv(rows);
};

export const buildTreasuryReportCsv = async (params) => {
  const { accounts, totalBalance } = await financeService.listTreasuryAccounts();
  const { transactions, summary } = await financeService.listTreasuryTransactions({
    ...params,
    limit: 10000,
  });

  const rows = [
    ['Treasury Accounts & Transactions'],
    ['Period Start', params.startDate || ''],
    ['Period End', params.endDate || ''],
    ['Total Treasury Balance (NPR)', totalBalance],
    ['Inflows (NPR)', summary.inflow],
    ['Outflows (NPR)', summary.outflow],
    ['Net (NPR)', summary.net],
    [],
    ['Account Name', 'Type', 'Current Balance (NPR)', 'Currency', 'Active'],
    ...accounts.map((a) => [a.name, a.type, a.currentBalance, a.currency, a.isActive ? 'Yes' : 'No']),
    [],
    ['Date', 'Account', 'Type', 'Description', 'Reference', 'Amount (NPR)', 'Balance After (NPR)'],
    ...transactions.map((tx) => [
      fmtDate(tx.transactionDate),
      tx.account?.name || '',
      tx.type,
      tx.description || '',
      tx.reference || '',
      tx.amount,
      tx.balanceAfter,
    ]),
  ];
  return rowsToCsv(rows);
};

export const buildVendorsCsv = async (params) => {
  const { vendors } = await financeService.listVendors({ ...params, limit: 10000 });
  const rows = [
    ['Vendor Registry'],
    ['Exported', new Date().toISOString().slice(0, 10)],
    [],
    [
      'Vendor Name',
      'Company',
      'Bill Type',
      'PAN Number',
      'VAT Number',
      'Contact Person',
      'Phone',
      'Email',
      'Address',
      'Payment Terms',
      'Status',
      'Notes',
    ],
    ...vendors.map((v) => [
      v.name,
      v.companyName || '',
      VENDOR_BILL_LABELS[v.billType] || v.billType || '',
      v.panNumber || '',
      v.vatNumber || '',
      v.contactPerson || '',
      v.phone || '',
      v.email || '',
      v.address || '',
      v.paymentTerms || '',
      v.status,
      v.notes || '',
    ]),
  ];
  return rowsToCsv(rows);
};
