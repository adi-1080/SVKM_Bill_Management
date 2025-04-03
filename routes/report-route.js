import express from 'express';
const router = express.Router();
import Bill from '../models/bill-model.js';
import { authenticate, authorize } from "../middleware/middleware.js";

// Authentication and authorization middleware
// Only accounts department can access these reports
router.use(authenticate, authorize('accounts'));

/**
 * @route GET /api/reports/outstanding-bills
 * @desc Get outstanding bills report (invoices received but not paid)
 * @access Private (Accounts department only)
 */
router.get('/outstanding-bills', async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, vendor } = req.query;
    
    // Build filter object
    const filter = {
      // Bills that have been received by the accounting department
      "Column82": { $ne: null, $exists: true },
      // But have not been paid yet (assuming payment status is stored appropriately)
      "PaymentStatus": { $ne: "Paid" }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["Column20"] = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Add vendor filter if provided (optional)
    if (vendor) {
      filter["Column6"] = vendor;
    }
    
    // Fetch outstanding bills from database
    const outstandingBills = await Bill.find(filter);
    
    // Group bills by vendor name
    const vendorGroups = {};
    
    outstandingBills.forEach(bill => {
      const vendorName = bill.Column6;
      if (!vendorGroups[vendorName]) {
        vendorGroups[vendorName] = [];
      }
      vendorGroups[vendorName].push(bill);
    });
    
    // Flatten and map the grouped bills to the required response format
    let index = 1;
    const reportData = Object.values(vendorGroups).flat().map(bill => {
      return {
        srNo: index++,
        oldSrNo: bill.excelSrNo || "N/A", // Include the original excel Sr No
        formattedSrNo: `2425${String(bill.srNo).padStart(5, '0')}`, // Format as 2425XXXXX
        vendorNo: bill.Column4,
        vendorName: bill.Column6,
        taxInvNo: bill.Column7,
        taxInvDate: bill.Column20,
        taxInvAmt: bill.Column21,
        dateRecdInAcctsDept: bill.Column82,
        natureOfWorkSupply: bill.Column3
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Outstanding Bills Report",
        generatedAt: new Date().toISOString(),
        data: reportData
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating outstanding bills report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
});



export default router;