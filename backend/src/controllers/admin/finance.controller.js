import * as financeService from '../../services/finance.service.js';
import * as financeExportService from '../../services/financeExport.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { withBom } from '../../utils/csvExport.js';

const sendFinanceCsv = (res, prefix, csv) => {
  const filename = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(withBom(csv));
};

export const getProfitAndLoss = asyncHandler(async (req, res) => {
  const data = await financeService.getProfitAndLoss(req.query);
  res.json(new ApiResponse(200, data));
});

export const getStockReport = asyncHandler(async (req, res) => {
  const data = await financeService.getStockReport(req.query);
  res.json(new ApiResponse(200, data));
});

export const listVendors = asyncHandler(async (req, res) => {
  const data = await financeService.listVendors(req.query);
  res.json(new ApiResponse(200, data));
});

export const getVendor = asyncHandler(async (req, res) => {
  const data = await financeService.getVendorById(req.params.id);
  res.json(new ApiResponse(200, data));
});

export const createVendor = asyncHandler(async (req, res) => {
  const data = await financeService.createVendor(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, data, 'Vendor created'));
});

export const updateVendor = asyncHandler(async (req, res) => {
  const data = await financeService.updateVendor(req.params.id, req.body);
  res.json(new ApiResponse(200, data, 'Vendor updated'));
});

export const deleteVendor = asyncHandler(async (req, res) => {
  await financeService.deleteVendor(req.params.id);
  res.json(new ApiResponse(200, null, 'Vendor deleted'));
});

export const listPurchases = asyncHandler(async (req, res) => {
  const data = await financeService.listPurchases(req.query);
  res.json(new ApiResponse(200, data));
});

export const getPurchase = asyncHandler(async (req, res) => {
  const data = await financeService.getPurchaseById(req.params.id);
  res.json(new ApiResponse(200, data));
});

export const createPurchase = asyncHandler(async (req, res) => {
  const data = await financeService.createPurchase(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, data, 'Purchase recorded'));
});

export const deletePurchase = asyncHandler(async (req, res) => {
  await financeService.deletePurchase(req.params.id);
  res.json(new ApiResponse(200, null, 'Purchase deleted'));
});

export const getPurchaseReport = asyncHandler(async (req, res) => {
  const data = await financeService.getPurchaseReport(req.query);
  res.json(new ApiResponse(200, data));
});

export const getSalesLedger = asyncHandler(async (req, res) => {
  const data = await financeService.getSalesLedger(req.query);
  res.json(new ApiResponse(200, data));
});

export const listExpenses = asyncHandler(async (req, res) => {
  const data = await financeService.listExpenses(req.query);
  res.json(new ApiResponse(200, data));
});

export const createExpense = asyncHandler(async (req, res) => {
  const data = await financeService.createExpense(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, data, 'Expense recorded'));
});

export const updateExpense = asyncHandler(async (req, res) => {
  const data = await financeService.updateExpense(req.params.id, req.body);
  res.json(new ApiResponse(200, data, 'Expense updated'));
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await financeService.deleteExpense(req.params.id);
  res.json(new ApiResponse(200, null, 'Expense deleted'));
});

export const listTreasuryAccounts = asyncHandler(async (req, res) => {
  const data = await financeService.listTreasuryAccounts();
  res.json(new ApiResponse(200, data));
});

export const createTreasuryAccount = asyncHandler(async (req, res) => {
  const data = await financeService.createTreasuryAccount(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, data, 'Treasury account created'));
});

export const updateTreasuryAccount = asyncHandler(async (req, res) => {
  const data = await financeService.updateTreasuryAccount(req.params.id, req.body);
  res.json(new ApiResponse(200, data, 'Treasury account updated'));
});

export const listTreasuryTransactions = asyncHandler(async (req, res) => {
  const data = await financeService.listTreasuryTransactions(req.query);
  res.json(new ApiResponse(200, data));
});

export const createTreasuryTransaction = asyncHandler(async (req, res) => {
  const data = await financeService.createTreasuryTransaction(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, data, 'Transaction recorded'));
});

export const adjustTreasuryBalance = asyncHandler(async (req, res) => {
  const data = await financeService.adjustTreasuryBalance(req.params.id, req.body, req.user._id);
  res.json(new ApiResponse(200, data, 'Treasury balance adjusted'));
});

export const exportPnlCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildPnlCsv(req.query);
  sendFinanceCsv(res, 'profit-loss-report', csv);
});

export const exportPurchaseReportCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildPurchaseReportCsv(req.query);
  sendFinanceCsv(res, 'purchase-entry-report', csv);
});

export const exportSalesLedgerCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildSalesLedgerCsv(req.query);
  sendFinanceCsv(res, 'sales-ledger-report', csv);
});

export const exportExpensesCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildExpensesCsv(req.query);
  sendFinanceCsv(res, 'overhead-expenses-report', csv);
});

export const exportStockReportCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildStockReportCsv(req.query);
  sendFinanceCsv(res, 'stock-valuation-report', csv);
});

export const exportTreasuryReportCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildTreasuryReportCsv(req.query);
  sendFinanceCsv(res, 'treasury-report', csv);
});

export const exportVendorsCsv = asyncHandler(async (req, res) => {
  const csv = await financeExportService.buildVendorsCsv(req.query);
  sendFinanceCsv(res, 'vendor-registry', csv);
});
