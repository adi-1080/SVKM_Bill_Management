import Bill from '../models/bill-model.js';

/**
 * Generate Outstanding Bills Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getOutstandingBillsReport = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, vendor } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Bills that have been received by the accounting department
      "accountsDept.dateReceived": { $ne: null, $exists: true },
      // But have not been paid yet - field based on actual schema
      "accountsDept.paymentDate": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvDate"] = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Add vendor filter if provided
    if (vendor) {
      filter["vendorName"] = vendor;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch outstanding bills from database
    const outstandingBills = await Bill.find(filter).sort({ "vendorName": 1, "taxInvDate": 1 });
    
    console.log(`Found ${outstandingBills.length} outstanding bills`);
    
    // Group bills by vendor name
    const vendorGroups = {};
    
    outstandingBills.forEach(bill => {
      const vendorName = bill.vendorName;
      if (!vendorGroups[vendorName]) {
        vendorGroups[vendorName] = [];
      }
      vendorGroups[vendorName].push(bill);
    });
    
    // Sort vendor names alphabetically
    const sortedVendorNames = Object.keys(vendorGroups).sort();
    
    // Create the report data with grouped and sorted vendors
    let index = 1;
    let reportData = [];
    let totalInvoiceAmount = 0;
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    sortedVendorNames.forEach(vendorName => {
      const vendorBills = vendorGroups[vendorName];
      let vendorSubtotal = 0;
      
      // Sort bills within each vendor group by invoice date
      vendorBills.sort((a, b) => {
        if (a.taxInvDate && b.taxInvDate) {
          return new Date(a.taxInvDate) - new Date(b.taxInvDate);
        }
        return 0;
      });
      
      // Add vendor group object that will contain all vendor bills and subtotal
      const vendorGroup = {
        vendorName: vendorName,
        bills: [],
        subtotal: 0
      };
      
      // Add each bill to the vendor group
      vendorBills.forEach(bill => {
        const taxInvAmt = parseFloat(bill.taxInvAmt || bill.accountsDept?.paymentAmt || 0);
        vendorSubtotal += !isNaN(taxInvAmt) ? taxInvAmt : 0;
        totalInvoiceAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
        
        vendorGroup.bills.push({
          srNo: index++,
          region: bill.region || "N/A",
          vendorNo: bill.vendorNo || "N/A",
          vendorName: bill.vendorName || "N/A",
          taxInvNo: bill.taxInvNo || "N/A",
          taxInvDate: formatDate(bill.taxInvDate) || "N/A",
          taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
          copAmt: !isNaN(parseFloat(bill.copDetails?.amount)) ? 
            Number(parseFloat(bill.copDetails.amount).toFixed(2)) : 0,
          dateRecdInAcctsDept: formatDate(bill.accountsDept?.dateReceived) || "N/A",
          natureOfWorkSupply: bill.natureOfWork || "N/A"
        });
      });
      
      // Add the subtotal
      vendorGroup.subtotal = Number(vendorSubtotal.toFixed(2));
      
      // Add all bills from this vendor to the report data
      vendorGroup.bills.forEach(bill => reportData.push(bill));
      
      // Add subtotal row after each vendor's bills
      reportData.push({
        isSubtotal: true,
        vendorName: vendorName,
        subtotalLabel: `Subtotal for ${vendorName}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2))
      });
    });
    
    // Add grand total row
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total:",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2))
    });
    
    // Calculate vendor subtotals for summary section
    const vendorSubtotals = sortedVendorNames.map(vendorName => {
      const vendorBills = vendorGroups[vendorName];
      const totalAmount = vendorBills.reduce((sum, bill) => {
        const amount = parseFloat(bill.taxInvAmt || bill.accountsDept?.paymentAmt || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      return { 
        vendorName, 
        totalAmount: Number(totalAmount.toFixed(2)),
        count: vendorBills.length
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Outstanding Bills Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date inv recd in accts dept is filled and date of payment is empty",
          sorting: ["vendorName", "invoiceDate"]
        },
        data: reportData,
        summary: {
          vendorSubtotals,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          recordCount: reportData.length - sortedVendorNames.length - 1 // Subtract subtotal and grand total rows
        }
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
};

/**
 * Generate Invoices Received at Site Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesReceivedAtSite = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at site date should be filled
      "taxInvRecdAtSite": { $ne: null, $exists: true },
      // Sent to Mumbai should be blank
      "pimoMumbai.dateReceived": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvRecdAtSite"] = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by date received at site
    const invoices = await Bill.find(filter).sort({ "taxInvRecdAtSite": 1 });
    
    console.log(`Found ${invoices.length} invoices received at site but not sent to Mumbai`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalAmount = 0;
    const reportData = invoices.map((bill, index) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      totalAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      
      return {
        srNo: index + 1,
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtTaxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices received at site",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions"
        },
        sortingCriteria: [
          "Date Tax Invoice received at Site"
        ],
        filterLogic: "Date of tax invoice received at site should be filled AND Sent to Mumbai should be blank",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices received at site report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Courier to Mumbai Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesCourierToMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, nameSiteOffice } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at site date should be filled
      "taxInvRecdAtSite": { $ne: null, $exists: true },
      // Sent to Mumbai should be filled
      "siteOfficeDispatch.dateGiven": { $ne: null, $exists: true }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["siteOfficeDispatch.dateGiven"] = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    // Add site office name filter if provided
    if (nameSiteOffice) {
      filter["siteOfficeDispatch.name"] = nameSiteOffice;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 });
    
    console.log(`Found ${invoices.length} invoices couriered to Mumbai`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      totalAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtTaxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        dtTaxInvCourierToMumbai: formatDate(bill.siteOfficeDispatch?.dateGiven) || "N/A",
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices courier to Mumbai",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions",
          nameSiteOffice: nameSiteOffice || "All site offices"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of tax invoice recd at site should be filled AND Sent to mumbai should be filled",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices courier to Mumbai report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};

/**
 * Generate Invoices Received at Mumbai Report
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getInvoicesReceivedAtMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;
    
    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at Mumbai date should be filled
      "pimoMumbai.dateReceived": { $ne: null, $exists: true },
      // Not yet sent to accounts department
      "accountsDept.dateGiven": { $eq: null }
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      filter["pimoMumbai.dateReceived"] = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    }
    
    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }
    
    console.log("Filter being used:", JSON.stringify(filter, null, 2));
    
    // Fetch bills from database, sort by sr no
    const invoices = await Bill.find(filter).sort({ "srNo": 1 });
    
    console.log(`Found ${invoices.length} invoices received at Mumbai but not sent to accounts department`);
    
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : 
        `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };
    
    // Process data for response
    let totalAmount = 0;
    const reportData = invoices.map((bill) => {
      const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
      totalAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
      
      return {
        srNo: bill.srNo || "N/A",
        projectDescription: bill.projectDescription || "N/A",
        vendorName: bill.vendorName || "N/A",
        taxInvNo: bill.taxInvNo || "N/A",
        taxInvDate: formatDate(bill.taxInvDate) || "N/A",
        taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
        dtTaxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite) || "N/A",
        dtTaxInvRecdAtMumbai: formatDate(bill.pimoMumbai?.dateReceived) || "N/A",
        poNo: bill.poNo || "N/A"
      };
    });
    
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices received at Mumbai",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange: startDate && endDate ? `from ${startDate} to ${endDate}` : "All dates",
          region: region || "All regions"
        },
        sortingCriteria: [
          "Sr No (Column 1)"
        ],
        filterLogic: "Dt of tax invoice recd at mumbai should be filled AND Sent to accts dept should be blank",
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalAmount: Number(totalAmount.toFixed(2))
        }
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating invoices received at Mumbai report:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error generating report', 
      error: error.message 
    });
  }
};
