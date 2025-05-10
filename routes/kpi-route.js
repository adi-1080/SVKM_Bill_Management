import express from 'express';
import {
  getTotalAmountByRegion,
  getTotalAmountByDate,
  getTotalAmountInDateRange,
  getAmountByRegionInDateRange,
  natureOfWork,
  compliance,
  getMonthlyBill,
  natureOfWorkDateRange,
  complianceDateRange,
} from '../controllers/kpi-controller.js';

const router = express.Router();

// Total amount grouped by region
router.get('/total-amount-by-region', getTotalAmountByRegion);

// Total amount by region within a date range ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/total-amount-by-region-in-date-range', getAmountByRegionInDateRange);

// Total amount grouped by individual dates
router.get('/total-amount-by-date', getTotalAmountByDate);

// Total amount for all bills between date range ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/total-amount-in-date-range', getTotalAmountInDateRange);

// Total by nature of work
router.get("/nature-of-work", natureOfWork);
// Total by nature of work (date range)
router.get("/nature-of-work-date-range", natureOfWorkDateRange);

// Total by compliance
router.get("/compliance", compliance);
// Total by compliance
router.get("/compliance-date-range", complianceDateRange);

// Total amount & count by month
router.get('/monthly', getMonthlyBill)


export default router;
