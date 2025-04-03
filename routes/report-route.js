import express from 'express';
const router = express.Router();
import { authenticate, authorize } from "../middleware/middleware.js";
import { 
  getOutstandingBillsReport,
  getInvoicesReceivedAtSite,
  getInvoicesCourierToMumbai,
  getInvoicesReceivedAtMumbai
} from '../controllers/report-controller.js';

// Authentication middleware for all routes
router.use(authenticate);

/**
 * @route GET /api/reports/outstanding-bills
 * @desc Get outstanding bills report (invoices received but not paid)
 * @access Private (Accounts department only)
 */
router.get('/outstanding-bills', authorize('accounts'), getOutstandingBillsReport);

/**
 * @route GET /api/reports/invoices-received-at-site
 * @desc Get report of invoices received at site but not yet sent to Mumbai
 * @access Private (Site officer, Site PIMO, and QS site roles only)
 */
router.get('/invoices-received-at-site', 
  authorize('site_officer'), 
  getInvoicesReceivedAtSite
);

// Add additional routes for other roles to access the same endpoint
router.get('/invoices-received-at-site-pimo', 
  authorize('site_pimo'), 
  getInvoicesReceivedAtSite
);

router.get('/invoices-received-at-site-qs', 
  authorize('qs_site'), 
  getInvoicesReceivedAtSite
);

/**
 * @route GET /api/reports/invoices-courier-to-mumbai
 * @desc Get report of invoices couriered from site to Mumbai
 * @access Private (Site officer, Site PIMO, and QS site roles only)
 */
router.get('/invoices-courier-to-mumbai', 
  authorize('site_officer'), 
  getInvoicesCourierToMumbai
);

// Add additional routes for other roles to access the same endpoint
router.get('/invoices-courier-to-mumbai-pimo', 
  authorize('site_pimo'), 
  getInvoicesCourierToMumbai
);

router.get('/invoices-courier-to-mumbai-qs', 
  authorize('qs_site'), 
  getInvoicesCourierToMumbai
);

/**
 * @route GET /api/reports/invoices-received-at-mumbai
 * @desc Get report of invoices received at Mumbai but not yet sent to accounts department
 * @access Private (PIMO Mumbai roles only)
 */
router.get('/invoices-received-at-mumbai', 
  authorize('pimo_mumbai'), 
  getInvoicesReceivedAtMumbai
);

export default router;