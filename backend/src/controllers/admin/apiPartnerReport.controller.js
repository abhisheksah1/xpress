import * as reportService from '../../services/apiPartnerReport.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export const getExplorerReport = asyncHandler(async (req, res) => {
  const { partnerId, startDate, endDate } = req.query;
  const data = await reportService.getPartnerTransactionalReport({ partnerId, startDate, endDate });
  res.json(new ApiResponse(200, data));
});

export const exportReportCsv = asyncHandler(async (req, res) => {
  const { partnerId, startDate, endDate } = req.query;
  const csv = await reportService.getPartnerReportCsv({ partnerId, startDate, endDate });
  const filename = `partner-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
});
