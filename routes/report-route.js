import express from 'express';
const router = express.Router();
import { authenticate, authorize } from "../middleware/middleware.js";
import { 
  getOutstandingBillsReport,
  getInvoicesReceivedAtSite,
  getInvoicesCourierToMumbai,
  getInvoicesReceivedAtMumbai,
  getInvoicesGivenToAcctsDept,
  getInvoicesGivenToQsSite,
  getInvoicesPaid,
  getPendingBillsReport,
  getBillJourney
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
  authorize(['site_officer', 'site_pimo', 'qs_site']), 
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

/**
 * @route GET /api/reports/invoices-given-to-accounts
 * @desc Get report of invoices received at Mumbai and sent to accounts department
 * @access Private (PIMO Mumbai and accounts roles only)
 */
router.get('/invoices-given-to-accounts', 
  authorize(['pimo_mumbai', 'accounts']), 
  getInvoicesGivenToAcctsDept
);

/**
 * @route GET /api/reports/invoices-given-to-qs-site
 * @desc Get report of invoices given to QS site
 * @access Private (Site PIMO and QS site roles only)
 */
router.get('/invoices-given-to-qs-site', 
  authorize(['site_pimo', 'qs_site']), 
  getInvoicesGivenToQsSite
);

/**
 * @route GET /api/reports/invoices-paid
 * @desc Get report of invoices that have been paid
 * @access Private (Accounts department only)
 */
router.get('/invoices-paid', 
  authorize('accounts'), 
  getInvoicesPaid
);

/**
 * @route GET /api/reports/pending-bills
 * @desc Get report of bills pending with various offices (PIMO/SVKM site office/QS Mumbai office/QS site office)
 * @access Private (Admin, site_officer, site_pimo, qs_site, pimo_mumbai roles)
 */
router.get('/pending-bills', 
  authorize(['admin', 'site_officer', 'site_pimo', 'qs_site', 'pimo_mumbai']), 
  getPendingBillsReport
);

/**
 * @route GET /api/reports/bill-journey
 * @desc Get report of bills journey through the processing workflow
 * @access Private (All authorized users)
 */
router.get('/bill-journey', 
  authorize(['admin', 'site_officer', 'site_pimo', 'qs_site', 'pimo_mumbai', 'director', 'accounts']), 
  getBillJourney
);

export default router;